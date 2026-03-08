# KeMana

KeMana adalah aplikasi pencatatan pengeluaran single-device, local-first, dengan fokus input cepat: "Biar tau uangmu kemana".

## Fitur Keamanan

KeMana menerapkan beberapa lapisan keamanan untuk melindungi data pengguna:

### 1. Enkripsi localStorage (AES-256)
- **Masalah**: localStorage rentan terhadap serangan XSS yang dapat membaca data pengguna
- **Solusi**: Semua data pengguna (preferensi, nama) dienkripsi menggunakan AES-256 sebelum disimpan
- **Implementasi**: Kunci enkripsi diturunkan dari user ID menggunakan SHA-256 (deterministik, konsisten antar sesi)
- **Performa**: Overhead enkripsi < 5ms untuk operasi store normal

### 2. Validasi CSV Import
- **Batas Ukuran File**: Maksimal 10MB untuk mencegah crash browser
- **Batas Jumlah Baris**: Maksimal 10,000 baris untuk mencegah UI freeze
- **Rasional**: Batas ini wajar untuk pemrosesan berbasis browser dan mencegah serangan DoS
- **Validasi**: Dilakukan sebelum parsing untuk fail-fast (tidak alokasi memori)

### 3. Proteksi Kredensial
- **File `.env.local`**: Otomatis diabaikan oleh git untuk mencegah kebocoran kredensial
- **Template**: File `.env.local.example` tersedia sebagai template dengan placeholder values
- **Best Practice**: Jangan pernah commit file yang berisi kredensial aktual

### 4. Logging Produksi
- **Development**: Console logs aktif untuk debugging
- **Production**: Console logs otomatis dinonaktifkan untuk mencegah eksposur informasi sensitif
- **Implementasi**: Semua console statements dibungkus dengan `if (process.env.NODE_ENV !== 'production')`

### 5. Validasi Split Transaction
- **Validasi**: Sum dari shares harus sama dengan total amount (toleransi ±1 untuk rounding)
- **Rasional**: Mencegah inkonsistensi data (contoh: 100k split jadi 60k + 30k = 90k)
- **Toleransi**: ±1 untuk menangani floating-point rounding errors

### Breaking Changes
Tidak ada breaking changes - semua perbaikan keamanan mempertahankan backward compatibility dengan kode yang ada.

## Memory Management & Resource Cleanup

KeMana menerapkan strategi komprehensif untuk mencegah memory leak dan race condition:

- **Sync Worker Cleanup**: Instance dan event listener dibersihkan sepenuhnya saat logout
- **Auth Initialization Timing**: Flag initialized hanya diset setelah async session fetch selesai
- **Network Validation**: Operasi sync memvalidasi koneksi sebelum dimulai
- **Quota Handling**: Error IndexedDB quota exceeded ditangani dengan notifikasi user dan retry otomatis
- **useEffect Cleanup**: Refs direset dan resources dibersihkan saat component unmount

Untuk detail lengkap, lihat [MEMORY_MANAGEMENT.md](MEMORY_MANAGEMENT.md).

## Progress Terkini (7 Maret 2026)

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
- Group by date + filter rentang (`Hari ini/Pekan ini/30 hari/Semua`).
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
- Instalasi Target Native Mobile (Capacitor Phase 1):
  - Capacitor setup iOS & Android (dengan Custom Splash Screen + Icons)
  - Edge-to-Edge display UI cross-platform PWA vs Native App
  - Capacitor Keyboard API override untuk kelancaran typing composer mobile
  - Capacitor Status Bar sync (adaptif per theme dark/light, seamless logic fallback Safari PWA)
  - Haptic Feedback utilities native terintegrasi (heavy tap, success save)
- Migrasi state ke Zustand untuk orchestration terpusat dan perbaikan re-render.
- Migrasi komponen UI ke shadcn/ui dan Tailwind CSS v4.
- Toast notifikasi dimigrasikan ke ekosistem Sonner.
- Gesture swipe-to-delete aktif (WhatsApp-style: swipe left reveal delete button dengan background merah).
- Drag-to-close bottom sheet diperbaiki (smooth follow finger, snap animation natural).
- Animasi native-like diperhalus (easing curves optimal, duration 300ms, GPU acceleration).
- Empty state "Aktivitas terbaru" diperbaiki (hanya muncul saat benar-benar kosong).

## Menjalankan Lokal

```bash
nvm use 22
cd apps/web
npm install
npm run dev
```

Buka `http://localhost:3000`.

### Setup Environment Variables

1. Salin file template: `cp apps/web/.env.local.example apps/web/.env.local`
2. Isi kredensial Supabase dan OAuth di `.env.local`
3. File `.env.local` otomatis diabaikan oleh git untuk keamanan

## Status Test (28 Feb 2026)

- Unit test: `107/107` lulus (`npm test`).
- E2E test: `17/17` lulus (`npx playwright test`, Chromium).
- Cakupan test mencakup semua flow inti MVP Phase 1:
  - offline simulation end-to-end (quick add + list),
  - drag-close bottom sheet lintas halaman,
  - SW update banner waiting/dismiss session,
  - virtualisasi list threshold `1000+` item,
  - swipe-to-delete gesture (manual testing).
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
