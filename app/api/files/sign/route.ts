import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALLOWED_TYPES, BUCKET, MAX_FILE_SIZE, extFromName } from "@/lib/files";

/**
 * POST /api/files/sign
 * Body: { name: string, size: number }
 * Validasi login + tipe + ukuran, lalu balikan signed upload URL
 * supaya client bisa upload LANGSUNG ke Supabase Storage.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  let body: { name?: unknown; size?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const size = typeof body.size === "number" ? body.size : NaN;

  if (!name || name.length > 255) {
    return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
  }

  const ext = extFromName(name);
  if (!ext) {
    return NextResponse.json(
      { error: "Tipe file tidak diizinkan. Hanya PDF, JPG, PNG, DOCX, XLSX." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Ukuran file maksimal 1 GB" },
      { status: 400 }
    );
  }

  const path = `${crypto.randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: "Gagal membuat signed URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    path,
    signedUrl: data.signedUrl,
    contentType: ALLOWED_TYPES[ext],
  });
}
