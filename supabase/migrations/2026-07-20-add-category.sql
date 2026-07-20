-- ============================================================
-- Migrasi: kolom kategori ("folder" tetap) pada tabel files
-- Jalankan sekali di Supabase Dashboard → SQL Editor
-- Idempotent: aman dijalankan ulang.
-- ============================================================

-- Kolom category, boleh null (file lama tetap aman, muncul di "Semua").
alter table public.files
  add column if not exists category text;

-- CHECK constraint terpisah supaya bisa di-guard IF NOT EXISTS.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'files_category_check'
  ) then
    alter table public.files
      add constraint files_category_check
      check (category in (
        'surat-masuk', 'surat-keluar', 'surat-pindah-penduduk',
        'dpa', 'lpj', 'data-kepegawaian'
      ));
  end if;
end $$;

create index if not exists files_category_idx on public.files (category);
