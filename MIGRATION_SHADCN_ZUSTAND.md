# MIGRATION_SHADCN_ZUSTAND.md

Status dokumen: **Aktif** (updated 21 Feb 2026).

## 1) Progress Terkini

### Sudah selesai
- Baseline quality gate tersedia: Vitest + Playwright + build.
- Tailwind infra + shadcn init sudah masuk.
- Migrasi UI bertahap sudah berjalan:
  - Komponen dasar shadcn (`button`, `input`, `badge`, `sheet`, dst).
  - Composer, chips/filter, warning controls sudah pakai primitive shadcn.
  - Split editor sudah dipindah ke bottom `Sheet`.
- Konfigurasi test dirapikan agar suite stabil (no duplicate parser suite loading).
- Toast action/undo/moved sudah dimigrasikan ke Sonner.

Referensi commit terbaru:
- `6d07121` setup tailwind infra
- `3f34da4` shadcn init + base components
- `e4fde75` migrate controls to shadcn primitives
- `f1626d3` migrate split editor to sheet
- `ba16bcb` vitest suite loading fix

### Belum selesai
- Tidak ada blocker migrasi utama saat ini.

## 2) Tujuan Migrasi Zustand

Tujuan utama: memecah state orchestration besar di `apps/web/src/app/page.tsx` menjadi store terstruktur, tanpa mengubah perilaku produk.

Guardrails:
- No-regression untuk flow inti (quick add, split, backup, recall, night close).
- `packages/core` dan `packages/storage` tidak berubah behavior.
- Hindari SSR/localStorage crash di App Router (`client-only storage access`).
- Dexie tetap source of truth untuk data transaksi/rules.

## 3) Inventaris State Saat Ini (Target Slice)

State aktif saat ini berada di `apps/web/src/app/page.tsx` dan dibagi target berikut:

1. `dataSlice`
- `entries`, `rules`, `isStorageReady`, `storageWarning`
- actions: init/migrate, add/update/delete, import/export hooks

2. `composerSlice`
- `quickInput`, `debouncedQuickInput`, `quickError`, `showQuickWarningDetails`
- `bulkOpen`, `bulkInput`, `recallInputPrimed`

3. `uiSlice`
- `dateFilter`, `autoExpandedEntryId`, `highlightEntryId`, `pendingScrollToId`
- `backupMessage`, `replaceOnImport`

4. `habitSlice`
- `lastAppOpenAt`, `recallDismissedInSession`, `isRecallSessionReady`
- `nightCloseClosedAt`, `isNightCloseReady`, `nightClosePanelOpen`, `nightCloseConfirmation`

## 4) Persist Strategy (Penting)

Yang **dipersist di Zustand**:
- Preferensi UI non-kritis: `dateFilter`, `replaceOnImport`.

Yang **tetap di storage domain (bukan persist Zustand)**:
- `entries`, `rules` (tetap lewat `@kemana/storage` + Dexie flow).

Yang **tetap session-only**:
- `recallDismissedInSession` (pakai `sessionStorage` seperti sekarang).

Catatan:
- Pakai `persist` + `createJSONStorage(() => localStorage)` hanya di store client.
- Jangan baca storage saat server render.

## 5) Rencana Eksekusi Commit-by-Commit

## Commit A - Scaffold Zustand tanpa adopsi penuh
- Tambah dependency `zustand`.
- Buat `apps/web/src/store/use-kemana-store.ts` berisi shape awal state + action placeholder.
- Belum mengganti behavior komponen.

Quality gate:
```bash
cd apps/web
npm test
npm run build
```

## Commit B - Pindah UI preference + filter state
- Migrasikan `dateFilter`, `replaceOnImport`, dan helper setter ke store.
- `SummaryHeader` dan backup tools membaca dari store selector.

Quality gate:
```bash
cd apps/web
npm test
npm run build
npx playwright test --grep "Filter range|Import Backup"
```

## Commit C - Pindah composer/ui transient state
- Migrasikan state composer (`quickInput`, `quickError`, `bulkOpen`, dll) ke store.
- Tetap pertahankan `quickInputRef` di component layer.

Quality gate:
```bash
cd apps/web
npm test
npm run build
npx playwright test --grep "Quick Add|Bulk Paste"
```

## Commit D - Pindah entry/rules actions ke store
- Action `add/update/delete/import` dipindah ke store action.
- Inisialisasi data async (`migrateFromLocalStorage`, `loadEntries`, `loadRules`) dipusatkan di store bootstrap action.
- `saveEntries/saveRules` background persist tetap dipertahankan behavior-nya.

Quality gate:
```bash
cd apps/web
npm test
npm run build
npx playwright test
```

## Commit E - Pindah recall/night-close state
- Migrasikan state habit/recall/night-close ke `habitSlice`.
- Session semantics untuk recall dismiss harus tetap sama.

Quality gate:
```bash
cd apps/web
npm test
npm run build
npx playwright test --grep "Smart Recall|Night Close"
```

## Commit F - Sonner migration (opsional paralel setelah Zustand stabil)
- Tambah Sonner + `<Toaster />`.
- Replace custom toast state untuk action/undo secara bertahap.

Quality gate:
```bash
cd apps/web
npm test
npm run build
npx playwright test --grep "Delete entry + Undo"
```

## 6) Acceptance Criteria Zustand Migration

- `apps/web/src/app/page.tsx` tidak lagi memegang puluhan `useState` utama.
- Flow quick add tetap instan dan fokus input tetap benar.
- Tidak ada hydration warning/error dari akses local/session storage.
- Semua unit test pass.
- Build pass.
- Playwright pass penuh.

## 7) Risiko & Mitigasi

1. Risiko: stale closure pada action store.
- Mitigasi: gunakan pattern `set((state) => ...)` konsisten dan selector granular.

2. Risiko: rerender berlebihan.
- Mitigasi: selector kecil + `shallow` comparison untuk consumer berat.

3. Risiko: mismatch state persist vs Dexie source of truth.
- Mitigasi: jangan persist `entries/rules` di Zustand.

4. Risiko: regresi session behavior recall.
- Mitigasi: pertahankan key session storage yang sama.

## 8) Tracking Checklist

- [x] Tailwind infra terpasang
- [x] shadcn init + base components
- [x] UI primitives migration (composer/chip/filter/warning)
- [x] Split editor pindah ke `Sheet`
- [x] Sonner untuk undo/action toast
- [x] Zustand scaffold
- [x] Zustand adopsi awal pada `page.tsx` (state utama pindah dari `useState` ke store)
- [x] Final cleanup `useState` yang redundant di `page.tsx`
- [x] Store dipecah jadi beberapa slice file (`data/ui/composer/habit`)
