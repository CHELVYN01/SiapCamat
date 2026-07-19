import { createClient } from "@supabase/supabase-js";

/**
 * Client dengan service role key — BYPASS RLS.
 * Hanya boleh dipakai di server (route handler), setelah session
 * user diverifikasi, untuk operasi storage (signed URL, verifikasi
 * object, hapus file fisik).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
