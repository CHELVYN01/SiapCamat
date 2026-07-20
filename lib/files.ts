export const BUCKET = "archive";
export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB
export const PAGE_SIZE = 20;

export const ALLOWED_TYPES = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

export type FileExt = keyof typeof ALLOWED_TYPES;

export const ALLOWED_EXTS = Object.keys(ALLOWED_TYPES) as FileExt[];
export const ALLOWED_MIMES = Object.values(ALLOWED_TYPES) as string[];

/**
 * Kategori file = "folder" tetap (bukan folder bebas). Slug dipakai di DB
 * & URL, label dipakai di UI. Untuk menambah/mengubah kategori: ubah
 * daftar ini DAN CHECK constraint di supabase (schema.sql + migrasi baru).
 */
export const CATEGORIES = [
  { slug: "surat-masuk", label: "Surat Masuk" },
  { slug: "surat-keluar", label: "Surat Keluar" },
  { slug: "surat-pindah-penduduk", label: "Surat Pindah Penduduk" },
  { slug: "dpa", label: "DPA" },
  { slug: "lpj", label: "LPJ" },
  { slug: "data-kepegawaian", label: "Data Kepegawaian" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as CategorySlug[];

export function isCategorySlug(value: unknown): value is CategorySlug {
  return (
    typeof value === "string" && (CATEGORY_SLUGS as string[]).includes(value)
  );
}

/** Label tampilan dari slug; null kalau slug tidak dikenal / tanpa kategori. */
export function categoryLabel(slug: string | null | undefined): string | null {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? null;
}

export type FileRow = {
  id: string;
  name: string;
  storage_path: string;
  ext: FileExt;
  mime_type: string;
  size_bytes: number;
  category: CategorySlug | null;
  created_at: string;
};

/** Ekstensi dari nama file, dinormalisasi (jpeg → jpg). Null kalau tidak diizinkan. */
export function extFromName(name: string): FileExt | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const normalized = ext === "jpeg" ? "jpg" : ext;
  return (ALLOWED_EXTS as string[]).includes(normalized)
    ? (normalized as FileExt)
    : null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Makassar",
  }).format(new Date(iso));
}
