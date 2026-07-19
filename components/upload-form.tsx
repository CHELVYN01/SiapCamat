"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_FILE_SIZE, extFromName, formatBytes } from "@/lib/files";

type UploadItem = {
  key: string;
  name: string;
  size: number;
  progress: number; // 0–100
  status: "uploading" | "done" | "error";
  error?: string;
};

/** PUT langsung ke signed URL Supabase Storage via XHR biar dapat progress event. */
function uploadWithProgress(
  signedUrl: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("content-type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload gagal (HTTP ${xhr.status})`));
    xhr.onerror = () => reject(new Error("Koneksi terputus saat upload"));
    xhr.send(file);
  });
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const patchItem = useCallback((key: string, patch: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it))
    );
  }, []);

  const uploadOne = useCallback(
    async (file: File, key: string) => {
      if (!extFromName(file.name)) {
        throw new Error("Tipe tidak diizinkan (hanya PDF, JPG, PNG, DOCX, XLSX)");
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("Ukuran melebihi 1 GB");
      }
      if (file.size === 0) {
        throw new Error("File kosong");
      }

      // 1. Minta signed upload URL (server memvalidasi login + tipe + ukuran)
      const signRes = await fetch("/api/files/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error ?? "Gagal minta signed URL");

      // 2. Upload langsung ke Supabase Storage (bukan lewat API route)
      await uploadWithProgress(
        signData.signedUrl,
        file,
        signData.contentType,
        (pct) => patchItem(key, { progress: pct })
      );

      // 3. Konfirmasi — server verifikasi object lalu simpan metadata
      const confirmRes = await fetch("/api/files/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: signData.path, name: file.name }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        throw new Error(confirmData.error ?? "Gagal menyimpan metadata");
      }
    },
    [patchItem]
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[] | null) => {
      if (busy || !fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      setBusy(true);

      const stamp = Date.now();
      setItems(
        files.map((f, i) => ({
          key: `${stamp}-${i}`,
          name: f.name,
          size: f.size,
          progress: 0,
          status: "uploading",
        }))
      );

      // Upload sekuensial biar progress jelas dan tidak membanjiri koneksi
      let anySuccess = false;
      for (let i = 0; i < files.length; i++) {
        const key = `${stamp}-${i}`;
        try {
          await uploadOne(files[i], key);
          patchItem(key, { status: "done", progress: 100 });
          anySuccess = true;
        } catch (err) {
          patchItem(key, {
            status: "error",
            error: err instanceof Error ? err.message : "Gagal upload",
          });
        }
      }

      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      if (anySuccess) router.refresh();
    },
    [busy, patchItem, router, uploadOne]
  );

  // Drag & drop global: seret file ke mana pun di halaman
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      handleFiles(e.dataTransfer?.files ?? null);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleFiles]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Overlay saat file diseret ke halaman */}
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[60] bg-emerald-950/40 p-6 backdrop-blur-sm">
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-400 bg-background/85 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-7" />
            </div>
            <p className="text-lg font-semibold">
              {busy ? "Tunggu upload selesai dulu ya" : "Lepaskan untuk mengupload"}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF · JPG · PNG · DOCX · XLSX — maks 1 GB per file
            </p>
          </div>
        </div>
      )}

      {/* Panel progress melayang di atas FAB */}
      {items.length > 0 && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] rounded-xl border bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">
              {busy ? "Mengupload..." : "Upload selesai"}
            </p>
            {!busy && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5"
                onClick={() => setItems([])}
                aria-label="Tutup panel upload"
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
          <ul className="max-h-60 space-y-2 overflow-y-auto">
            {items.map((it) => (
              <li key={it.key} className="rounded-md border p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{it.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {it.status === "done" && "✓ Selesai"}
                    {it.status === "uploading" && `${it.progress}%`}
                    {it.status === "error" && "Gagal"}
                    {" · "}
                    {formatBytes(it.size)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div
                    className={
                      it.status === "error"
                        ? "h-full bg-destructive"
                        : "h-full bg-primary transition-all"
                    }
                    style={{
                      width: `${it.status === "error" ? 100 : it.progress}%`,
                    }}
                  />
                </div>
                {it.error && (
                  <p className="mt-1 text-xs text-destructive">{it.error}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* FAB upload kanan bawah + label saat hover */}
      <div className="group fixed bottom-6 right-6 z-50">
        <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-3 py-2 text-right opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100">
          <span className="block text-sm font-medium text-background">
            Upload File
          </span>
          <span className="block text-[10px] text-background/70">
            PDF · JPG · PNG · DOCX · XLSX — maks 1 GB · bisa drag & drop
          </span>
        </span>
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Upload file"
          className="size-14 rounded-full p-0 shadow-lg shadow-emerald-600/30 transition-transform hover:scale-105"
        >
          <Plus className="size-6 transition-transform duration-200 group-hover:rotate-90" />
        </Button>
      </div>
    </>
  );
}
