import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { UploadForm } from "@/components/upload-form";
import { SearchBar } from "@/components/search-bar";
import { FileList } from "@/components/file-list";
import { PaginationNav } from "@/components/pagination-nav";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { StorageUsage } from "@/components/storage-usage";
import { getCachedStorageUsage } from "@/lib/storage-usage";
import { ALLOWED_EXTS, BUCKET, PAGE_SIZE, type FileRow } from "@/lib/files";

/** Escape wildcard ilike supaya "%"/"_" di input dicari literal. */
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

type SearchParams = Promise<{ page?: string; q?: string; type?: string }>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const type = (ALLOWED_EXTS as string[]).includes(params.type ?? "")
    ? (params.type as string)
    : "";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  let query = supabase
    .from("files")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("name", `%${escapeLike(q)}%`);
  if (type) query = query.eq("ext", type);

  const from = (requestedPage - 1) * PAGE_SIZE;

  // Jalankan paralel, bukan berurutan — tiap await adalah round-trip ke
  // Supabase. Query files & RPC tetap aman dijalankan sebelum cek user
  // karena keduanya lewat client cookie-bound yang kena RLS.
  const [
    {
      data: { user },
    },
    { data, count, error },
    usedBytes,
  ] = await Promise.all([
    supabase.auth.getUser(),
    query.range(from, from + PAGE_SIZE - 1),
    // Angka ini di-cache Next.js (lihat lib/storage-usage.ts). Cache hit =
    // tanpa round-trip ke Supabase. `.catch` menjaga dashboard tetap tampil
    // kalau RPC gagal (widget storage tinggal disembunyikan).
    getCachedStorageUsage().catch(() => null),
  ]);
  if (!user) redirect("/login");

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const files = (data ?? []) as FileRow[];

  // Thumbnail untuk file gambar: satu batch signed URL (1 jam) di server,
  // supaya bucket tetap privat tanpa N request dari client.
  const imagePaths = files
    .filter((f) => f.ext === "jpg" || f.ext === "png")
    .map((f) => f.storage_path);
  const thumbs: Record<string, string> = {};
  if (imagePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(imagePaths, 3600);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) thumbs[item.path] = item.signedUrl;
    }
  }
  const filesWithThumbs = files.map((f) => ({
    ...f,
    thumbUrl: thumbs[f.storage_path],
  }));

  // Total pemakaian storage (SUM di database, bukan di aplikasi).
  // Kuota diatur via env STORAGE_QUOTA_GB (default 1 GB = free plan Supabase).
  const quotaBytes =
    (Number.parseFloat(process.env.STORAGE_QUOTA_GB ?? "1") || 1) *
    1024 *
    1024 *
    1024;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-8">
          <Brand />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 sm:p-8">
        <SearchBar />

        {error ? (
          <div className="rounded-md border border-destructive/50 p-4 text-sm text-destructive">
            Gagal memuat daftar file: {error.message}
          </div>
        ) : (
          <FileList files={filesWithThumbs} total={total} />
        )}

        <PaginationNav
          page={requestedPage}
          totalPages={totalPages}
          q={q}
          type={type}
        />
      </main>

      {typeof usedBytes === "number" && (
        <StorageUsage usedBytes={usedBytes} quotaBytes={quotaBytes} />
      )}
      <UploadForm />
    </div>
  );
}
