# TODO Eksekusi MVP KeMana (Single-Device First)

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
- [ ] Tidak boleh ada modal blocking atau route change saat add entry.
- [ ] Add harus acknowledgement instan (`< 100ms`) tanpa spinner.
- [ ] Semua edit utama harus inline dari list/detail expand.

## 2.1 Hari 1 - Thin Slice Start (`/apps/web` only)
- [ ] Setup minimal `apps/web` untuk jalankan composer + list secepat mungkin.
- [ ] Buat model entry sederhana + local repository berbasis localStorage.
- [ ] Implement flow add instan: ketik -> enter/tap -> entry langsung muncul di list.
- [ ] Render dense list dasar yang usable di mobile.

## 2.2 Hari 2 - Parser Pure TS (masih dekat app)
- [ ] Tulis parser/split logic sebagai pure TypeScript di `/apps/web/src/core/*` (sementara).
- [ ] Definisikan entity/value object: Entry, Person, Split, Rule.
- [ ] Definisikan kontrak parser input single-line.
- [ ] Implement normalisasi amount (k/rb/jt, separator, heuristik ribuan).
- [ ] Implement parser split token (`np`) + validasi dasar.
- [ ] Implement formatter amount compact (`k`, `jt`) untuk tampilan.
- [ ] Unit test parser: happy path + edge cases dari `PLANS.md`.

## 2.3 Hari 3 - Quick Add + Dense List Harus Usable
- [ ] Build home shell mobile-first (composer + dense list).
- [ ] Integrasi Quick Add stream dengan parse preview debounced.
- [ ] Implement aksi `Tambah` dengan save lokal instan.
- [ ] Implement inline edit dasar (text/amount/category) dari list.
- [ ] Seed kategori default + fallback `Lainnya`.
- [ ] Implement category remember sederhana berbasis keyword/merchant lokal.
- [ ] Tampilkan warning parse ambigu secara inline (tanpa modal blocking).

## 2.4 Hari 4 - Rapikan Arsitektur (Fake Monorepo -> Target)
- [ ] Buat struktur target monorepo (`/apps/web`, `/apps/mobile`, `/packages/core`, `/packages/infra`).
- [ ] Pindahkan pure core logic dari `/apps/web/src/core/*` ke `/packages/core` tanpa ubah perilaku.
- [ ] Setup TypeScript references/workspace seperlunya setelah UX baseline terbukti.
- [ ] Migrasi storage dari localStorage ke Dexie dengan one-time migration lokal.

## 2.5 Hari 5 - Split Equal + Custom
- [ ] Implement equal split calculator (integer, deterministic remainder).
- [ ] Implement custom split validator (sum harus sama).
- [ ] Build split editor UI (equal/custom).
- [ ] Build people quick-create (name only).
- [ ] Simpan dan tampilkan ringkasan owes pada entry.

## 2.6 Hari 6 - Bulk Paste + Latency Tuning
- [ ] Implement bulk paste sheet + preview + simpan parsial.
- [ ] Implement batched write Dexie (`bulkPut`) untuk multi-entry.
- [ ] Pastikan semua read/write UI berasal dari store lokal.
- [ ] Tuning performa interaksi add/edit agar target ack `< 100ms` tetap tercapai.

## 2.7 Hari 7 - Stabilization dan Dogfooding
- [ ] E2E core flow offline: quick add, inline edit, split equal/custom, bulk paste.
- [ ] Regression test parser untuk edge cases utama.
- [ ] UAT internal di mobile web (Safari + Chrome Android).
- [ ] Bugfix blocker dan final polish microcopy.

## 2.8 Quality Gate Phase 1 (Harus Lolos)
- [ ] Semua core flow berfungsi saat perangkat offline.
- [ ] Add interaction terasa instan (target acknowledgement `< 100ms` pada device creator).
- [ ] Tidak ada data loss selama storage browser/tab tidak dihapus.
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
