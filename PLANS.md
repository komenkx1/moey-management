# KeMana MVP Masterplan

## 0. Progress Snapshot (Per 17 Februari 2026)
### Sudah Selesai (Phase 0/1)
- Arsitektur repo aktif: `apps/web`, `packages/core`, `packages/storage` (core logic terpisah dari UI Next.js).
- Quick Add parser production-ready untuk pola utama:
  - `kopi 18`, `parkir 2k`, `dinner 120 3p`
  - nominal dengan cleaning (`Rp18k,`, `(18k)`)
  - inline summation (`25 + 10 + 5`, termasuk tanpa spasi tertentu) + warning terstruktur.
- Dense list + expand row inline, edit inline, category chips, split equal/custom, bulk paste.
- Warning UI non-blocking, delete dengan undo toast, composer autofocus + Enter submit.
- Local-first persistence aktif via localStorage + guard hydration (mencegah data ketimpa kosong di dev refresh).
- PWA minimal aktif:
  - manifest + service worker template (`sw.template.js`)
  - offline access dasar setelah first online load
  - offline badge + safe update banner (`Update tersedia -> Muat ulang`)
  - cache versioning mengikuti versi app.
- Test parser: `19` test lulus (`vitest`).

### Sedang Berjalan
- Polishing UX dense layout, microcopy, dan indikator status online/offline.
- Dokumentasi deployment/release untuk flow solo dev + GitHub/Vercel.

### Belum Diaktifkan (Tetap Sesuai Desain)
- Dexie/IndexedDB sebagai storage utama (masih localStorage untuk validasi cepat).
- Backend Supabase, RLS, auth, sync queue, conflict resolution.
- OCR upload/scan flow.

## 1. Product Goal
KeMana adalah aplikasi pencatatan pengeluaran super cepat dengan fokus utama:
- Menangkap pengeluaran harian secepat chat.
- Memudahkan split bill tanpa friksi.
- Memberi kejelasan "uangmu kemana" tanpa jadi aplikasi budgeting/bank.

## 2. Success Metrics (MVP)
- Input 1 transaksi dari home screen selesai `< 4 detik` (P50, user returning).
- Bulk paste 5 transaksi selesai `< 12 detik` (termasuk parse + simpan lokal).
- Split bill (equal/custom) selesai `< 5 detik` dari entry detail.
- Error parse yang butuh koreksi manual `< 8%` pada 200 input awal.
- Crash-free session `> 99.5%` untuk web PWA.

## 2.1 Prinsip UX Wajib (Panduan Produk)
1. Zero-setup first use (tanpa signup wajib).
2. Input stream seperti chat + list padat.
3. Quick Add jadi jalur utama (target 80%), receipt scan sekunder.
4. Bulk paste multi-line sebagai first-class flow.
5. Inline edit dan aksi umum selesai 1-2 tap.
6. Onboarding progresif: people saat split, rules saat koreksi kategori.
7. App belajar dari user: keyword/merchant -> kategori, dan favorit people.

## 3. Persona dan JTBD
### Persona Utama
1. Profesional sibuk (25-35): sering jajan/transport, tidak mau isi form panjang.
2. Koordinator nongkrong/trip: sering bayar duluan, perlu hitung "siapa owes berapa".
3. Pasangan/roommate: banyak expense bersama, butuh catat cepat dan rapi.

### JTBD
- "Saat baru bayar sesuatu, aku mau catat kurang dari beberapa detik supaya tidak lupa."
- "Saat habis makan bareng, aku mau langsung tahu siapa utang berapa tanpa buka spreadsheet."
- "Saat lihat histori, aku mau list padat yang bisa diedit inline tanpa pindah layar berlebihan."

## 4. Scope MVP (Ketat)
### In-Scope
- Quick Add (single-line, autocomplete history, bulk paste multi-line).
- Split bill (equal split + custom split, people list minimal).
- Kategori sederhana (rule-based + personal correction rule + fallback Lainnya).
- PWA mobile-first + local-first offline (Phase 1 aktif) + sync ke backend (Phase 2 aktivasi).
- OCR receipt opsional fase akhir MVP (ditunda ke Phase 2/3, minimal total/date/merchant).

### Out-of-Scope (MVP)
- Dashboard/chart, budgeting, multi-wallet, bank sync.
- Export PDF/Excel, multi-currency production-ready, tags kompleks.
- Notifikasi, AI rekomendasi, subscription billing, dark mode.

## 4.1 Execution Strategy: Single-Device First
### Kenapa Validasi UX Dulu Sebelum Infra
- Risiko terbesar produk ini ada di kebiasaan pakai harian, bukan di skala sistem.
- Memotong backend/auth/sync di fase awal mempercepat feedback loop UX input/split.
- Mengurangi noise bug jaringan/auth sehingga evaluasi fokus pada kecepatan capture.

### Phase 1 (Active Implementation, Local-First Only)
- LocalStorage menjadi single source of truth saat ini (active implementation).
- Dexie tetap target migrasi berikutnya tanpa mengubah domain logic.
- Tanpa login, tanpa backend, tanpa sync, tanpa upload file, tanpa anonymous auth.
- Implementation tactic: mulai dengan localStorage untuk validasi "feel" cepat, lalu migrasi ke Dexie.
- Prioritas implementasi:
  1. Quick Add parser
  2. Dense list UI
  3. Inline edit
  4. Equal split
  5. Custom split
  6. Bulk paste
  7. Simple category remember

### Phase 2 (Preserve Design, No Implementation Yet)
- Aktivasi Supabase schema + RLS sesuai desain arsitektur saat ini.
- Aktivasi sync engine + conflict handling + idempotency.
- Aktivasi progressive auth (anonymous -> account link).
- Aktivasi storage upload dan OCR bertahap.
- Aktivasi security hardening production-grade end-to-end.

### Metrik Validasi Habit (Creator Dogfooding)
- Creator memakai aplikasi minimal `5 dari 7 hari`.
- Minimal `5 entry/hari` pada setidaknya `4 hari` selama 7 hari.
- Minimal `80%` transaksi masuk dari jalur Quick Add.
- Waktu input single entry tetap `< 4 detik` untuk mayoritas interaksi harian.
- Koreksi parse manual menurun dari hari ke hari (indikasi learning loop bekerja).

## 5. UX Flow per Screen + Microcopy Inti
### 5.1 Home (Dense List + Composer)
- Komponen utama:
  - Composer sticky di atas: 1 input text + tombol `Tambah`.
  - Tombol sekunder: `Tempel Banyak`.
  - List transaksi padat (tanggal, merchant/text, amount, category chip, split badge).
- Microcopy:
  - Placeholder: `contoh: kopi 18, parkir 2k, dinner 120 3p`
  - CTA submit: `Tambah`
  - Empty state: `Belum ada catatan. Coba ketik pengeluaran pertama kamu.`

### 5.2 Quick Add Stream
- User ketik natural text, preview parse muncul realtime (amount/date/split).
- Saat Enter/tap Tambah: simpan lokal instan + input reset.
- Jika parse ambigu: simpan sebagai draft warning inline, bukan blocking modal.
- Microcopy warning: `Nominal belum yakin. Tap untuk koreksi.`

### 5.3 Bulk Paste
- Bottom sheet/modal:
  - Textarea multi-line.
  - Preview hasil parse per baris.
  - Tombol `Simpan Semua`.
- Microcopy:
  - Hint: `Satu baris satu transaksi.`
  - Error per line: `Baris 3 perlu nominal.`

### 5.4 Entry Detail / Inline Edit
- Tap row membuka inline expand (bukan full page untuk aksi umum).
- Edit cepat: text, amount, date, category, split toggle.
- Aksi umum 1-2 tap:
  - Ganti kategori chip.
  - Ubah nominal.
  - Buka split editor.

### 5.5 Split Editor
- Mode:
  - `Bagi Rata`.
  - `Custom`.
- Tambah orang langsung di tempat (nama saja).
- Ringkasan instan:
  - `Pembagian: Budi bayar 33k`
  - `Settlement: Budi ganti ke Kamu 33k`

### 5.6 Progressive Onboarding
- First use: tanpa signup wall.
- Prompt tambah people hanya saat user pilih split.
- Prompt buat rule muncul hanya setelah user sering koreksi kategori.

## 6. Parsing Spec + Edge Cases
## 6.1 Input Grammar (MVP)
Target format umum:
- `<teks> <nominal>`
- `<teks> <nominal> <np>` untuk split jumlah orang (mis. `3p`)

Contoh valid:
- `kopi 18` -> text=`kopi`, amount=`18.000` (heuristik IDR ribuan).
- `parkir 2k` -> amount=`2.000`.
- `dinner 120 3p` -> amount=`120.000`, split_count=`3`.

## 6.2 Normalisasi Nominal
- Gunakan integer minor unit (IDR tanpa pecahan) di domain.
- Suffix didukung:
  - `k`/`rb` = x1.000
  - `jt` = x1.000.000
- Separator:
  - `.` atau `,` dipahami sebagai desimal bila ada suffix (`1,5jt`).
  - ribuan standar (`1.200`) dipahami 1200 jika tanpa suffix.
- Heuristik bare integer untuk IDR:
  - Nilai 1-999 tanpa suffix dianggap ribuan (18 -> 18000).
  - Nilai >=1000 dianggap literal.
- Parser mengambil token numerik terakhir sebagai nominal utama.
- Date default: hari ini (timezone perangkat).

## 6.3 Edge Cases Wajib
| Input | Ekspektasi |
|---|---|
| `kopi` | Ditolak parse nominal, tampil warning inline |
| `parkir 0` | Ditolak (nominal harus > 0) |
| `makan 12,5k` | 12.500 |
| `belanja 1.2jt` | 1.200.000 |
| `dinner 120 1p` | Valid, split diabaikan (hanya kamu) |
| `dinner 120 0p` | Invalid split count |
| `tol 5rb 3p` | amount 5.000, split 3 orang |
| `kopi 18 besok` | Token tanggal unsupported di MVP, `besok` masuk text |

## 6.4 Autocomplete
- Sumber: histori text/merchant user sendiri.
- Ranking: frekuensi + recency.
- Trigger saat user ketik >=2 karakter.

## 7. Split Spec + Rounding
## 7.1 Equal Split
- Input: total amount + daftar people (termasuk payer = "kamu").
- Kalkulasi memakai integer.
- Rumus:
  - base = floor(total / n)
  - remainder = total - (base * n)
  - remainder dibagi +1 ke urutan people stabil (deterministik).

## 7.2 Custom Split
- User isi nominal per orang.
- Validasi:
  - Semua nilai >= 0.
  - Jumlah custom harus == total.
  - Minimal 1 orang selain payer jika mode split aktif.

## 7.3 Ringkasan Owes
- Tampilkan daftar pembagian per orang (`Nama bayar RpX`) untuk semua participant.
- Tampilkan settlement sekunder untuk orang dengan kewajiban > 0 terhadap payer (`Nama ganti ke Payer RpX`).
- Format compact amount: `33k`, `1.2jt`.

## 7.4 Aturan Rounding
- Perhitungan internal tetap integer Rupiah (tanpa float).
- Ketidakhabisan bagi pada equal split diselesaikan via remainder distribution deterministik.
- Tidak ada silent rounding ke 100/1000 di MVP untuk menjaga akurasi.

## 8. Kategori dan Rule Engine Sederhana
## 8.1 Kategori Default
- Makan
- Transport
- Belanja
- Tagihan
- Hiburan
- Lainnya

## 8.2 Rule Engine (Prioritas)
1. Exact merchant rule (personal).
2. Keyword rule pada text (personal).
3. Rule global bawaan sederhana (opsional seed).
4. Fallback `Lainnya`.

## 8.3 Learning Loop
- Jika user ubah kategori manual >=2 kali untuk keyword/merchant serupa, tampil prompt:
  - `Selalu jadikan "kopi" sebagai Makan?`
- People favorit:
  - Urutkan nama berdasarkan frekuensi split dan simpan `pinned_rank`.

## 9. Tech Stack Final + Alasan
| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend | Next.js App Router + TypeScript | Cepat delivery, routing modern, cocok untuk PWA dan SSR/edge headers |
| UI | Tailwind + komponen sederhana (opsional shadcn/ui terbatas) | Build cepat, kontrol layout dense mobile-first, minim overhead |
| State | Zustand | Ringan, API sederhana, minim boilerplate untuk MVP local-first |
| Offline DB | Dexie (IndexedDB) | API nyaman untuk schema versioning, bulk ops, transaksi lokal |
| Backend | Supabase (Postgres/Auth/Storage) | Free-tier kuat, RLS native, SQL fleksibel, siap scale |
| Deploy | Vercel (web) + Supabase | Integrasi Next.js mulus, operasi ringan |
| OCR Web | Fase awal manual, opsional Tesseract.js via dynamic import | Biaya rendah, privasi lebih baik, tidak wajib upload |
| OCR Mobile | ML Kit on-device (fase mobile) | Latensi rendah, privasi kuat, tanpa biaya cloud per request |

### Tradeoff Backend
- Supabase vs Firebase:
  - Supabase unggul pada SQL + RLS transparan.
  - Firebase unggul realtime cepat tapi query kompleks/relasional lebih terbatas.
- Supabase vs Appwrite:
  - Appwrite sederhana self-host, tetapi ekosistem SQL/RLS Supabase lebih matang untuk use case ini.

## 10. Arsitektur Extensible (Web -> Mobile)
## 10.1 Struktur Monorepo (Rekomendasi)
```text
/apps/web
/apps/mobile              # placeholder Expo/RN
/packages/core
  /domain                 # entity, value object, pure logic
  /application            # use-cases: addEntry, splitEntry, applyRule, syncPlan
  /ports                  # interface repository/sync/ocr
/packages/infra
  /indexeddb              # Dexie adapters
  /supabase               # Postgres/Auth/Storage adapters
  /sync                   # queue processor
  /ocr                    # provider adapters (manual/tesseract/cloud)
/packages/ui              # opsional reusable UI primitives
```

## 10.2 Dependency Rules
- `core/domain` tidak boleh import UI, framework, network, Supabase, Dexie.
- `core/application` hanya tergantung `domain` + `ports`.
- `infra/*` implement `ports`.
- `apps/web` dan `apps/mobile` hanya mengorkestrasi UI + adapter, bukan bisnis logic.
- Parser/split/rule engine hanya hidup di `packages/core` agar reusable ke React Native.

## 10.3 Skalabilitas Fitur Lanjutan
- Tambahkan event hooks di application layer untuk analytics tanpa ubah domain.
- Gunakan versioned DTO antara core dan infra untuk hindari breaking change besar.
- Gunakan feature flags untuk OCR/fitur eksperimen.

## 11. Offline dan Sync Design
Catatan strategi:
- Phase 1 mengimplementasikan local-first only (11.1).
- Bagian sync (11.2-11.4) dipertahankan sebagai desain Phase 2, belum diimplementasikan sekarang.

## 11.1 Local-First
- Semua create/update/delete masuk localStorage dulu (optimistic UI) pada implementasi saat ini.
- Migrasi ke Dexie tetap direncanakan sebagai langkah berikutnya tanpa ubah kontrak domain.
- UI selalu membaca dari local store.
- Tidak ada sync queue aktif pada Phase 1.

## 11.2 Sync Queue Event Log
- Tabel `sync_events` lokal:
  - `event_id`, `entity`, `entity_id`, `op`, `payload`, `idempotency_key`, `created_at`, `retry_count`.
- Flush FIFO per batch (mis. 20 event).
- Retry dengan exponential backoff + jitter.

## 11.3 Conflict Strategy
- Last-write-wins berdasarkan `updated_at` server.
- Simpan `server_updated_at` lokal setelah ack.
- Idempotency key wajib untuk hindari duplikasi pada retry.

## 11.4 Anonymous -> Account Upgrade
- First use: app jalan tanpa form signup.
- Saat online, gunakan Supabase anonymous auth di background (tanpa friksi) untuk owner isolation RLS.
- Saat user upgrade (email/google), identity di-link; data tetap milik owner yang sama.
- Jika ada data lokal yang belum tersync, flush dulu sebelum proses link selesai.

## 12. Data Model Minimal (Supabase/Postgres)
- `entries(id, owner_id, text, amount, currency, date, category, merchant, source, created_at, updated_at)`
- `people(id, owner_id, name, pinned_rank, created_at, updated_at)`
- `splits(id, entry_id, person_id, amount, created_at, updated_at)`
- `rules(id, owner_id, pattern, category, merchant, created_at, updated_at)`
- Opsional nanti: `entry_items`, `item_splits` (untuk itemized receipt).

Catatan:
- `amount` disimpan integer minor unit.
- `currency` default `IDR` di MVP.

## 13. OCR Plan (Web Sekarang vs Mobile Nanti)
## 13.1 Web MVP
- Phase 1: tanpa OCR, user input manual (jalur utama), tanpa upload file.
- Opsi aktivasi berikutnya:
  - Tesseract.js client-side via dynamic import.
  - Hanya ekstrak `merchant`, `date`, `total`.
  - Selalu tampil review screen, tidak auto-save mentah.

## 13.2 Mobile Future
- ML Kit on-device untuk OCR.
- Output parser sama (pakai `packages/core`) agar konsisten lintas platform.

## 13.3 Cloud OCR (Belakangan, Opsional)
- Aktif hanya jika value sudah terbukti.
- Harus consent eksplisit upload struk.
- Simpan di private bucket, signed URL TTL pendek.

## 14. SECURITY & PRIVACY
Catatan strategi:
- Checklist backend-grade (RLS/storage/auth/sync abuse control) tetap menjadi target wajib, tetapi diaktifkan pada Phase 2.
- Phase 1 fokus pada local app hygiene: validasi input, sanitasi output, minimisasi data, dan dependency hygiene.

## 14.1 Threat Model Ringkas
Data sensitif:
- Riwayat transaksi dan nominal.
- Merchant dan tanggal.
- Nama orang pada split.
- Foto struk (jika fitur aktif).

Ancaman utama:
1. Kebocoran data antar user (RLS/policy salah).
2. XSS dari text/merchant.
3. CSRF/token leakage pada auth/sync.
4. Insecure local storage/token handling.
5. Storage file exposure (receipt URL publik).
6. Supply chain dependency berbahaya.
7. Abuse/rate spam pada endpoint sync/upload.

## 14.2 Praktik Keamanan Minimum
### Database dan Access Control
- RLS wajib ON di semua tabel user data (`entries`, `people`, `splits`, `rules`).
- Policy hanya mengizinkan row dengan `owner_id = auth.uid()`.
- Constraint relasi `splits.entry_id` harus mengarah ke entry owner yang sama (via check di aplikasi + test policy).

### Storage Security
- Bucket receipt harus private.
- Akses file hanya via signed URL dengan TTL pendek (mis. <= 10 menit).
- Batasi MIME type dan ukuran file upload.

### Secret dan Credential Hygiene
- Tidak ada service role key di client.
- Secret hanya di server env (`SUPABASE_SERVICE_ROLE_KEY`, dsb) untuk admin ops terbatas.
- Pisahkan key public (`anon`) vs server-only.

### Input Validation dan Sanitization
- Validasi schema untuk semua input parser/sync.
- Escaping output pada UI, jangan render HTML mentah dari user text.
- Normalisasi string untuk mencegah injection di query/filter.

### Web Security Headers dan Session
- Pasang CSP ketat (default-src 'self', connect-src ke domain Supabase/Vercel yang dibutuhkan).
- Header minimum: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- Session/token:
  - Prioritaskan cookie secure, httpOnly, sameSite=lax untuk SSR route.
  - Hindari menyimpan token sensitif di tempat yang mudah diakses script.

### Abuse Protection dan Dependency Security
- Rate limit endpoint sync/upload (per user/IP/device).
- Lockfile wajib, dependency minimal, audit rutin (`npm audit`/SCA).
- Policy update dependensi terkontrol (Renovate mingguan + review manual).

### Logging dan Monitoring
- Jangan log text transaksi mentah, nominal detail, atau nama orang secara penuh.
- Redaction PII pada error logs.
- Simpan correlation id untuk debugging tanpa data sensitif.

## 14.3 Privacy-by-Design
- Default tanpa upload struk; OCR cloud bukan jalur utama.
- Simpan hanya field yang benar-benar dibutuhkan.
- Data retention:
  - User bisa hapus entry kapan saja.
  - Hapus akun memicu penghapusan data backend (hard delete <= 30 hari).
  - Receipt image (jika ada) auto-expire/cleanup periodik.
- Export data minimal:
  - JSON/CSV sederhana tersedia setelah auth (fase pasca-MVP awal boleh manual via support script).

## 14.4 Checklist Keamanan Pra-Release MVP
- [ ] Semua tabel user data punya RLS ON + policy teruji.
- [ ] Uji akses lintas akun ditolak (entries/people/splits/rules).
- [ ] Bucket receipt private, signed URL TTL pendek, link publik tidak aktif.
- [ ] Validasi input parser/sync menolak payload invalid.
- [ ] CSP dan secure headers aktif di production.
- [ ] Rate limit aktif untuk sync/upload route.
- [ ] Dependency audit bersih dari high/critical tanpa mitigasi.
- [ ] Basic pentest checklist: XSS, auth bypass, IDOR, CSRF, file exposure.

## 15. PERFORMANCE & EFFICIENCY
## 15.1 Prinsip
- Simple > clever.
- Domain logic pure dan deterministic.
- Dependency sesedikit mungkin.

## 15.2 Core Logic
- Parser/split/rule engine pure TypeScript di `packages/core`.
- Hindari float; gunakan integer amount.
- Unit test menyeluruh untuk kasus normal + edge cases.

## 15.3 UI Performance
- List strategy:
  - Pagination default (mis. 50 item/chunk) untuk mobile web.
  - Virtualized list aktif saat item besar.
- Debounced parse preview (100-150ms).
- Memoization hanya pada komputasi berat (bukan global over-optimization).

## 15.4 Offline + Sync Performance
- Batched writes ke Dexie (`bulkPut`).
- Sync batch + backoff untuk hemat baterai/data (Phase 2).
- Hindari full re-fetch; pakai incremental sync dengan `updated_at`.

## 15.5 Bundle Efficiency
- Dynamic import modul berat (OCR/Tesseract).
- Hindari UI kit besar bila tidak dipakai.
- Tetapkan budget bundle awal dan pantau per release.

## 15.6 Testing Strategy
- Unit:
  - parser
  - split calculator
  - rule matcher
- Integration:
  - local store (Phase 1)
  - sync queue + auth upgrade flow (Phase 2)
- E2E minimal:
  - quick add
  - bulk paste
  - split equal/custom
  - offline to online sync (Phase 2)

## 16. Milestone Bertahap
## Phase 1 (7 Hari, Active Shipping)
- Hari 1-2: setup fondasi monorepo + parser + local persistence Dexie.
- Hari 3-4: Quick Add stream + dense list + inline edit + category remember sederhana.
- Hari 5: split equal + split custom + validasi rounding.
- Hari 6: bulk paste + polishing kecepatan input/list.
- Hari 7: test core flow offline + dogfooding creator + bug fix.

## 16.1 Status Aktual terhadap Milestone
- Hari 1-3: `Done` (thin slice usable, quick add + dense list + inline edit berjalan).
- Hari 4: `Partial` (core logic sudah dipindah ke `packages/core`, storage masih localStorage).
- Hari 5-6: `Done` untuk split equal/custom + bulk paste; `Partial` untuk tuning berbasis metrik.
- Hari 7: `Partial` (parser regression tests sudah ada; dogfooding habit metric belum difinalisasi).

## Phase 2 (Future Activation, No Implementation Yet)
- Aktivasi Supabase schema + RLS + storage policy.
- Aktivasi progressive auth + data claim flow.
- Aktivasi sync queue + retry/backoff + conflict strategy LWW.
- Aktivasi security hardening production-grade dan OCR opsional.

## 17. Risiko dan Mitigasi
| Risiko | Dampak | Mitigasi |
|---|---|---|
| Ambiguitas parser (contoh `18` vs `18000`) | Data salah | Heuristik jelas + preview parse + inline koreksi cepat |
| Storage browser dihapus user/OS pada mode single-device | Data lokal hilang | Komunikasi batasan lokal-first, dorong kebiasaan penggunaan harian, siapkan jalur backup/export saat Phase 2 |
| Conflict sync saat offline lama | Data override | LWW + `updated_at` server + event idempotent |
| RLS/policy salah konfigurasi | Kebocoran lintas user | Policy test otomatis + checklist pra-release wajib |
| OCR web lambat/akurasi rendah | UX buruk | OCR opsional, dynamic import, selalu manual review |
| Scope creep fitur finance | Delivery molor | Tegas non-goals + freeze MVP scope |
| PWA iOS limitasi storage/background sync | Sync tertunda | Queue resilient, retry saat app aktif, komunikasi status sinkronisasi |
