-- ============================================================
-- SiapCamat — Sistem Arsip File
-- Jalankan sekali di Supabase Dashboard → SQL Editor
-- ============================================================

-- ---------- 1. Tabel metadata file ----------
create table public.files (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  storage_path  text not null unique,
  ext           text not null check (ext in ('pdf', 'jpg', 'png', 'docx', 'xlsx')),
  mime_type     text not null,
  size_bytes    bigint not null check (size_bytes > 0 and size_bytes <= 1073741824),
  -- Kategori = "folder" tetap. Boleh null (file tanpa kategori).
  category      text check (category in (
                  'surat-masuk', 'surat-keluar', 'surat-pindah-penduduk',
                  'dpa', 'lpj', 'data-kepegawaian'
                )),
  created_at    timestamptz not null default now()
);

create index files_created_at_idx on public.files (created_at desc);
create index files_name_idx       on public.files (lower(name));
create index files_ext_idx        on public.files (ext);
create index files_category_idx   on public.files (category);

-- ---------- 2. Row Level Security ----------
alter table public.files enable row level security;

-- Hanya user login (admin) yang boleh baca/tulis/hapus.
-- Role anon tidak diberi policy sama sekali = tidak bisa apa-apa.
create policy "admin select" on public.files
  for select to authenticated using (true);

create policy "admin insert" on public.files
  for insert to authenticated with check (true);

create policy "admin delete" on public.files
  for delete to authenticated using (true);

-- Sengaja TIDAK ada policy UPDATE: rename/edit di luar scope.

-- ---------- 3. Storage bucket (privat) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'archive',
  'archive',
  false,
  1073741824,   -- 1 GB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

-- ---------- 4. Storage policies ----------
create policy "admin read archive" on storage.objects
  for select to authenticated using (bucket_id = 'archive');

create policy "admin upload archive" on storage.objects
  for insert to authenticated with check (bucket_id = 'archive');

create policy "admin delete archive" on storage.objects
  for delete to authenticated using (bucket_id = 'archive');

-- ---------- 5. Function total pemakaian storage ----------
create or replace function public.storage_usage()
returns bigint
language sql
stable
security invoker
as $$
  select coalesce(sum(size_bytes), 0)::bigint from public.files
$$;

-- ============================================================
-- Setelah ini, buat user admin di:
-- Dashboard → Authentication → Users → Add user (email + password)
-- lalu matikan signup di Authentication → Sign In / Up →
-- disable "Allow new users to sign up"
-- ============================================================
