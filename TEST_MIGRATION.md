# Test Migration & Sync - Checklist

## Pre-Test Setup

- [ ] App running: `npm run dev` (di `apps/web`)
- [ ] Browser console open (F12)
- [ ] Supabase Dashboard open (Table Editor)

## Test 1: First Login (Migrasi Data Anonymous)

### Steps:
1. [ ] Buka app di browser (anonymous mode)
2. [ ] Tambah 5 transaksi:
   - Contoh: "Makan siang 50000", "Bensin 100000", dll
3. [ ] Tambah 1 rule (optional):
   - Pattern: "makan", Category: "Makanan"
4. [ ] Klik tab "Akun" (bottom navigation)
5. [ ] Klik "Login dengan Google"
6. [ ] Login dengan akun Google

### Expected Results:
- [ ] Console log muncul:
  ```
  ✓ Data lokal berhasil di-backup: 5 transaksi, 1 aturan
  ✓ Data tersinkronisasi
  ```
- [ ] Tidak ada error di console
- [ ] Data transaksi masih muncul di UI
- [ ] Tab "Akun" menampilkan:
  - Email user
  - "Sync otomatis aktif"
  - "5 transaksi tersinkron"

### Verify di Supabase:
- [ ] Buka Supabase Dashboard → Table Editor → `entries`
- [ ] Ada 5 rows dengan `owner_id` = user ID kamu
- [ ] `text`, `amount`, `date` sesuai dengan yang ditambahkan

## Test 2: Login di Browser Lain (Initial Sync)

### Steps:
1. [ ] Buka browser baru (atau incognito)
2. [ ] Buka app
3. [ ] Langsung login dengan Google (akun yang sama)
4. [ ] Tunggu beberapa detik

### Expected Results:
- [ ] Console log muncul:
  ```
  ✓ Data lokal berhasil di-backup: 0 transaksi, 0 aturan
  ✓ Data tersinkronisasi
  ```
- [ ] Data dari server (5 transaksi) muncul di UI!
- [ ] Tab "Beranda" menampilkan semua transaksi
- [ ] Tab "Catatan" menampilkan semua transaksi

## Test 3: Logout & Re-login

### Steps:
1. [ ] Klik tab "Akun"
2. [ ] Klik "Logout"
3. [ ] Verify: Data lokal masih ada (tidak dihapus)
4. [ ] Login lagi dengan Google
5. [ ] Data masih ada dan ter-sync

### Expected Results:
- [ ] Setelah logout: data masih muncul di UI (local-first!)
- [ ] Setelah login: data tetap ada
- [ ] Console log: migrasi & sync berhasil

## Test 4: Add Data Saat Logged In

### Steps:
1. [ ] Pastikan sudah login
2. [ ] Tambah transaksi baru: "Kopi 25000"
3. [ ] Check console log (harusnya tidak ada log migrasi)
4. [ ] Refresh browser
5. [ ] Data masih ada

### Expected Results:
- [ ] Transaksi langsung muncul di UI
- [ ] Tidak ada error
- [ ] Setelah refresh, data tetap ada
- [ ] Di Supabase Dashboard, ada 6 transaksi sekarang

## Test 5: Multi-Device Sync

### Steps:
1. [ ] Browser A: Tambah transaksi "Test A"
2. [ ] Browser B: Refresh page
3. [ ] Browser B: Harusnya muncul "Test A"
4. [ ] Browser B: Tambah transaksi "Test B"
5. [ ] Browser A: Refresh page
6. [ ] Browser A: Harusnya muncul "Test B"

### Expected Results:
- [ ] Data sync antar device
- [ ] Tidak ada duplikasi
- [ ] Semua transaksi muncul di kedua browser

## Troubleshooting

### Issue: Console log tidak muncul
**Check:**
- [ ] Buka Network tab, ada request ke Supabase?
- [ ] Check `.env.local`, SUPABASE_URL dan ANON_KEY benar?
- [ ] Check Supabase Dashboard → Logs untuk error

### Issue: Error "new row violates row-level security policy"
**Fix:**
- [ ] Pastikan RLS policies sudah dibuat (run migration lagi)
- [ ] Pastikan user sudah login (check `session` di console)

### Issue: Data tidak muncul setelah login
**Check:**
- [ ] Console log ada error?
- [ ] Network tab: request ke `/entries` berhasil?
- [ ] Supabase Dashboard: data ada di table?
- [ ] Browser console: `await supabase.from('entries').select('*')`

### Issue: Migrasi tidak jalan
**Check:**
- [ ] Console log: ada error di `migrateLocalDataToAccount`?
- [ ] IndexedDB ada data? (Application tab → IndexedDB → kemana)
- [ ] User ID valid? Check `session.user.id` di console

## Debug Commands

Jalankan di browser console:

```javascript
// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// Check local data
const localEntries = await db.entries.toArray();
console.log('Local entries:', localEntries);

// Check server data
const { data, error } = await supabase.from('entries').select('*');
console.log('Server entries:', data, error);

// Check sync queue (Phase 2.2)
const queue = await db.syncQueue?.toArray();
console.log('Sync queue:', queue);
```

## Success Criteria

✅ All tests passed if:
- Data lokal ter-upload ke server saat first login
- Data dari server ter-download saat login di device baru
- Tidak ada data loss
- Tidak ada error di console
- Multi-device sync bekerja

## Next: Phase 2.2

Setelah semua test passed, lanjut ke:
- [ ] Implementasi Sync Queue untuk auto-sync background
- [ ] Real-time sync saat add/edit/delete transaksi
- [ ] Retry logic dengan exponential backoff
