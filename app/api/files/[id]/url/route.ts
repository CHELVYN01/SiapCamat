import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/files";

/**
 * GET /api/files/:id/url            → signed URL untuk preview inline
 * GET /api/files/:id/url?download=1 → signed URL yang memaksa download
 * URL berumur 60 detik, bucket tetap privat.
 */
export async function GET(
  request: Request,
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
  const isDownload = new URL(request.url).searchParams.has("download");

  const { data: file, error: fetchError } = await supabase
    .from("files")
    .select("storage_path, name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, 60, {
      download: isDownload ? file.name : undefined,
    });

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal membuat signed URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}
