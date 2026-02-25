# KeMana

KeMana adalah aplikasi pencatatan pengeluaran single-device, local-first, dengan fokus input cepat: "Biar tau uangmu kemana".

## Progress Terkini (25 Feb 2026)

- Import/Export `JSON + CSV` sudah stabil (nama file jelas, parser CSV + fallback format).
- Kompatibilitas data lama untuk metode bayar (`Lainnya`/`Belum pilih`) dinormalisasi aman ke `Unknown`.
- Bottom sheet `Catat pengeluaran` sekarang punya input terpisah `Nama catatan` agar judul item bisa diisi langsung.
- Notifikasi update PWA diperhalus: copy lebih jelas + aksi `Nanti` (dismiss per sesi) + `Muat ulang`.
- Smart Recall prompt non-blocking (memory trigger).
- Global recovery CTA `Tambah yang barusan` selalu tersedia di composer.
- Recovery telemetry lokal tersimpan (`recovery_count`, `last_recovery_at`).
- Indikator ringan `Terakhir catat: ...` aktif dan update tiap 1 menit.
- Night Close ritual (bar + review panel + close marker harian).
- Night Close auto-surface saat buka app di window malam (20:00-23:59) jika hari belum ditutup.
- Report harian split-aware (pakai porsi `Kamu`).
- Group by date + filter rentang (`Hari ini/7 hari/30 hari/Semua`).
- Refactor `page.tsx`: UI diekstrak ke `src/components/kemana/*`, page tetap sebagai orchestration state/handler.
- Perceived performance Quick Add dituning (reuse parse preview + insert dulu + persist storage di background).
- Performa list dituning: single-expand (1 row aktif), expanded UI lazy-mounted, dan collapsed row dimemoisasi untuk list besar.
- Debug instrumentation ack submit tersedia via `localStorage.DEBUG_PERF=true` (sample di `kemana.perf.quickAddAck.v1`).
- Benchmark otomatis ack perceived tersedia (`apps/web/scripts/ack-perceived-benchmark.mjs`) dan sudah lulus skenario list berat (`300`/`1000`, mode tanpa devtools, `p95 < 100ms`).
- UX edit tanggal diperjelas: perubahan diterapkan saat tombol `Simpan`, ada helper text, input date iOS tidak overflow card, dan toast memberi konteks saat entry pindah keluar filter aktif.
- PWA update flow aman (`Update tersedia` -> `Muat ulang`).
- PWA install banner:
  - otomatis hidden saat app dibuka dalam mode standalone/homescreen
  - Android/Chromium pakai `beforeinstallprompt`
  - iOS menampilkan instruksi `Share -> Add to Home Screen`
- Safe-area iOS standalone disesuaikan agar judul tidak bentrok area jam/status bar.
- Migrasi state ke Zustand untuk orchestration terpusat dan perbaikan re-render.
- Migrasi komponen UI ke shadcn/ui dan Tailwind CSS v4.
- Toast notifikasi dimigrasikan ke ekosistem Sonner.

## Menjalankan Lokal

```bash
nvm use 22
cd apps/web
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Status Test (25 Feb 2026)

- Unit test: `107/107` lulus (`npm test`).
- E2E test: `17/17` lulus (`npx playwright test`, Chromium).
- Cakupan test mencakup semua flow inti MVP Phase 1:
  - offline simulation end-to-end (quick add + list),
  - drag-close bottom sheet lintas halaman,
  - SW update banner waiting/dismiss session,
  - virtualisasi list threshold `1000+` item.
- Aplikasi siap untuk dogfooding intensif.

## Benchmark Ack (Perceived)

```bash
nvm use 22
cd apps/web
npm run build
npm run perf:ack:auto -- --samples=8 --sizes=300,1000 --threshold-ms=100
```

## Struktur Repo (Monorepo Sederhana)

- `apps/web`: aplikasi Next.js utama
- `packages/core`: domain logic reusable (parser/split/rules)
- `packages/storage`: storage adapter reusable

## Deploy

Panduan push GitHub + deploy Vercel ada di `DEPLOY.md`.

## Release ke Git (Dengan Validasi)

Jalankan satu perintah ini dari root repo:

```bash
./scripts/release-and-push.sh
```

Alur otomatis:
1. Menjalankan test (`apps/web`)
2. Meminta input versi (mis. `0.1.1` atau `v0.1.1`)
3. Membuat annotated tag release
4. Push branch aktif + push tag ke `origin`
