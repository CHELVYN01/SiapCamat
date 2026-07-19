"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  List,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DeleteDialog,
  FileMenu,
  PreviewDialog,
  downloadFile,
} from "@/components/file-actions";
import { FileTable } from "@/components/file-table";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  formatDate,
  type FileExt,
  type FileRow,
} from "@/lib/files";

type View = "grid" | "list";
const STORAGE_KEY = "siapcamat-view";
const VIEW_EVENT = "siapcamat-view-change";

/**
 * Preferensi tampilan tersimpan di localStorage (default: list).
 * useSyncExternalStore: server render pakai "list", lalu React
 * menyesuaikan ke preferensi user setelah hidrasi tanpa mismatch.
 */
function subscribeView(callback: () => void) {
  window.addEventListener(VIEW_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(VIEW_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function useViewPref(): [View, (next: View) => void] {
  const view = useSyncExternalStore<View>(
    subscribeView,
    () => (localStorage.getItem(STORAGE_KEY) === "grid" ? "grid" : "list"),
    () => "list"
  );
  const setView = useCallback((next: View) => {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(VIEW_EVENT));
  }, []);
  return [view, setView];
}

const FILE_ICON: Record<
  FileExt,
  { icon: typeof FileText; className: string }
> = {
  pdf: {
    icon: FileText,
    className: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
  },
  jpg: {
    icon: ImageIcon,
    className: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  },
  png: {
    icon: ImageIcon,
    className: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  },
  docx: {
    icon: FileText,
    className: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  },
  xlsx: {
    icon: FileSpreadsheet,
    className:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  },
};

export type FileWithThumb = FileRow & { thumbUrl?: string };

function FileCard({ file }: { file: FileWithThumb }) {
  const { icon: Icon, className } = FILE_ICON[file.ext];
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
      {/* Header ala Drive: ikon kecil + nama + menu titik tiga */}
      <div className="flex min-w-0 items-center gap-2 px-2.5 py-2">
        <div
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            className
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <p className="min-w-0 flex-1 truncate text-xs font-medium" title={file.name}>
          {file.name}
        </p>
        <FileMenu
          name={file.name}
          onPreview={() => setPreviewOpen(true)}
          onDownload={() => downloadFile(file.id, file.name)}
          onDelete={() => setDeleteOpen(true)}
        />
      </div>

      {/* Area preview memanjang — klik untuk buka preview */}
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        aria-label={`Preview ${file.name}`}
        className="relative mx-2 mb-2 aspect-[4/5] cursor-pointer overflow-hidden rounded-lg bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        {file.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL sementara, bukan kandidat next/image
          <img
            src={file.thumbUrl}
            alt={file.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-xl",
                className
              )}
            >
              <Icon className="size-6" />
            </div>
          </div>
        )}
        <Badge variant="secondary" className="absolute left-2 top-2 shadow-sm">
          {file.ext.toUpperCase()}
        </Badge>
      </button>

      <p className="px-2.5 pb-2 text-[11px] text-muted-foreground">
        {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
      </p>

      <PreviewDialog
        id={file.id}
        name={file.name}
        ext={file.ext}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
      <DeleteDialog
        id={file.id}
        name={file.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

export function FileList({
  files,
  total,
}: {
  files: FileWithThumb[];
  total: number;
}) {
  const [view, changeView] = useViewPref();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} file tersimpan
        </p>
        <div className="flex rounded-lg border p-0.5">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => changeView("grid")}
            aria-label="Tampilan card"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => changeView("list")}
            aria-label="Tampilan list"
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card py-12 text-center text-sm text-muted-foreground">
          Tidak ada file. Upload file pertama kamu di atas.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      ) : (
        <FileTable files={files} />
      )}
    </div>
  );
}
