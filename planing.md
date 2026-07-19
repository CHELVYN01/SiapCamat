Saya ingin kamu membuat sistem arsip file sederhana (mirip Google Drive versi minimal) 
sebagai web app. Bantu saya build dari nol, step by step, dengan kode lengkap.

## Konsep
Sistem arsip internal dengan SATU role saja: admin. Tidak ada registrasi user publik, 
tidak ada sharing link, tidak ada kolaborasi. Admin login → upload file → lihat & 
download file yang sudah diupload.

## Scope Fitur (MVP — jangan tambah fitur di luar ini)
1. Login admin (single account, credential disimpan di environment variable / tabel users)
2. Upload file (single & multiple, dengan progress indicator)
3. List/tampilkan semua file dalam bentuk tabel dengan kolom:
   nama file, tipe file, ukuran, tanggal upload
4. Preview file (PDF & gambar tampil inline, tipe lain cukup tombol download)
5. Download file
6. Delete file (hapus record + hapus file fisik dari storage)
7. Search by nama file + filter by tipe file
8. Pagination (default 20 item per halaman)

## Yang TIDAK perlu dibuat
- Edit/rename file setelah diupload
- Folder & nested directory (flat list saja)
- Multi-user, role management, permission
- Versioning file
- Sharing / public link

## Tech Stack
- Next.js 14+ (App Router, TypeScript)
- Tailwind CSS + shadcn/ui untuk komponen UI
- Supabase (Postgres untuk metadata + Supabase Storage untuk file)
- Deploy target: Vercel

## Constraint Teknis
- Max file size: 10 MB per file
- Allowed types: PDF, JPG, PNG, DOCX, XLSX
- Upload harus lewat Supabase Storage langsung dari client (signed URL), 
  JANGAN lewat API route Next.js — Vercel serverless punya limit body size 4.5 MB
- Semua operasi write (upload, delete) harus divalidasi di server side
- Gunakan Server Components untuk fetching data, Client Components hanya untuk 
  bagian interaktif (upload form, search input)

## Output yang saya harapkan
1. Struktur folder project lengkap
2. Schema tabel Postgres (SQL) + policy Row Level Security
3. Konfigurasi Supabase Storage bucket
4. Kode setiap file, disertai path-nya
5. Environment variables yang dibutuhkan (.env.example)
6. Langkah deploy ke Vercel

Mulai dengan menjelaskan arsitektur dan schema database dulu, tunggu konfirmasi saya, 
baru lanjut ke implementasi kode per bagian.