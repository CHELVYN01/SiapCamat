-- ============================================================
-- Migrasi: naikkan batas ukuran file 10 MB → 1 GB
-- Jalankan sekali di Supabase Dashboard → SQL Editor
-- (schema.sql sudah diupdate untuk instalasi baru;
--  script ini untuk project yang sudah terlanjur dibuat)
-- ============================================================

-- 1. Ganti check constraint di tabel metadata
alter table public.files
  drop constraint if exists files_size_bytes_check;

alter table public.files
  add constraint files_size_bytes_check
  check (size_bytes > 0 and size_bytes <= 1073741824);

-- 2. Naikkan limit bucket storage
update storage.buckets
set file_size_limit = 1073741824
where id = 'archive';
