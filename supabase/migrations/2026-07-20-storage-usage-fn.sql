-- ============================================================
-- Migrasi: function untuk menghitung total pemakaian storage
-- Jalankan sekali di Supabase Dashboard → SQL Editor
-- ============================================================

create or replace function public.storage_usage()
returns bigint
language sql
stable
security invoker
as $$
  select coalesce(sum(size_bytes), 0)::bigint from public.files
$$;
