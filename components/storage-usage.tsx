import { formatBytes } from "@/lib/files";
import { cn } from "@/lib/utils";

/** Ringkasan pemakaian storage — dipasang di dalam sidebar (bawah). */
export function StorageUsage({
  usedBytes,
  quotaBytes,
}: {
  usedBytes: number;
  quotaBytes: number;
}) {
  const pct = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;
  const pctLabel = pct < 1 && usedBytes > 0 ? "<1" : Math.round(pct).toString();

  return (
    <div className="w-full">
      <p className="text-sm font-semibold">Penyimpanan</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 90
              ? "bg-destructive"
              : pct >= 75
                ? "bg-amber-500"
                : "bg-primary"
          )}
          style={{ width: `${Math.min(100, Math.max(pct, usedBytes > 0 ? 2 : 0))}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {formatBytes(usedBytes)}
        </span>{" "}
        digunakan dari {formatBytes(quotaBytes)} ({pctLabel}%)
      </p>
    </div>
  );
}
