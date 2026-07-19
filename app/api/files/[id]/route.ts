import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/files";

/**
 * DELETE /api/files/:id
 * Hapus file fisik dari storage DULU, baru hapus row metadata.
 * Kalau storage gagal → row tidak dihapus, bisa dicoba ulang (tidak
 * pernah ada row yang menunjuk ke file hilang... kebalikannya:
 * orphan object di storage juga dicegah karena urutannya).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const { id } = await params;

  const { data: file, error: fetchError } = await supabase
    .from("files")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error: storageError } = await admin.storage
    .from(BUCKET)
    .remove([file.storage_path]);

  if (storageError) {
    return NextResponse.json(
      { error: "Gagal menghapus file dari storage" },
      { status: 500 }
    );
  }

  const { error: deleteError } = await supabase
    .from("files")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "File fisik terhapus, tapi gagal menghapus metadata" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
