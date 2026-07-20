"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Folder, FolderOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { StorageUsage } from "@/components/storage-usage";
import { LogoutButton } from "@/components/logout-button";
import { CATEGORIES, isCategorySlug } from "@/lib/files";

/**
 * Sidebar ala OneDrive: nempel kiri, setinggi penuh. Folder di atas;
 * penyimpanan & tombol keluar didorong ke bawah (mt-auto). Klik folder
 * → set ?category=<slug> di URL, dibaca Server Component di page.tsx.
 */
export function CategorySidebar({
  usedBytes,
  quotaBytes,
}: {
  usedBytes: number | null;
  quotaBytes: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("category");
  const active = isCategorySlug(raw) ? raw : null;

  return (
    <aside className="flex flex-col border-b bg-card lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
      {/* Folder */}
      <div className="p-3">
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Folder
        </p>
        <ul className="space-y-0.5">
          <SidebarItem
            href={pathname}
            label="Semua file"
            icon={Layers}
            active={active === null}
          />
          {CATEGORIES.map((cat) => (
            <SidebarItem
              key={cat.slug}
              href={`${pathname}?category=${cat.slug}`}
              label={cat.label}
              icon={active === cat.slug ? FolderOpen : Folder}
              active={active === cat.slug}
            />
          ))}
        </ul>
      </div>

      {/* Bagian bawah: penyimpanan + tombol keluar (mt-auto ke dasar) */}
      <div className="mt-auto space-y-3 border-t p-3">
        {typeof usedBytes === "number" && (
          <StorageUsage usedBytes={usedBytes} quotaBytes={quotaBytes} />
        )}

        <div className="border-t pt-3">
          <LogoutButton className="w-full justify-start" />
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Folder;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
          active
            ? "bg-primary/10 font-medium text-primary"
            : "text-foreground hover:bg-muted"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </Link>
    </li>
  );
}
