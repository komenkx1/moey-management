# KeMana MVP Specs

## 1. Acceptance Criteria per Fitur

## 1.1 Quick Add
### QA-01 Zero-Setup First Use
Given user pertama kali membuka aplikasi  
When home screen tampil  
Then user bisa langsung menambah transaksi tanpa wajib signup/login form.

### QA-02 Parse Input Dasar
Given user memasukkan `kopi 18`  
When user menekan `Tambah`  
Then entry tersimpan dengan text `kopi`, amount `18000`, date default hari ini.

### QA-03 Parse Suffix Nominal
Given user memasukkan `parkir 2k`  
When user submit  
Then amount tersimpan `2000`.

### QA-04 Parse Split Token
Given user memasukkan `dinner 120 3p`  
When parser berjalan  
Then amount `120000`, split_count `3`, dan entry masuk mode split-ready.

### QA-05 Autocomplete History
Given user sudah punya histori `kopi susu` beberapa kali  
When user mengetik `ko`  
Then sistem menampilkan suggestion histori dengan prioritas frekuensi + recency.

### QA-06 Bulk Paste Multi-Line
Given user membuka `Tempel Banyak` dan menempel 5 baris valid  
When user menekan `Simpan Semua`  
Then 5 entry tercipta dalam satu aksi dan setiap baris punya hasil parse yang bisa ditinjau.

### QA-07 Bulk Paste Error Parsial
Given terdapat 1 baris invalid dari 5 baris  
When preview parse muncul  
Then baris invalid ditandai jelas dan 4 baris valid tetap bisa disimpan.

### QA-08 Inline Edit Cepat
Given user berada di list transaksi  
When user tap satu entry  
Then user dapat edit amount/category/text tanpa pindah halaman penuh.

### QA-09 Aksi Umum 1-2 Tap
Given user ingin ubah kategori atau nominal  
When user melakukan aksi dari entry row/expand  
Then perubahan selesai maksimal 2 interaksi utama.

## 1.2 Split Bill
### SB-01 Equal Split
Given entry amount 100000 dengan 3 orang (termasuk kamu)  
When user pilih `Bagi Rata`  
Then sistem membagi total secara deterministik dan total share = 100000.

### SB-02 Custom Split Valid
Given entry amount 100000  
When user isi custom split 30000, 30000, 40000  
Then sistem menerima dan menyimpan split.

### SB-03 Custom Split Invalid
Given entry amount 100000  
When user isi custom split total 95000  
Then tombol simpan nonaktif atau muncul error `Total split harus sama dengan nominal`.

### SB-04 Rounding Deterministik
Given total tidak habis dibagi rata  
When equal split diterapkan  
Then remainder dibagikan dengan urutan orang stabil sehingga hasil konsisten.

### SB-05 Ringkasan Owes
Given split tersimpan  
When user kembali ke entry detail  
Then ringkasan menampilkan format `Nama owes kamu X` untuk setiap debtor.

## 1.3 People Minimal
### PP-01 Buat People Saat Split
Given user belum punya daftar people  
When user menambah nama baru di split editor  
Then people tersimpan minimal field `name` dan langsung dapat dipakai.

### PP-02 Favorite Ordering
Given user sering split dengan orang yang sama  
When membuka picker people  
Then nama yang sering dipakai tampil lebih atas.

## 1.4 Kategori dan Rules
### CT-01 Auto Category by Rule
Given ada rule keyword `kopi -> Makan`  
When user input transaksi dengan text mengandung `kopi`  
Then category default jadi `Makan`.

### CT-02 One-Tap Category Chips
Given user melihat entry di list/detail  
When user tap chip kategori lain  
Then category berubah dalam 1 tap.

### CT-03 Fallback Lainnya
Given tidak ada rule yang cocok  
When entry dibuat  
Then category diset `Lainnya`.

### CT-04 Rule Suggestion from Correction
Given user mengubah kategori keyword serupa minimal 2 kali  
When pola terdeteksi  
Then sistem menawarkan membuat personal rule.

## 1.5 Single Device Mode Guarantees (Phase 1 Active)
### SD-01 Full Offline Functionality
Given perangkat tanpa internet  
When user melakukan quick add, edit, split, atau bulk paste  
Then semua fitur inti tetap berfungsi tanpa ketergantungan backend.

### SD-02 Local Persistence Guarantee
Given user sudah menyimpan data di aplikasi  
When user menutup dan membuka ulang tab/app pada device yang sama  
Then data tetap ada selama storage browser tidak dihapus oleh user/OS.

### SD-03 Fast Interaction Guarantee
Given user menekan `Tambah` pada Quick Add  
When input valid  
Then UI memberi acknowledgement instan dengan target latensi interaksi `< 100ms` di device creator.

### SD-04 No Account Requirement
Given user first-time membuka app  
When mulai menggunakan fitur inti  
Then user tidak diminta login/signup.

## 1.6 Offline dan Sync (Phase 2 - Future Activation)
### SY-01 Local Write Tanpa Network
Given perangkat offline  
When user tambah/edit/hapus entry  
Then perubahan tersimpan lokal dan UI langsung update.

### SY-02 Sync Queue
Given ada event lokal pending  
When koneksi kembali online  
Then event dikirim batch FIFO ke server sampai kosong.

### SY-03 Retry dan Backoff
Given sync gagal karena error sementara  
When retry scheduler aktif  
Then sistem retry dengan exponential backoff + jitter.

### SY-04 Conflict Handling
Given ada perubahan pada objek yang sama di lokal dan server  
When sinkronisasi terjadi  
Then keputusan pakai last-write-wins berdasarkan `updated_at` server.

### SY-05 Idempotency
Given event yang sama terkirim ulang akibat retry  
When server menerima request duplikat  
Then hasil tetap satu perubahan logis (tidak dobel row/efek).

## 1.7 Progressive Auth (Anonymous -> Account) (Phase 2 - Future Activation)
### AU-01 Anonymous Usage
Given user belum login penuh  
When app digunakan  
Then user tetap bisa pakai aplikasi dan data terisolasi owner.

### AU-02 Upgrade Account
Given user anonymous ingin backup lintas device  
When user link akun email/google  
Then data existing tetap terbawa dan owner tidak berubah.

### AU-03 Unsynced Data Safety
Given ada data lokal pending sync saat proses upgrade akun  
When proses upgrade dijalankan  
Then app menyelesaikan/menjaga queue agar tidak ada data hilang.

## 1.8 Receipt Scan (Opsional Fase Akhir MVP, Phase 2/3 Activation)
### RC-01 Feature Flag
Given flag OCR nonaktif  
When user membuka app  
Then UI scan receipt tidak muncul.

### RC-02 Minimal OCR Parse
Given user unggah/foto struk pada mode OCR aktif  
When OCR selesai  
Then sistem menampilkan kandidat `merchant`, `date`, `total` untuk review manual.

### RC-03 No Auto-Commit Blindly
Given OCR menghasilkan confidence rendah  
When hasil ditampilkan  
Then user wajib konfirmasi/edit sebelum simpan entry.

## 2. Non-Goals Checklist (MVP)
- [x] Tidak ada chart/dashboard analitik.
- [x] Tidak ada budgeting/goal tracking.
- [x] Tidak ada multi-wallet.
- [x] Tidak ada bank sync.
- [x] Tidak ada export PDF/Excel.
- [x] Tidak ada multi-currency penuh.
- [x] Tidak ada tags kompleks.
- [x] Tidak ada notifikasi.
- [x] Tidak ada AI rekomendasi.
- [x] Tidak ada subscription billing.
- [x] Tidak ada dark mode.

## 3. Security Acceptance Criteria
Catatan status:
- Checklist di bawah ini tetap wajib untuk activation online.
- Pada Phase 1 single-device, item backend/storage/sync diperlakukan sebagai future gate.

## 3.1 Database dan RLS
- [ ] RLS aktif untuk `entries`, `people`, `splits`, `rules`.
- [ ] Policy SELECT/INSERT/UPDATE/DELETE membatasi `owner_id = auth.uid()`.
- [ ] Uji lintas user: user A tidak bisa baca/ubah data user B.
- [ ] Constraint relasi split tidak bisa mengaitkan entry milik owner lain.

## 3.2 Storage Security
- [ ] Bucket receipt bersifat private.
- [ ] Akses file hanya melalui signed URL.
- [ ] TTL signed URL maksimal 10 menit.
- [ ] Validasi MIME type dan size upload aktif.

## 3.3 App Security Controls
- [ ] Semua input transaksi/rule tervalidasi schema.
- [ ] Output text/merchant aman dari XSS (escaping, no unsafe HTML render).
- [ ] Endpoint mutasi yang memakai cookie terlindungi dari CSRF (sameSite + anti-CSRF token bila perlu).
- [ ] CSP aktif di production.
- [ ] Secure headers aktif (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).
- [ ] Token/session mengikuti praktik aman (cookie secure/httpOnly/sameSite bila SSR route dipakai).
- [ ] Secret server-only tidak terekspos ke client bundle.

## 3.4 Abuse dan Dependency
- [ ] Endpoint sync/upload punya rate limiting dasar.
- [ ] Lockfile terjaga, dependency audit berjalan, high/critical issue ditangani.
- [ ] Dependency baru wajib justification (hindari bloat/supply-chain risk).

## 3.5 Logging dan Privacy
- [ ] Logging tidak menyimpan PII mentah (text transaksi, nama orang, detail receipt).
- [ ] Redaction diterapkan untuk error payload.
- [ ] Hapus akun menghapus data user dalam SLA retention yang ditetapkan.

## 4. Performance Acceptance Guardrails
- [ ] Quick Add single entry median < 4 detik.
- [ ] Quick Add acknowledgement lokal < 100ms (Phase 1 target di device creator).
- [ ] Bulk paste 5 entry selesai < 12 detik.
- [ ] Split flow (equal/custom) selesai < 5 detik.
- [ ] UI tetap responsif pada 1000 entry (pagination/virtualization strategy aktif).
- [ ] OCR modul (jika aktif) di-load via dynamic import, bukan bundle awal.
