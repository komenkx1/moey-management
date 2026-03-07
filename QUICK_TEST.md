# Quick Test - 2 Menit

## Setup
```bash
cd apps/web
npm run dev
```

## Test Flow

### 1. Anonymous → Login (2 menit)

```
1. Buka http://localhost:3000
2. Tambah 3 transaksi (quick add)
3. Klik tab "Akun"
4. Klik "Login dengan Google"
5. Check console log ✓
```

**Expected Console Log:**
```
✓ Data lokal berhasil di-backup: 3 transaksi, 0 aturan
✓ Data tersinkronisasi
```

### 2. Verify di Supabase

```
1. Buka Supabase Dashboard
2. Table Editor → entries
3. Harusnya ada 3 rows
```

### 3. Test di Browser Lain

```
1. Buka incognito/browser lain
2. Login dengan Google (akun sama)
3. Data 3 transaksi muncul! ✓
```

## Debug

Jika ada masalah, jalankan di console:

```javascript
// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Logged in:', !!session);

// Check local data
const local = await db.entries.toArray();
console.log('Local entries:', local.length);

// Check server data
const { data } = await supabase.from('entries').select('count');
console.log('Server entries:', data);
```

## Success ✅

Jika:
- Console log muncul tanpa error
- Data muncul di Supabase
- Data muncul di browser lain

Maka **Phase 2.1 COMPLETE!**

Next: Phase 2.2 - Sync Queue
