# TODO Eksekusi MVP KeMana (Single-Device First)

## 0. Progress Update (Per 21 Februari 2026)
- Phase 1 core UX sudah usable untuk dogfooding single-device.
- Parser + split + rules sudah dipisah ke `packages/core`.
- Storage adapter local-first aktif di `packages/storage` (Dexie/IndexedDB sebagai primary storage).
- PWA minimal + offline/update flow sudah aktif.
- Composer sudah lebih tenang: teaching hint adaptif kontekstual, error merah hanya setelah submit.
- Parser qty-aware sudah aktif (`3x 15k`, `x3 15k`, `15k x3`, `3 x 15k`) dan token qty dipertahankan di text.
- Expanded row sudah punya breakdown display item untuk meningkatkan trust (display-only).
- Date edit punya feedback pindah yang jelas (`Dipindah ke ...`, tombol `Lihat`, scroll + highlight row).
- Summary/report sudah split-aware (menghitung porsi `Kamu` saat entry punya split).
- Daily Summary card + smart empty state sudah aktif.
- Group by date + total per hari sudah aktif.
- Filter rentang tanggal (`Hari ini`, `7 hari`, `30 hari`, `Semua`) sudah aktif untuk list + summary.
- Payment method opsional sudah aktif (awareness-only, non-blocking).
- Export/Import backup JSON + storage corruption guard sudah aktif.
- Adaptive iOS PWA status bar blending aktif (best-effort).
- Smart Recall prompt + session awareness sudah aktif (memory trigger non-blocking).
- Recovery CTA global `Tambah yang barusan` sudah aktif (dekat composer, non-blocking).
- Recovery metrics lokal (`recovery_count`, `last_recovery_at`) sudah aktif.
- Indikator `Terakhir catat: ...` sudah aktif dan update live tiap 1 menit.
- Night Close ritual sudah aktif (bar, review panel, close marker harian lokal).
- Night Close auto-surface saat buka app malam + tetap muncul setelah submit entry sampai hari ditutup.
- Split UX diperjelas (`Buat/Edit Split`, `Batalkan split`, `Batal` editor).
- Transisi panel Night Close sudah dihaluskan (open/close animation + close button subtler).
- Refactor `page.tsx` ke komponen `src/components/kemana/*` + util shared (`src/lib/kemana-utils.ts`) sudah aktif.
- Jalur submit Quick Add sudah dioptimalkan untuk ack cepat (reuse parse preview + persist background).
- Instrumentasi debug ack submit sudah aktif (`DEBUG_PERF`, storage `kemana.perf.quickAddAck.v1`).
- Benchmark otomatis perceived ack sudah aktif (`apps/web/scripts/ack-perceived-benchmark.mjs`).
- Validasi benchmark ack next-paint pada list berat (`300` dan `1000` transaksi) lulus dengan `p95 < 100ms` (headless, tanpa devtools).
- Performa list dituning: single-expand aktif, expanded UI lazy-mounted, collapsed row dimemoisasi (lebih ringan untuk list besar).
- UX edit tanggal disempurnakan: simpan eksplisit via tombol `Simpan`, helper text di bawah input date, dan overflow input date iOS diperbaiki.
- Toast perpindahan tanggal kini menjelaskan saat entry berada di luar filter aktif (tanpa auto-switch filter agar batch edit tidak terganggu).
- Safe-area iOS standalone sudah dituning untuk hindari bentrok judul dengan jam/status bar.
- Tailwind + shadcn phase progress: controls composer/filter/chips/warning/split editor sudah bermigrasi ke primitive shadcn.
- Dokumen rencana migrasi Zustand sudah dirapikan dan dijadikan acuan eksekusi di `MIGRATION_SHADCN_ZUSTAND.md`.
- Fokus sisa Phase 1: validasi metrik latency/habit dan stabilisasi alur Dexie (tanpa ubah domain contract).

## 1. Prinsip Eksekusi
- Fokus pengiriman 7 hari: Quick Add -> List -> Edit -> Split -> Bulk Paste.
- Jangan keluar scope MVP.
- Domain logic wajib reusable untuk web dan mobile.
- Taktik thin slice: Hari 1-3 utamakan `/apps/web` + localStorage untuk validasi feel, lalu rapikan ke monorepo target.
- Phase 1 tidak boleh mengimplementasikan Supabase/Auth/Sync/OCR upload.
- Setiap fase ditutup dengan quality gate yang terukur.

## 2. PHASE 1 (7 Day Shipping Plan) - ACTIVE IMPLEMENTATION
Status:
- Fokus membuat app usable untuk 1 user di 1 device, sepenuhnya offline-capable.
- Tidak ada implementasi backend, auth, sync, atau upload file.
- Fokus 48 jam pertama: pengalaman add cepat dan list padat sudah terasa "lebih cepat dari notes/excel".

## 2.0 No-thinking Rule (Wajib Selama Phase 1)
- [x] Tidak boleh ada modal blocking atau route change saat add entry.
- [x] Add harus acknowledgement instan (`< 100ms`) tanpa spinner.
- [x] Semua edit utama harus inline dari list/detail expand.

## 2.1 Hari 1 - Thin Slice Start (`/apps/web` only)
- [x] Setup minimal `apps/web` untuk jalankan composer + list secepat mungkin.
- [x] Buat model entry sederhana + local repository berbasis localStorage.
- [x] Implement flow add instan: ketik -> enter/tap -> entry langsung muncul di list.
- [x] Render dense list dasar yang usable di mobile.

## 2.2 Hari 2 - Parser Pure TS (masih dekat app)
- [x] Tulis parser/split logic sebagai pure TypeScript di `/apps/web/src/core/*` (sementara).
- [x] Definisikan entity/value object: Entry, Person, Split, Rule.
- [x] Definisikan kontrak parser input single-line.
- [x] Implement normalisasi amount (k/rb/jt, separator, heuristik ribuan).
- [x] Implement parser split token (`np`) + validasi dasar.
- [x] Implement formatter amount compact (`k`, `jt`) untuk tampilan.
- [x] Unit test parser: happy path + edge cases dari `PLANS.md`.

## 2.3 Hari 3 - Quick Add + Dense List Harus Usable
- [x] Build home shell mobile-first (composer + dense list).
- [x] Integrasi Quick Add stream dengan parse preview debounced.
- [x] Implement aksi `Tambah` dengan save lokal instan.
- [x] Implement inline edit dasar (text/amount/category) dari list.
- [x] Seed kategori default + fallback `Lainnya`.
- [x] Implement category remember sederhana berbasis keyword/merchant lokal.
- [x] Tampilkan warning parse ambigu secara inline (tanpa modal blocking).
- [x] Implement teaching hint kontekstual adaptif agar user cepat paham format input.
- [x] Ubah feedback error composer agar muncul setelah submit (bukan saat user mengetik).

## 2.4 Hari 4 - Rapikan Arsitektur (Fake Monorepo -> Target)
- [ ] Buat struktur target monorepo (`/apps/web`, `/apps/mobile`, `/packages/core`, `/packages/infra`).
- [x] Pindahkan pure core logic dari `/apps/web/src/core/*` ke `/packages/core` tanpa ubah perilaku.
- [x] Setup TypeScript references/workspace seperlunya setelah UX baseline terbukti.
- [x] Migrasi storage dari localStorage ke Dexie dengan one-time migration lokal.

## 2.5 Hari 5 - Split Equal + Custom
- [x] Implement equal split calculator (integer, deterministic remainder).
- [x] Implement custom split validator (sum harus sama).
- [x] Build split editor UI (equal/custom).
- [x] Build people quick-create (name only).
- [x] Simpan dan tampilkan ringkasan pembagian + settlement pada entry.

## 2.6 Hari 6 - Bulk Paste + Latency Tuning
- [x] Implement bulk paste sheet + preview + simpan parsial.
- [ ] Implement batched write Dexie (`bulkPut`) untuk multi-entry.
- [x] Pastikan semua read/write UI berasal dari store lokal.
- [x] Optimasi jalur submit Quick Add (reuse parse preview + insert dulu + persist entries di background task).
- [x] Tambahkan instrumentation ack submit debug-only (`DEBUG_PERF`, key `kemana.perf.quickAddAck.v1`).
- [x] Tuning performa interaksi add agar target ack `< 100ms` tercapai.
- [x] Tambahkan benchmark otomatis ack perceived (next paint) untuk skenario berat dan mode tanpa devtools.
- [x] Optimasi render list besar: single-expand + lazy-mount expanded row + memo collapsed row.
- [ ] Polish performa interaksi edit agar tetap smooth (non-blocking untuk MVP).

## 2.7 Hari 7 - Stabilization dan Dogfooding
- [ ] E2E core flow offline: quick add, inline edit, split equal/custom, bulk paste.
- [x] Regression test parser untuk edge cases utama.
- [ ] UAT internal di mobile web (Safari + Chrome Android).
- [x] Bugfix blocker dan final polish microcopy.
- [x] Tambahkan display breakdown item di expanded row tanpa mengubah schema.

## 2.10 Trust & Reporting Polish (Phase 1 Lanjutan)
- [x] Parser qty-aware untuk format fleksibel (`3x 15k`, `x3 15k`, `15k x3`, `3 x 15k`).
- [x] Pertahankan token qty di text tersimpan agar konteks transaksi tidak hilang.
- [x] Sinkronkan summary/report ke porsi net `Kamu` saat split bill.
- [x] Tambahkan feedback pindah tanggal + aksi `Lihat` + scroll/highlight row.
- [x] Tambahkan adaptive iOS status bar blending (metadata + viewport-fit + dynamic theme-color).

## 2.8 PWA & Update Reliability (Tambahan Phase 0.5)
- [x] Manifest web app + metadata install di Next App Router.
- [x] Service worker minimal untuk offline shell + static assets.
- [x] Offline/online status badge non-blocking.
- [x] Safe update banner (`Update tersedia`) + reload by user action.
- [x] Versioned SW build (template + inject version dari `package.json`).
- [x] Navigation network-first (`no-store`) + app shell fallback untuk kurangi stale HTML.
- [x] Activate lifecycle atomic (`clear old cache -> claim client`) untuk stabilitas update.
- [x] iOS status bar blending best-effort (`black-translucent`, `viewport-fit=cover`, dynamic `theme-color`).
- [x] Banner install PWA non-blocking (hidden di standalone, Android prompt native, iOS instruksi Add to Home Screen).
- [x] Tuning safe-area top di iOS standalone agar title/subtitle tidak overlap area jam/status bar.

## 2.11 Reporting & Data Safety Completeness
- [x] Daily Summary card dengan status + top category + empty state.
- [x] Grouped history per tanggal + total per grup.
- [x] Date range filter memengaruhi list + summary.
- [x] Split-aware reporting memakai porsi net `Kamu`.
- [x] Date move trust feedback (`Dipindah ke...`, `Lihat`, auto-scroll, highlight).
- [x] Export backup JSON + import merge/replace + dedupe by id.
- [x] Storage parse guard (corrupt JSON tidak bikin blank screen).
- [ ] Validasi copywriting status summary lewat dogfooding 7 hari (agar tone konsisten suportif).

## 2.12 Habit Loop (Phase 2 Local, Tanpa Backend)
- [x] Implement Smart Recall bar (gap 3 jam / first-time-today / comeback).
- [x] Implement dismiss per session untuk recall (anti-nagging).
- [x] Integrasikan placeholder adaptif berdasarkan context recall/malam.
- [x] Tambahkan recovery CTA global `Tambah yang barusan` di Home (di luar Smart Recall bar).
- [x] Simpan telemetry recovery lokal (`recovery_count`, `last_recovery_at`).
- [x] Tambahkan indikator `Terakhir catat` berbasis last-entry timestamp dengan refresh 1 menit.
- [x] Implement Night Close bar pada window malam (20:00-23:59).
- [x] Implement Night Close panel (review cepat + CTA tandai beres).
- [x] Simpan close marker harian di localStorage.
- [x] Pastikan auto-surface Night Close tetap muncul saat app dibuka malam walau composer langsung fokus.
- [x] Saat submit entry di window malam dan marker belum ada, bar Night Close tetap tampil.
- [ ] Validasi manual perilaku lintas hari dan timezone override (QA checklist).

## 2.14 Refactor Struktur UI (Tanpa Ubah Behavior)
- [x] Ekstrak `page.tsx` menjadi komponen presentational di `src/components/kemana/*`.
- [x] Pertahankan `page.tsx` sebagai orchestration state/effect/handler inti.
- [x] Pindahkan helper pure ke `src/lib/kemana-utils.ts`.
- [x] Jaga className/DOM/urutan elemen tetap identik saat ekstraksi.

## 2.13 UX Polish (Hari Ini)
- [x] Kurangi visual noise composer (hint lebih ringkas, tidak numpuk).
- [x] Perhalus transisi Night Close panel + backdrop.
- [x] Perhalus affordance tombol close panel (`×`) agar tidak terasa keras.

## 2.9 Quality Gate Phase 1 (Harus Lolos)
- [x] Semua core flow berfungsi saat perangkat offline.
- [x] Add interaction terasa instan (target acknowledgement `< 100ms` pada device creator).
- [x] Tidak ada data loss selama storage browser/tab tidak dihapus.
- [ ] Creator berhasil dogfooding harian minimal 5 dari 7 hari.

## 3. PHASE 2 (Backend & Sync Activation) - PRESERVE DESIGN, NO IMPLEMENTATION NOW
Status:
- Semua item di bawah ini tetap dipertahankan sebagai desain target.
- Tidak masuk eksekusi 7 hari awal.

## 3.1 Supabase Schema + RLS (`/packages/infra/supabase`)
- [ ] Buat migration tabel `entries`, `people`, `splits`, `rules`.
- [ ] Definisikan index penting (`owner_id`, `date`, `updated_at`).
- [ ] Aktifkan RLS semua tabel user data.
- [ ] Tulis policy owner-only untuk CRUD.
- [ ] Tambahkan test SQL untuk memastikan isolation lintas user.

## 3.2 Auth Progressive
- [ ] Integrasi anonymous auth (background, tanpa signup wall).
- [ ] Implement upgrade/link account (email/google) dari anonymous.
- [ ] Pastikan owner continuity setelah upgrade.

## 3.3 Sync Engine (`/packages/infra/sync`)
- [ ] Implement event log enqueue untuk create/update/delete.
- [ ] Implement worker flush FIFO batch.
- [ ] Implement idempotency key per event.
- [ ] Implement retry + exponential backoff + jitter.
- [ ] Implement merge conflict strategy LWW by server `updated_at`.
- [ ] Tambahkan status indikator sync di UI (pending/synced/error ringan).

## 3.4 Security, Privacy, dan Perf Activation
- [ ] Konfigurasi CSP/secure headers/rate limit untuk endpoint online.
- [ ] Verifikasi storage bucket private + signed URL TTL <= 10 menit.
- [ ] Implement logging redaction tanpa PII mentah.
- [ ] Jalankan security checklist penuh dari `SPECS.md`.

## 3.5 OCR Opsional (Aktivasi Bertahap)
- [ ] Tambah feature flag OCR.
- [ ] Integrasi baseline Tesseract.js client-side.
- [ ] Parse minimal merchant/date/total + manual review screen.
- [ ] Tolak auto-save saat confidence rendah.

## 3.6 Quality Gate Phase 2
- [ ] Semua security acceptance di `SPECS.md` lolos.
- [ ] Semua flow sync/auth lolos integration test.
- [ ] Tidak ada kebocoran data lintas user.

## 4. Backlog Setelah MVP (Tidak Dikerjakan Sekarang)
- [ ] App mobile Expo menggunakan reuse `packages/core`.
- [ ] Analytics events pipeline tanpa ubah domain model inti.
- [ ] Receipt itemization (`entry_items`, `item_splits`).
- [ ] Export self-service yang lebih lengkap.
