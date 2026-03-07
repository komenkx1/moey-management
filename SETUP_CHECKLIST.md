# Setup Checklist - Supabase Database

## Quick Setup (5 menit)

### ☐ 1. Buka Supabase Dashboard
- Login ke [supabase.com](https://supabase.com)
- Pilih project kamu

### ☐ 2. Enable Google OAuth
- Dashboard → **Authentication** → **Providers**
- Enable **Google**
- Masukkan Client ID & Secret dari Google Cloud Console
- Save

### ☐ 3. Setup Database
- Dashboard → **SQL Editor**
- Klik **New Query**
- Copy isi file `SUPABASE_SETUP.sql`
- Paste dan **Run**
- Tunggu "Success" message

### ☐ 4. Verify Tables Created
Jalankan query ini:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```
Harusnya muncul: `entries` dan `rules`

### ☐ 5. Update Environment Variables
File: `apps/web/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```
Dapatkan dari: Dashboard → Settings → API

### ☐ 6. Test
```bash
npm run dev
```
Buka app, coba login dengan Google

---

## Files yang Perlu Kamu Gunakan

1. **`SUPABASE_SETUP.sql`** ← Copy paste ini ke SQL Editor
2. **`SUPABASE_SETUP_GUIDE.md`** ← Panduan lengkap jika ada masalah

---

## Quick Test

Setelah setup, test di browser console:

```javascript
// Test connection
const { data, error } = await supabase.from('entries').select('count');
console.log('DB connected:', !error);
```

Jika berhasil, harusnya tidak ada error!

---

## Troubleshooting

**Error: "relation 'entries' does not exist"**
→ Ulangi step 3 (run SQL script)

**Error: "new row violates row-level security policy"**
→ User belum login. Coba login dengan Google dulu.

**Error: "JWT expired"**
→ Logout dan login lagi

---

## Next: Test Migrasi Data

1. Tambah beberapa transaksi sebagai anonymous user
2. Login dengan Google
3. Check console log - harusnya ada:
   ```
   ✓ Data lokal berhasil di-backup: X transaksi, Y aturan
   ✓ Data tersinkronisasi
   ```
4. Check Supabase Dashboard → Table Editor → entries
   - Harusnya ada data yang baru di-upload

Done! 🎉
