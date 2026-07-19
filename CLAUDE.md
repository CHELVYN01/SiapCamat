# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

SiapCamat — internal file archive web app (mini Google Drive) with a single admin role. Scope is deliberately frozen in `planing.md`: no rename/edit, no folders, no multi-user, no versioning, no sharing links. Do not add features outside that scope unless asked. All UI text is in Bahasa Indonesia.

## Commands

```bash
npm run dev     # dev server (Turbopack) at localhost:3000
npm run build   # production build — also runs TypeScript checking
npm run lint    # ESLint
```

There are no tests. Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_QUOTA_GB` (see `.env.example`). After editing `.env.local` the dev server must be restarted.

## Database & migrations

`supabase/schema.sql` is the full schema for fresh installs (table `files`, RLS, private bucket `archive`, storage policies, `storage_usage()` function). It is **not** applied automatically — the user runs it in the Supabase SQL Editor. Any change to existing DB structure needs a new file in `supabase/migrations/` (also run manually) **and** the same change mirrored in `schema.sql`.

Auth is Supabase Auth with one admin user created in the dashboard and signup disabled. RLS grants `authenticated` select/insert/delete on `files` (deliberately no UPDATE policy — rename is out of scope). `anon` has no policies.

## Project structure

```
app/
├── layout.tsx                      # root layout: fonts, ThemeProvider, metadata
├── globals.css                     # Tailwind v4 + tema emerald (oklch vars, :root & .dark)
├── page.tsx                        # dashboard (Server Component): query files, thumbnails, storage usage
├── login/page.tsx                  # halaman login
└── api/files/
    ├── sign/route.ts               # POST: validasi → signed upload URL
    ├── confirm/route.ts            # POST: verifikasi object → insert metadata
    └── [id]/
        ├── route.ts                # DELETE: hapus storage object + row
        └── url/route.ts            # GET: signed URL 60s (?download=1 = attachment)

components/
├── brand.tsx                       # logo + wordmark SiapCamat
├── upload-form.tsx                 # FAB upload + drag&drop global + panel progress (client)
├── file-list.tsx                   # toggle grid/list (localStorage), card ala Drive + thumbnail
├── file-table.tsx                  # tampilan tabel (dipakai mode list)
├── file-actions.tsx                # PreviewDialog, DeleteDialog, FileMenu (kebab), FileActions, downloadFile
├── search-bar.tsx                  # search debounce + filter tipe → URL params
├── pagination-nav.tsx              # prev/next, preserve q & type di URL
├── storage-usage.tsx               # widget "Penyimpanan" ala OneDrive (kiri bawah)
├── login-form.tsx / logout-button.tsx
├── theme-provider.tsx / theme-toggle.tsx   # next-themes + toggle ☀️/🌙
└── ui/                             # shadcn/ui generated (basis Base UI — jangan edit manual kecuali perlu)

lib/
├── files.ts                        # SUMBER TUNGGAL konstanta: MAX_FILE_SIZE, ALLOWED_TYPES, BUCKET,
│                                   # PAGE_SIZE, tipe FileRow, formatter bytes/tanggal
├── utils.ts                        # cn() dari shadcn
└── supabase/
    ├── client.ts                   # browser client
    ├── server.ts                   # server client (cookie-bound, RLS berlaku)
    ├── admin.ts                    # service-role client (bypass RLS, storage only)
    └── middleware.ts               # updateSession() dipakai proxy.ts

proxy.ts                            # middleware Next 16 (rename dari middleware.ts): session + redirect
supabase/
├── schema.sql                      # schema lengkap untuk instalasi baru (dijalankan manual)
└── migrations/                     # migrasi manual untuk DB yang sudah ada, dinamai per tanggal
planing.md                          # spesifikasi MVP dari client — scope beku
.env.example                        # daftar env vars (Supabase + STORAGE_QUOTA_GB)
```

## Architecture

Next.js 16 App Router (note: middleware lives in `proxy.ts`, the Next 16 rename of `middleware.ts` — it refreshes the Supabase session and redirects unauthenticated page requests to `/login`, but lets `/api/*` return its own JSON 401s).

### Three Supabase clients (`lib/supabase/`)

- `client.ts` — browser client (login form, logout).
- `server.ts` — cookie-bound server client; used by Server Components and route handlers. All DB reads/writes go through this so RLS applies.
- `admin.ts` — service-role client, **bypasses RLS**. Only for storage operations (signed URLs, object verification, physical delete) inside route handlers, and only after the user session has been verified with `supabase.auth.getUser()`.

### Upload flow (the core invariant)

Files must NOT pass through Next.js API routes (Vercel 4.5 MB body limit). The three-step flow in `components/upload-form.tsx`:

1. `POST /api/files/sign` — validates session + name/ext/size claim, returns a signed upload URL for a random UUID path.
2. Client XHR `PUT`s the file **directly to Supabase Storage** (XHR, not fetch, for progress events).
3. `POST /api/files/confirm` — server reads the object's real size/mime from storage (never trusts the client), deletes the object if it violates limits, otherwise inserts the metadata row.

So a `files` row only exists if the physical object was verified. Deletion is the mirror image (`DELETE /api/files/[id]`): storage object first, DB row second — a failed storage delete leaves the row so the action can be retried.

### File constraints live in one place

`lib/files.ts` defines `MAX_FILE_SIZE` (1 GB), `ALLOWED_TYPES` (pdf/jpg/png/docx/xlsx), `BUCKET`, `PAGE_SIZE`. But the limits are ALSO enforced in the DB check constraint and the bucket's `file_size_limit` — changing a limit means touching `lib/files.ts`, user-facing strings in `upload-form.tsx` / `sign/route.ts`, and a DB migration.

### Preview & thumbnails

Bucket is private; nothing has a public URL. Previews use 60-second signed URLs from `GET /api/files/[id]/url` (`?download=1` forces attachment). Card-view thumbnails are batch-signed (1 hour) server-side in `app/page.tsx`. DOCX preview converts to HTML **in the browser** via lazily-imported `mammoth` — files must never be sent to third-party viewer services.

### UI specifics that will bite you

- shadcn/ui here is the new **Base UI**-based generation, not Radix: `Button` has no `asChild` (use the `render` prop or `buttonVariants()` on a `Link`), and dropdown/dialog primitives come from `MenuPrimitive`/Base UI.
- ESLint enforces `react-hooks/set-state-in-effect` — don't call setState synchronously in effects. Persisted client prefs (e.g. grid/list view in `file-list.tsx`) use `useSyncExternalStore` over localStorage instead of the mounted-state pattern.
- List/search/filter/pagination state lives in URL search params, rendered by the Server Component `app/page.tsx`; client components mutate the URL (`router.replace`) rather than holding data state. After mutations, client code calls `router.refresh()`.
- Dark mode is `next-themes` (class strategy); the theme toggle swaps icons via CSS `dark:` classes to avoid hydration mismatch.

## Deployment notes

Target is Vercel + the same four env vars. Supabase free plan caps uploads at 50 MB/file and 1 GB total storage regardless of app-side limits; the 1 GB per-file limit only becomes real on Pro.
