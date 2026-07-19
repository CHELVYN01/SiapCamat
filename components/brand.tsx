import { FolderArchive } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-md shadow-emerald-500/25">
        <FolderArchive className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-xl font-bold tracking-tight">
          Siap<span className="text-primary">Camat</span>
        </p>
        <p className="text-xs text-muted-foreground">Arsip File Digital</p>
      </div>
    </div>
  );
}
