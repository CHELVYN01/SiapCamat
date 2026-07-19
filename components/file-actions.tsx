"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FileExt } from "@/lib/files";

export const PREVIEWABLE: FileExt[] = ["pdf", "jpg", "png", "docx"];

async function fetchSignedUrl(id: string, download: boolean): Promise<string> {
  const res = await fetch(
    `/api/files/${id}/url${download ? "?download=1" : ""}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Gagal mengambil URL");
  return data.url as string;
}

export async function downloadFile(id: string, name: string) {
  try {
    const url = await fetchSignedUrl(id, true);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  } catch (err) {
    alert(err instanceof Error ? err.message : "Gagal download");
  }
}

/** Dialog preview: PDF via iframe, gambar via img, tipe lain fallback tombol unduh. */
export function PreviewDialog({
  id,
  name,
  ext,
  open,
  onOpenChange,
  previewUrl,
}: {
  id: string;
  name: string;
  ext: FileExt;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Signed URL yang sudah dimiliki halaman (mis. thumbnail) — dipakai langsung tanpa API call. */
  previewUrl?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewable = PREVIEWABLE.includes(ext);

  useEffect(() => {
    if (!open || !previewable) return;
    let cancelled = false;

    async function load() {
      const signedUrl = previewUrl ?? (await fetchSignedUrl(id, false));
      if (cancelled) return;

      if (ext === "docx") {
        // Konversi .docx → HTML sepenuhnya di browser (mammoth),
        // file tidak pernah dikirim ke pihak ketiga.
        const res = await fetch(signedUrl);
        if (!res.ok) throw new Error("Gagal mengambil file");
        const arrayBuffer = await res.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setDocxHtml(result.value);
      } else {
        setUrl(signedUrl);
      }
    }

    load().catch((err) => {
      if (!cancelled)
        setError(err instanceof Error ? err.message : "Gagal memuat preview");
    });
    return () => {
      cancelled = true;
    };
  }, [open, id, ext, previewable, previewUrl]);

  // URL thumbnail bisa kadaluarsa (1 jam) kalau halaman dibiarkan lama —
  // saat gambar gagal dimuat, ambil signed URL baru lewat API.
  async function handleImageError() {
    if (!previewUrl || url !== previewUrl) return;
    try {
      setUrl(await fetchSignedUrl(id, false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat preview");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setUrl(null);
      setDocxHtml(null);
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{name}</DialogTitle>
          <DialogDescription>
            {ext === "docx"
              ? "Preview teks — hasil konversi dokumen Word, layout bisa sedikit berbeda"
              : previewable
                ? "Preview inline — URL berlaku 60 detik"
                : "Preview tidak tersedia untuk tipe file ini"}
          </DialogDescription>
        </DialogHeader>

        {!previewable ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-muted-foreground">
              File {ext.toUpperCase()} tidak bisa ditampilkan di browser.
            </p>
            <Button onClick={() => downloadFile(id, name)}>
              <Download className="size-4" />
              Unduh File
            </Button>
          </div>
        ) : (
          <>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!url && !docxHtml && !error && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Memuat preview...
              </p>
            )}
            {docxHtml && (
              <div
                className="max-h-[70vh] overflow-y-auto rounded border bg-white p-6 text-sm leading-relaxed text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:bg-muted [&_th]:p-1.5 [&_img]:my-2 [&_img]:max-w-full [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            )}
            {url &&
              (ext === "pdf" ? (
                <iframe
                  src={url}
                  title={name}
                  className="h-[70vh] w-full rounded border"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL sementara, bukan kandidat next/image
                <img
                  src={url}
                  alt={name}
                  onError={handleImageError}
                  className="mx-auto max-h-[70vh] max-w-full rounded object-contain"
                />
              ))}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Dialog konfirmasi hapus (hapus file fisik + metadata). */
export function DeleteDialog({
  id,
  name,
  open,
  onOpenChange,
}: {
  id: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus file?</DialogTitle>
          <DialogDescription className="break-all">
            &ldquo;{name}&rdquo; akan dihapus permanen dari storage beserta
            metadatanya. Tindakan ini tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Batal
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={busy}>
            {busy ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Menu titik tiga (kebab) — dipakai di card. Dialog dikelola parent. */
export function FileMenu({
  name,
  onPreview,
  onDownload,
  onDelete,
}: {
  name: string;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="size-7 shrink-0 rounded-full p-0"
            aria-label={`Menu untuk ${name}`}
          >
            <MoreVertical className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onPreview}>
          <Eye className="size-4" /> Lihat
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDownload}>
          <Download className="size-4" /> Unduh
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" /> Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Baris aksi versi tombol teks — dipakai di tampilan tabel/list. */
export function FileActions({
  id,
  name,
  ext,
  previewUrl,
}: {
  id: string;
  name: string;
  ext: FileExt;
  previewUrl?: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
        Lihat
      </Button>
      <Button variant="ghost" size="sm" onClick={() => downloadFile(id, name)}>
        Unduh
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirmOpen(true)}
      >
        Hapus
      </Button>

      <PreviewDialog
        id={id}
        name={name}
        ext={ext}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        previewUrl={previewUrl}
      />
      <DeleteDialog
        id={id}
        name={name}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      />
    </div>
  );
}
