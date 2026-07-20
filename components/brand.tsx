import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo + wordmark. `vertical` = logo besar di atas teks & rata tengah
 * (dipakai di halaman login); default = kompak menyamping (header).
 */
export function Brand({
  className,
  vertical = false,
}: {
  className?: string;
  vertical?: boolean;
}) {
  const logoSize = vertical ? 96 : 40;

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        vertical && "flex-col items-center gap-3 text-center",
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="Lambang Kabupaten Manggarai"
        width={logoSize}
        height={logoSize}
        priority
        className={cn("shrink-0 object-contain", vertical ? "size-24" : "size-10")}
      />
      <div className="leading-tight">
        <p className="text-xl font-bold tracking-tight">
          Siap<span className="text-primary">Camat</span>
        </p>
        <p className="text-xs text-muted-foreground">Arsip File Digital</p>
      </div>
    </div>
  );
}
