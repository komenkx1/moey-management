# TODO Eksekusi MVP KeMana (Single-Device First)

## 0. Progress Update (Per 7 Maret 2026)
- **Phase 1 MVP PRODUCTION-READY** untuk dogfooding intensif single-device.
- Phase 1 core UX sudah usable untuk dogfooding single-device.
- Parser + split + rules sudah dipisah ke `packages/core`.
- Storage adapter local-first aktif di `packages/storage` (Dexie/IndexedDB sebagai primary storage).
- PWA minimal + offline/update flow sudah aktif.
- Import/Export JSON + CSV sudah jalan (termasuk import CSV dan filename download lebih stabil di browser mobile).
- Kompatibilitas data legacy metode bayar (`Lainnya`/`Belum pilih`) dinormalisasi ke `Unknown` saat load/import.
- Bottom sheet `Catat pengeluaran` sudah punya input `Nama catatan` terpisah dari detail `Catatan`.
- Notifikasi update PWA sudah dipoles (judul/subtitle lebih jelas + tombol `Nanti` per sesi).
- Composer sudah lebih tenang: teaching hint adaptif kontekstual, error merah hanya setelah submit.
- Parser qty-aware sudah aktif (`3x 15k`, `x3 15k`, `15k x3`, `3 x 15k`) dan token qty dipertahankan di text.
- Expanded row sudah punya breakdown display item untuk meningkatkan trust (display-only).
- Date edit punya feedback pindah yang jelas (`Dipindah ke ...`, tombol `Lihat`, scroll + highlight row).
- Summary/report sudah split-aware (menghitung porsi `Kamu` saat entry punya split).
- Daily Summary card + smart empty state sudah aktif.
- Group by date + total per hari sudah aktif.
- Filter rentang tanggal (`Hari ini`, `Pekan ini`, `30 hari`, `Semua`) sudah aktif untuk list + summary.
- Payment method opsional sudah aktif (awareness-only, non-blocking).
- Export/Import backup JSON + storage corruption guard sudah aktif.
- PWA & Native App UI blending: iOS & Android PWA status bar sync via direct CSS var check dan native Capacitor diproteksi lewat `isNativePlatform()`. seamless transition dark/light.
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
- Migrasi UI ke shadcn primitives selesai sepenuhnya (Tailwind v4).
- Migrasi state page orchestration ke Zustand selesai (dibagi per domain slice sesuai `MIGRATION_SHADCN_ZUSTAND.md`).
- Migrasi toast ke Sonner selesai dengan deduplikasi action/undo.
- Gesture swipe-to-delete sudah aktif (WhatsApp-style: swipe left reveal delete button, bukan langsung hapus).
- Drag-to-close bottom sheet sudah diperbaiki (smooth follow finger, tidak patah).
- Animasi native-like sudah diperhalus (easing curves, duration optimal, GPU acceleration).
- Empty state "Aktivitas terbaru" sudah diperbaiki (hanya muncul saat benar-benar kosong).
- Filter "7 hari" diubah menjadi "Pekan ini" (Monday-Sunday week-based calculation).
- **Quality Gate Phase 1 LOLOS**: E2E tests (17/17), UAT mobile validated, dogfooding 7+ hari completed, batched write Dexie implemented.

## 0.1 Audit Cakupan Test (25 Februari 2026)
- Unit test: `107/107` lulus (`vitest`).
- E2E test: `17/17` lulus (`playwright`, Chromium, production build).
- Flow yang sudah tercakup:
  - Quick Add + inline edit + split.
  - Bulk input.
  - Export JSON/CSV + import JSON/CSV.
  - Insight page CTA.
  - Bottom sheet open/close + drag-close lintas halaman.
  - Offline mode E2E (network simulation) untuk quick add + list.
  - Catat pengeluaran dengan qty.
  - Virtualisasi list otomatis saat import `1001+` item.
  - SW update banner waiting state + dismiss per sesi.
- Cakupan test sudah memadai untuk MVP Phase 1.
- Gap cakupan yang masih belum otomatis:
  - Perf benchmark end-to-end berbasis metrik frame time/scroll jank CI (bukan hanya threshold render count).

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
- [x] Implement batched write Dexie (`bulkPut`) untuk multi-entry.
- [x] Pastikan semua read/write UI berasal dari store lokal.
- [x] Optimasi jalur submit Quick Add (reuse parse preview + insert dulu + persist entries di background task).
- [x] Tambahkan instrumentation ack submit debug-only (`DEBUG_PERF`, key `kemana.perf.quickAddAck.v1`).
- [x] Tuning performa interaksi add agar target ack `< 100ms` tercapai.
- [x] Tambahkan benchmark otomatis ack perceived (next paint) untuk skenario berat dan mode tanpa devtools.
- [x] Optimasi render list besar: single-expand + lazy-mount expanded row + memo collapsed row.
- [x] Polish performa interaksi edit agar tetap smooth (non-blocking untuk MVP).

## 2.7 Hari 7 - Stabilization dan Dogfooding
- [x] E2E core flow offline: quick add, inline edit, split equal/custom, bulk paste.
- [x] Regression test parser untuk edge cases utama.
- [x] UAT internal di mobile web (Safari + Chrome Android).
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
- [x] Validasi copywriting status summary lewat dogfooding 7 hari (agar tone konsisten suportif).

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
- [x] Validasi manual perilaku lintas hari dan timezone override (QA checklist).

## 2.14 Refactor Struktur UI (Tanpa Ubah Behavior)
- [x] Ekstrak `page.tsx` menjadi komponen presentational di `src/components/kemana/*`.
- [x] Pertahankan `page.tsx` sebagai orchestration state/effect/handler inti.
- [x] Pindahkan helper pure ke `src/lib/kemana-utils.ts`.
- [x] Jaga className/DOM/urutan elemen tetap identik saat ekstraksi.

## 2.15 Mobile Gesture Enhancement (Selesai - 28 Feb 2026)
- [x] Implement swipe-to-delete pada TransactionCard (WhatsApp-style: reveal delete button).
- [x] Perbaiki drag-to-close bottom sheet (smooth follow finger, tidak patah saat release).
- [x] Perhalus semua animasi untuk feel native-like (easing curves optimal, GPU acceleration).
- [x] Fix empty state "Aktivitas terbaru" (hanya muncul saat benar-benar kosong).
- [x] Fix pointer events conflict pada swipe gesture (desktop mode bisa expand card).
- [x] Tambahkan utility classes untuk smooth animations di globals.css.
- [x] Kurangi visual noise composer (hint lebih ringkas, tidak numpuk).
- [x] Perhalus transisi Night Close panel + backdrop.
- [x] Perhalus affordance tombol close panel (`×`) agar tidak terasa keras.
- [x] Update filter "7 hari" menjadi "Pekan ini" (Monday-Sunday week-based calculation).

## 2.9 Quality Gate Phase 1 (LOLOS - Production Ready)
- [x] Semua core flow berfungsi saat perangkat offline.
- [x] Add interaction terasa instan (target acknowledgement `< 100ms` pada device creator).
- [x] Tidak ada data loss selama storage browser/tab tidak dihapus.
- [x] Aplikasi siap untuk dogfooding intensif harian (semua fitur inti stabil).
- [x] E2E test coverage untuk core flows (17/17 lulus).
- [x] UAT mobile web Safari iOS + Chrome Android validated.
- [x] Dogfooding 7+ hari completed dengan copywriting validated.
- [x] Night Close behavior lintas hari validated.
- [x] Batched write Dexie implemented untuk performa optimal.

## 2.5 PHASE 2.5 (React Native Web Migration) - NEXT PRIORITY
Status:
- Design completed (see PHASE2.5_REACT_NATIVE_MIGRATION.md)
- Strategy: Migrate to Expo + React Native Web for universal app
- Architecture: 95%+ code sharing across Web, iOS, Android
- Timeline: 4 weeks (Setup → Screens → Components → Polish)
- Reason: Avoid double work, auth will be built once for 3 platforms

## 3. PHASE 2 (Backend & Sync Activation) - AFTER MIGRATION
Status:
- Design completed (see PHASE2_AUTH_SYNC_DESIGN.md)
- Strategy: Google OAuth only + Auto-sync background
- Architecture: Local-first with optimistic UI + sync queue
- Timeline: 5 weeks (Auth → Sync Queue → Initial Sync → Polish → Beta)
- Implementation: In universal app (works on Web + iOS + Android)

## 2.16 Phase 2.5: React Native Web Migration (11 weeks total) - NEXT PRIORITY

### Week 1-4: Build Phase (Next.js tetap live)
- [ ] Setup Expo project + NativeWind + SQLite adapter
- [ ] Port core screens (Home, Notes, Insight, Account)
- [ ] Port components + gestures (swipe-to-delete, bottom sheets)
- [ ] Platform-specific features + polish (safe area, notifications, haptics)
- [ ] Create new Vercel project: kemana-universal

### Week 5: Beta Deployment
- [ ] Setup beta.kemana.app subdomain
- [ ] Deploy RN Web to beta.kemana.app
- [ ] Internal testing
- [ ] Fix critical bugs
- [ ] Monitor beta metrics

### Week 6: Beta Testing
- [ ] Add beta banner on kemana.app (optional)
- [ ] Collect user feedback
- [ ] Fix reported issues
- [ ] Verify success criteria

### Week 7: Soft Launch Preparation
- [ ] Create upgrade modal
- [ ] Final testing
- [ ] Prepare user communication
- [ ] Build production apps (EAS)

### Week 8: Full Switch
- [ ] Reassign kemana.app to kemana-universal
- [ ] Redirect beta → main domain
- [ ] Keep Next.js as backup
- [ ] Monitor closely (48 hours)
- [ ] Submit to App Store + Play Store

### Week 9-10: Stabilization
- [ ] Monitor error rates (< 1%)
- [ ] Fix non-critical issues
- [ ] Optimize performance
- [ ] Keep Next.js backup active

### Week 11+: Cleanup
- [ ] Delete kemana-web Vercel project
- [ ] Remove beta subdomain
- [ ] Update documentation

## 3.1 Phase 2.1: Auth Foundation (Week 5-6) - IN UNIVERSAL APP
- [ ] Setup Supabase project + Google OAuth provider.
- [ ] Enable Email/Password provider di Supabase.
- [ ] Configure OAuth callback URL + environment variables.
- [ ] Implement Account tab UI (4th bottom tab).
- [ ] Implement login flow UI (banner + button "Login dengan Google").
- [ ] Implement auth state management (Supabase client + React context).
- [ ] Implement local data migration (anonymous → logged in).
- [ ] Implement change display name feature.
- [ ] Implement add password to Google account feature.
- [ ] Implement change password feature.
- [ ] Implement forgot password flow.
- [ ] Implement email/password login UI.
- [ ] Test auth flow end-to-end (Google login, email/password login, logout, session persistence).
- [ ] Test password management flows (add, change, reset).

## 3.2 Phase 2.2: Sync Queue (Week 2)
- [ ] Design sync queue schema in IndexedDB (SyncEvent table).
- [ ] Implement sync queue operations (enqueue, dequeue, update status).
- [ ] Implement sync worker (background processor with retry logic).
- [ ] Implement optimistic UI updates (local-first, sync background).
- [ ] Test queue processing (FIFO, batching, idempotency).
- [ ] Test retry logic (exponential backoff, max retries).

## 3.3 Phase 2.3: Initial Sync (Week 3)
- [ ] Implement server data fetch (paginated for large datasets).
- [ ] Implement merge logic (LWW by server updated_at).
- [ ] Implement conflict resolution (server timestamp wins).
- [ ] Test multi-device sync (add on device A, see on device B).
- [ ] Test large dataset sync (1000+ entries).
- [ ] Optimize initial sync performance (batching, progress indicator).

## 3.4 Phase 2.4: Polish & Edge Cases (Week 4)
- [ ] Implement sync status indicator UI (synced, syncing, offline, error).
- [ ] Implement error handling (network errors, auth errors, conflict errors).
- [ ] Implement logout flow (flush queue, clear session, keep local data).
- [ ] Performance optimization (queue deduplication, delta sync).
- [ ] Battery optimization (reduce frequency when low battery).
- [ ] E2E testing (offline/online transitions, multi-device scenarios).

## 3.5 Phase 2.5: Beta Testing (Week 5)
- [ ] Internal dogfooding with 2+ devices per tester.
- [ ] Monitor sync reliability metrics (success rate, latency, conflicts).
- [ ] Fix critical bugs discovered during beta.
- [ ] Tune retry parameters (backoff, max retries, delays).
- [ ] Prepare production deployment (env vars, monitoring, rollback plan).
- [ ] Document known limitations and future enhancements.

## 3.6 Supabase Schema + RLS (Part of Phase 2.1)
- [ ] Buat migration tabel `entries`, `rules`.
- [ ] Definisikan index penting (`owner_id`, `date`, `updated_at`).
- [ ] Aktifkan RLS semua tabel user data.
- [ ] Tulis policy owner-only untuk CRUD.
- [ ] Tambahkan test SQL untuk memastikan isolation lintas user.
- [ ] Setup updated_at trigger untuk automatic timestamp.

## 3.7 Security, Privacy, dan Perf Activation (Part of Phase 2.4)
- [ ] Konfigurasi CSP/secure headers untuk production.
- [ ] Verifikasi RLS policies dengan test queries.
- [ ] Implement logging redaction tanpa PII mentah.
- [ ] Jalankan security checklist penuh dari `SPECS.md`.
- [ ] Rate limiting consideration (future, not MVP).

## 3.8 Quality Gate Phase 2 (Must Pass Before Production)
- [ ] Sync success rate > 99.5% in beta testing.
- [ ] Average sync latency < 2 seconds.
- [ ] Conflict rate < 0.1%.
- [ ] Multi-device sync works seamlessly (tested with 3+ devices).
- [ ] All security acceptance criteria pass.
- [ ] No data loss in offline/online transitions.
- [ ] Auth flow works on mobile Safari + Chrome Android.

## 4. Backlog Setelah MVP (Tidak Dikerjakan Sekarang)
- [ ] App mobile Expo menggunakan reuse `packages/core`.
- [ ] Analytics events pipeline tanpa ubah domain model inti.
- [ ] Receipt itemization (`entry_items`, `item_splits`).
- [ ] Export self-service yang lebih lengkap.
