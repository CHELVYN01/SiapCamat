"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALLOWED_EXTS } from "@/lib/files";

const ALL = "all";

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const type = searchParams.get("type") ?? ALL;
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply(nextQ: string, nextType: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextType !== ALL) params.set("type", nextType);
    // Search/filter baru selalu balik ke halaman 1
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params}` : pathname);
    });
  }

  function handleSearch(value: string) {
    setQ(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => apply(value, type), 350);
  }

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        placeholder="Cari nama file..."
        value={q}
        onChange={(e) => handleSearch(e.target.value)}
        className="sm:max-w-xs"
      />
      <Select value={type} onValueChange={(v) => apply(q, v ?? ALL)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Semua tipe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua tipe</SelectItem>
          {ALLOWED_EXTS.map((ext) => (
            <SelectItem key={ext} value={ext}>
              {ext.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && (
        <span className="flex items-center text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-label="Memuat..." />
        </span>
      )}
    </div>
  );
}
