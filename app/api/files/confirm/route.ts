import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_USAGE_TAG } from "@/lib/storage-usage";
import {
  ALLOWED_MIMES,
  BUCKET,
  MAX_FILE_SIZE,
  extFromName,
  isCategorySlug,
} from "@/lib/files";

const PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|docx|xlsx)$/;

/**
 * POST /api/files/confirm
 * Body: { path: string, name: string }
 * Dipanggil SETELAH client selesai upload ke storage.
 * Server memverifikasi object benar-benar ada (ukuran & mime asli
 * dari storage, bukan klaim client) baru menyimpan metadata ke DB.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  let body: { path?: unknown; name?: unknown; category?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const path = typeof body.path === "string" ? body.path : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  // Kategori opsional; nilai tak dikenal diabaikan (jadi null) supaya
  // client tak bisa menyisipkan kategori sembarangan.
  const category = isCategorySlug(body.category) ? body.category : null;

  if (!PATH_RE.test(path) || !name || name.length > 255) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const ext = extFromName(name) ?? extFromName(path);
  if (!ext) {
    return NextResponse.json({ error: "Tipe file tidak valid" }, { status: 400 });
  }

  // Ambil metadata object asli dari storage
  const admin = createAdminClient();
  const { data: objects, error: listError } = await admin.storage
    .from(BUCKET)
    .list("", { limit: 1, search: path });

  const object = objects?.find((o) => o.name === path);
  if (listError || !object) {
    return NextResponse.json(
      { error: "File tidak ditemukan di storage" },
      { status: 404 }
    );
  }

  const meta = object.metadata as { size?: number; mimetype?: string } | null;
  const size = meta?.size ?? 0;
  const mime = meta?.mimetype ?? "";

  if (size <= 0 || size > MAX_FILE_SIZE || !ALLOWED_MIMES.includes(mime)) {
    // Object melanggar aturan → buang dari storage, jangan simpan metadata
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      { error: "File melanggar aturan ukuran/tipe dan sudah dihapus" },
      { status: 400 }
    );
  }

  // Insert lewat client ber-session (RLS tetap berlaku)
  const { data: row, error: insertError } = await supabase
    .from("files")
    .insert({
      name,
      storage_path: path,
      ext,
      mime_type: mime,
      size_bytes: size,
      category,
    })
    .select()
    .single();

  if (insertError) {
    // 23505 = unique violation → confirm ganda untuk path yang sama, anggap sukses
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: "Gagal menyimpan metadata" },
      { status: 500 }
    );
  }

  // File baru masuk → total pemakaian berubah. Buang cache-nya supaya
  // render dashboard berikutnya menghitung ulang. `{ expire: 0 }` =
  // kadaluarsa seketika (bukan stale-while-revalidate) supaya angka
  // langsung akurat setelah upload; bentuk dua-argumen ini menggantikan
  // `revalidateTag(tag)` lama yang sudah deprecated di Next 16.
  revalidateTag(STORAGE_USAGE_TAG, { expire: 0 });

  return NextResponse.json({ ok: true, file: row });
}
