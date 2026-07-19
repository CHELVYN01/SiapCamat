import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tag cache untuk total pemakaian storage.
 * Dipakai dua arah:
 *  - saat MENYIMPAN hasil (opsi `tags` di bawah), dan
 *  - saat MEMBUANG cache (`revalidateTag(STORAGE_USAGE_TAG, ...)`)
 *    dari route upload/delete.
 */
export const STORAGE_USAGE_TAG = "storage-usage";

/**
 * Total byte terpakai — hasilnya di-cache oleh Next.js.
 *
 * Kenapa aman di-cache:
 *  - Nilainya GLOBAL (SUM semua file), sama untuk setiap request.
 *  - Cuma berubah saat ada upload/delete → kita buang cache-nya di
 *    dua route itu (lihat confirm/route.ts & [id]/route.ts).
 *
 * Kenapa pakai admin client, bukan client cookie-bound:
 *  - unstable_cache TIDAK boleh membaca cookies/headers di dalamnya
 *    (isinya di-share antar request, tak boleh bergantung 1 user).
 *  - Angkanya bukan data per-user, jadi service-role aman & memberi
 *    hasil identik.
 *
 * Argumen ke unstable_cache:
 *  1. fungsi async yang mahal (1 round-trip ke Supabase)
 *  2. `["storage-usage"]` → cache key (pembeda entri cache)
 *  3. opsi:
 *     - `tags`      → label buat invalidasi manual (revalidateTag)
 *     - `revalidate`→ TTL 60 dtk sebagai JARING PENGAMAN: walau lupa
 *                     di-invalidasi, cache segar ulang tiap menit.
 */
export const getCachedStorageUsage = unstable_cache(
  async (): Promise<number> => {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("storage_usage");
    if (error) throw new Error(error.message);
    return typeof data === "number" ? data : 0;
  },
  ["storage-usage"],
  {
    tags: [STORAGE_USAGE_TAG],
    revalidate: 60,
  }
);
