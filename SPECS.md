# KeMana MVP Specs

## 0. Status Implementasi (Per 17 Februari 2026)
- [x] Quick Add parser + warning system terstruktur.
- [x] Quick Add inline addition (`+`) dengan total otomatis.
- [x] Quick Add qty-aware parsing (`3x 15k`, `x3 15k`, `15k x3`, `3 x 15k`).
- [x] Dense list + expand row + inline edit.
- [x] Split equal/custom + validasi selisih.
- [x] Bulk paste multi-line + preview.
- [x] Category rule sederhana (remember dari koreksi kategori).
- [x] Teaching hint adaptif (muncul hanya saat user buntu, tidak permanen).
- [x] Teaching hint kontekstual aktif berdasarkan pola input (format cepat/merchant/sum/qty).
- [x] Breakdown display per item di expanded row (display-only, tanpa schema baru).
- [x] Local persistence single-device (localStorage).
- [x] PWA minimal + offline badge + safe update banner.
- [x] Adaptive iOS PWA status bar blending (best-effort via `viewport-fit=cover` + dynamic `theme-color`).
- [x] Feedback pindah tanggal (`Dipindah ke ...`, tombol `Lihat`, scroll + highlight row).
- [x] Report/summary pengeluaran split-aware (menghitung porsi `Kamu`).
- [x] Daily summary card + smart empty state.
- [x] Grouped history per tanggal + total harian per grup.
- [x] Filter rentang tanggal (`Hari ini`, `7 hari`, `30 hari`, `Semua`) untuk list + summary.
- [x] Payment method opsional (awareness-only, non-blocking).
- [x] Export/Import backup JSON (merge/replace) tanpa backend.
- [x] Storage guard (corrupt JSON handling + storage version ringan).
- [x] Parser regression tests aktif (`26` test lulus).
- [ ] Dexie migration (target berikutnya, belum aktif).
- [ ] Backend/auth/sync/RLS (tetap Phase 2, belum implementasi).

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

### QA-10 Inline Addition Nominal
Given user memasukkan `gacoan 25 + 10 + 5`  
When parser berjalan  
Then amount tersimpan `40000` dan sistem memberi warning non-blocking bahwa nominal dijumlahkan otomatis.

### QA-11 Teaching Hint Kontekstual
Given user mengetik input yang belum lengkap (contoh ada teks tanpa nominal)  
When user belum menekan submit  
Then app menampilkan hint ringan kontekstual.
And hint tidak tampil saat input sudah valid.

### QA-12 Error Merah Setelah Submit
Given input quick add tidak valid  
When user masih mengetik  
Then error parser merah tidak muncul.
When user menekan `Tambah`/Enter  
Then error parser merah muncul sebagai feedback submit.

### QA-13 Format Help Minimal
Given user berada di composer  
When user belum klik `Format`  
Then bantuan format tetap tersembunyi.
When user klik `Format`  
Then contoh format singkat ditampilkan tanpa modal/route change.

### QA-14 Breakdown Display Layer
Given entry text memuat pola multi-item pada subtitle  
When user membuka expanded row  
Then app menampilkan breakdown display item + total untuk meningkatkan kepercayaan.
And item tidak disimpan sebagai schema terpisah.

### QA-15 Qty Parsing Flexible
Given user memasukkan `makan 3x 15k`, `makan x3 15k`, `makan 15k x3`, atau `makan 3 x 15k`  
When user submit  
Then parser menghitung amount sebagai qty * nominal per item.

### QA-16 Qty Context Preserved in Text
Given user input mengandung qty  
When entry tersimpan  
Then text tetap menyimpan token qty (contoh `makan 3x`) agar konteks transaksi terbaca.

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
Then ringkasan menampilkan:
- daftar `Pembagian` (`Nama bayar RpX`)
- daftar settlement sekunder (`Nama ganti ke Payer RpX`).

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
And state hydration tidak menimpa data lokal saat refresh development mode.

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

## 1.9 Reporting & Trust Feedback
### RP-01 Split-Aware Summary
Given user punya entry split bill  
When app menghitung total harian/summary/top category  
Then report memakai porsi `Kamu` (bukan total bill penuh).

### RP-02 Date Move Feedback
Given user mengubah tanggal entry dari inline editor  
When simpan tanggal sukses  
Then app menampilkan feedback `Dipindah ke {labelTanggal}` dengan aksi `Lihat`.
And saat `Lihat` diklik, app scroll ke row tujuan dan highlight singkat.

### RP-03 Date Move Works With Active Filter
Given filter aktif tidak mencakup tanggal baru entry  
When user klik `Lihat` pada feedback pindah tanggal  
Then filter otomatis disesuaikan ke rentang yang mencakup tanggal target sebelum scroll.

### RP-04 Date Group Header Total
Given entries sudah dikelompokkan per tanggal  
When user melihat header grup tanggal  
Then header menampilkan label tanggal human-friendly dan total nominal untuk grup tersebut.

### RP-05 Summary Follows Active Range
Given user mengganti filter tanggal (`Hari ini`, `7 hari`, `30 hari`, `Semua`)  
When summary dihitung ulang  
Then angka total, status, top category, dan jumlah transaksi mengikuti rentang aktif.

## 1.10 PWA & Update Safety
### PWA-01 Offline Open After First Online
Given user pernah membuka app saat online minimal sekali  
When user membuka app lagi saat offline  
Then app shell tetap terbuka dan data lokal tetap ditampilkan.

### PWA-02 Update Banner Without Silent Reload
Given ada service worker baru setelah release  
When app lama masih terbuka  
Then app tidak reload otomatis.
And app menampilkan banner `Update tersedia`.

### PWA-03 User-Triggered Reload
Given banner `Update tersedia` tampil  
When user klik `Muat ulang`  
Then service worker baru diaktifkan dan app reload satu kali.

### PWA-04 Versioned Cache Invalidation
Given versi app berubah saat build release  
When service worker baru diregister  
Then cache name ikut berubah sesuai versi sehingga aset lama tidak tersangkut.

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
