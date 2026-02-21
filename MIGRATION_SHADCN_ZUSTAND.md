# MIGRATION_SHADCN_ZUSTAND.md

Status dokumen: **Siap dieksekusi**. Prasyarat arsitektur (Dexie IndexedDB) dan validasi baseline (tests & build) telah lulus per 21 Feb 2026.

## Tujuan
Migrasi UI KeMana dilakukan **setelah dogfooding selesai** dan storage lokal beralih ke struktur async (Dexie). Proses migrasi bersifat bertahap tanpa rewrite total.

Fokus migrasi:
- Setup Tailwind + shadcn/ui incremental.
- Ganti toast Undo delete ke Sonner.
- Pindahkan split editor ke Sheet.
- Introduce Zustand bertahap dengan persist ke localStorage secara aman untuk Next App Router (client-only).

Prinsip yang tidak boleh berubah:
- No-thinking rule: add instan, tanpa modal blocking.
- UI tetap dense.
- Core logic (`packages/core`, `packages/storage`) tidak diubah perilakunya.
- Single-device only tetap dipertahankan.

---

## 1) Prasyarat & Checks

### 1.1 Environment minimum
- Node 22 aktif (`nvm use 22`).
- Package manager konsisten (npm).
- Project build dan test saat ini harus hijau sebelum migrasi (✨ **LULUS: Dexie migration tests passed**).

### 1.2 Cek Tailwind sudah ada/belum
Jalankan (hanya check):
```bash
cd apps/web
cat package.json | rg "tailwindcss|postcss|autoprefixer"
ls | rg "tailwind.config|postcss.config"
rg "@tailwind base|@tailwind components|@tailwind utilities" src/app/globals.css
```

Interpretasi:
- Jika tidak ada dependency/config/directives Tailwind, berarti setup dari nol.
- Jika sudah ada sebagian, lanjut ke validasi config dan content path.

### 1.3 Cek struktur folder target
Jalankan:
```bash
cd /Users/mangwahyu/Documents/project/moey-management
ls apps/web
ls packages/core
ls packages/storage
```

Harus ada:
- `apps/web`
- `packages/core`
- `packages/storage`

### 1.4 Baseline sebelum migrasi
Jalankan:
```bash
cd apps/web
npm test
npm run build
```
Jika gagal, selesaikan dulu sebelum start migrasi UI/state.

---

## 2) Install Commands (ditulis saja, jangan dijalankan sekarang)

## 2.1 Tailwind install + config (apps/web)
```bash
cd apps/web
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Lalu update `tailwind.config.*` content paths agar mencakup:
- `./src/app/**/*.{ts,tsx}`
- `./src/components/**/*.{ts,tsx}`
- `./src/lib/**/*.{ts,tsx}`

Dan update `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 2.2 shadcn/ui init + komponen dasar
```bash
cd apps/web
npx shadcn@latest init
npx shadcn@latest add button input textarea badge sheet
```

Catatan:
- Gunakan komponen ini dulu: `Button`, `Input`, `Textarea`, `Badge`, `Sheet`.
- Jangan migrasi semua komponen sekaligus.

## 2.3 Sonner install + Toaster placement
```bash
cd apps/web
npm install sonner
```

Rencana placement:
- Letakkan `<Toaster />` di `apps/web/src/app/layout.tsx` (inside `<body>`).
- Ganti undo toast custom dengan `toast(...)` dari Sonner secara bertahap.

## 2.4 Zustand install + persist middleware
```bash
cd apps/web
npm install zustand
```

Persist:
- Pakai `persist` middleware bawaan Zustand.
- Gunakan `createJSONStorage(() => localStorage)` di file client-only.

---

## 3) Urutan Commit yang Disarankan

## Commit 1 — Baseline hardening sebelum migrasi
Perubahan:
- Tidak ada perubahan fitur.
- Pastikan `npm test` dan `npm run build` hijau.
- Simpan snapshot UI behavior (manual checklist).

Tujuan:
- Titik rollback bersih.

## Commit 2 — Tambah Tailwind infra saja
Perubahan:
- Install Tailwind + PostCSS + Autoprefixer.
- Tambah/update `tailwind.config.*`, `postcss.config.*`.
- Tambah directives ke `globals.css`.
- Tidak ubah layout/komponen bisnis.

Tujuan:
- Infrastruktur styling siap tanpa mengganggu UX.

## Commit 3 — Init shadcn + komponen dasar
Perubahan:
- Init shadcn.
- Generate `Button/Input/Textarea/Badge/Sheet`.
- Tambah file util bila dibutuhkan (`lib/utils.ts` dari shadcn).
- Belum mengganti UI existing.

Tujuan:
- Komponen tersedia dan compile.

## Commit 4 — Replace composer primitives (kecil)
Perubahan:
- Composer memakai `Input`, `Button`, `Textarea` dari shadcn.
- Tidak ubah flow: Enter submit, auto-focus, clear+focus back, preview non-blocking.

Tujuan:
- Migrasi visual paling aman dulu.

## Commit 5 — Replace badges + warning indicator
Perubahan:
- Badge warning/split/category di row collapsed pakai `Badge`.
- Jangan ubah behavior expand/collapse.

Tujuan:
- Konsistensi visual incremental.

## Commit 6 — Split editor ke Sheet
Perubahan:
- UI split editor dipindah ke `Sheet`.
- Trigger tetap dari expanded row.
- No blocking modal flow untuk add tetap dipertahankan.

Tujuan:
- Sheet dipakai untuk panel detail tanpa route change.

## Commit 7 — Sonner untuk undo delete
Perubahan:
- Tambah `<Toaster />` di `layout.tsx`.
- Ganti undo toast custom ke Sonner.
- Behavior tetap: “Dihapus • Undo”, timeout 6 detik.

Tujuan:
- Toast infra lebih rapi, UX tetap sama.

## Commit 8 — Introduce Zustand (state only, logic tetap)
Perubahan:
- Buat store awal untuk UI state (entries, undo, UI toggles) secara minimal.
- Gunakan `persist` localStorage untuk state yang tepat.
- Jangan memindahkan parser/split/rules logic dari `packages/core`.

Tujuan:
- Step awal state management tanpa rewrite.

## Commit 9 — Cleanup useState yang redundant
Perubahan:
- Kurangi `useState` lokal yang sudah dipindah ke store.
- Pertahankan boundary: UI state di app, business logic di packages/core.

Tujuan:
- Konsolidasi state bertahap.

---

## 4) File List yang Akan Berubah

## 4.1 Infra/config
- `apps/web/package.json`
- `apps/web/package-lock.json`
- `apps/web/tailwind.config.ts` atau `tailwind.config.js`
- `apps/web/postcss.config.js` atau `postcss.config.mjs`
- `apps/web/tsconfig.json` (jika perlu alias components/ui)

## 4.2 Global app
- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx` (Toaster Sonner)

## 4.3 UI components
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/textarea.tsx`
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/sheet.tsx`
- `apps/web/src/lib/utils.ts` (jika shadcn generate)

## 4.4 Page/state
- `apps/web/src/app/page.tsx` (incremental swap components + toast + sheet)
- `apps/web/src/store/*` (Zustand store files baru)

## 4.5 Core/storage
- Tidak ada perubahan behavior.
- Hanya import path penyesuaian jika diperlukan.

---

## 5) Risk Checklist + Rollback Plan

## Fase Tailwind
Risiko:
- Global CSS bentrok sehingga layout dense berubah.
Rollback:
- `git revert <commit-tailwind>`
- Kembalikan `globals.css` ke versi pre-tailwind.

## Fase shadcn components
Risiko:
- Spacing default komponen membuat UI kurang dense.
Rollback:
- Revert commit komponen tertentu, pertahankan infra shadcn.

## Fase Sheet split editor
Risiko:
- Interaksi split jadi lebih lambat atau terlalu banyak tap.
Rollback:
- Kembalikan split editor inline lama dengan revert commit sheet.

## Fase Sonner undo
Risiko:
- Undo timing tidak konsisten, toast tidak muncul.
Rollback:
- Kembali ke toast custom state lama dengan revert commit sonner.

## Fase Zustand persist
Risiko:
- Hydration mismatch.
- Akses localStorage saat server render.
- State stale setelah reload.
Rollback:
- Revert commit Zustand, kembali ke `useState`.
- Pertahankan komponen shadcn/sonner jika sudah stabil.

## Guardrail lintas fase
- Setiap commit harus lolos `npm test` dan `npm run build`.
- Jangan gabungkan >1 perubahan besar dalam satu commit.

---

## 6) Acceptance Criteria

- Enter submit tetap instan dan fokus kembali ke input.
- Row expand/collapse tetap cepat dan tanpa route change.
- Undo delete tetap tersedia dengan timeout 6 detik.
- Tidak ada SSR crash dari akses `localStorage`.
- No modal blocking baru untuk flow add/edit.
- Parser/split/rules/storage behavior tetap sama (regression test parser tetap pass).

---

## 7) Estimasi Effort + Definisi Done

## Fase 0 — Baseline check
Estimasi:
- 0.5 jam
Done:
- Test/build hijau, checklist behavior saat ini dicatat.

## Fase 1 — Tailwind infra
Estimasi:
- 1–2 jam
Done:
- Tailwind aktif, build hijau, UI tidak berubah signifikan.

## Fase 2 — shadcn init + komponen dasar
Estimasi:
- 2–3 jam
Done:
- Komponen `Button/Input/Textarea/Badge/Sheet` tersedia, compile hijau.

## Fase 3 — Composer + badge migration
Estimasi:
- 2–4 jam
Done:
- Composer dan indicator pakai shadcn, no-thinking behavior tetap.

## Fase 4 — Sheet split editor
Estimasi:
- 3–5 jam
Done:
- Split editor berjalan via Sheet, flow tetap cepat.

## Fase 5 — Sonner undo
Estimasi:
- 1–2 jam
Done:
- Undo delete via Sonner berjalan stabil.

## Fase 6 — Zustand incremental
Estimasi:
- 1–2 hari
Done:
- Store minimal berjalan, persist aman client-only, tanpa SSR issue.

## Definisi Done akhir migrasi
- Semua acceptance criteria terpenuhi.
- Tidak ada perubahan behavior core logic.
- `npm test`, `npm run build`, dan smoke test manual no-thinking flow semuanya pass.
- Rollback mudah karena commit terpisah per fase.
