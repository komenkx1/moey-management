# Panduan Setup Supabase untuk KeMana App

## Prerequisites

1. Akun Supabase (gratis di [supabase.com](https://supabase.com))
2. Project Supabase sudah dibuat

## Step 1: Setup Google OAuth

1. Buka Supabase Dashboard → Authentication → Providers
2. Enable **Google** provider
3. Masukkan Google Client ID dan Client Secret
   - Dapatkan dari [Google Cloud Console](https://console.cloud.google.com)
   - OAuth 2.0 Client IDs
4. Authorized redirect URIs: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
5. Save

## Step 2: Setup Database Tables

### Opsi A: Menggunakan SQL Editor (Recommended)

1. Buka Supabase Dashboard → **SQL Editor**
2. Klik **New Query**
3. Copy seluruh isi file `SUPABASE_SETUP.sql`
4. Paste ke SQL Editor
5. Klik **Run** (atau tekan Ctrl/Cmd + Enter)
6. Tunggu sampai selesai (harusnya muncul "Success. No rows returned")

### Opsi B: Menggunakan Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref [YOUR-PROJECT-REF]

# Run migration
supabase db push
```

## Step 3: Verify Setup

### Cek Tables

Jalankan query ini di SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Harusnya muncul:
- `entries`
- `rules`

### Cek RLS Policies

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

Harusnya ada 8 policies (4 untuk entries, 4 untuk rules)

### Cek Indexes

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';
```

Harusnya ada:
- `idx_entries_owner_date`
- `idx_entries_owner_updated`
- `idx_rules_owner`

## Step 4: Setup Environment Variables

Update file `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

Dapatkan dari: Supabase Dashboard → Settings → API

## Step 5: Test Connection

1. Jalankan app: `npm run dev`
2. Buka browser console
3. Test query:

```javascript
// Di browser console
const { data, error } = await supabase
  .from('entries')
  .select('*')
  .limit(1);

console.log('Test query:', { data, error });
```

Jika berhasil, harusnya return `data: []` (empty array, karena belum ada data)

## Troubleshooting

### Error: "relation 'entries' does not exist"

**Solusi**: Tables belum dibuat. Ulangi Step 2.

### Error: "new row violates row-level security policy"

**Solusi**: RLS policies belum dibuat atau user belum login. Pastikan:
1. RLS policies sudah dibuat (Step 2)
2. User sudah login dengan Google OAuth

### Error: "permission denied for table entries"

**Solusi**: RLS belum enable atau policies salah. Jalankan:

```sql
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
```

### Error: "JWT expired" atau "Invalid JWT"

**Solusi**: Session expired. Logout dan login lagi.

## Database Schema Overview

### Table: entries

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (client-generated) |
| owner_id | UUID | Foreign key ke auth.users |
| text | TEXT | Deskripsi transaksi |
| amount | INTEGER | Jumlah (dalam satuan terkecil) |
| raw_input | TEXT | Input asli user (optional) |
| date | DATE | Tanggal transaksi |
| category | TEXT | Kategori (Makanan, Transport, dll) |
| source | TEXT | Sumber input (quick_add, bulk_paste, scan_receipt) |
| payment_method | TEXT | Metode pembayaran (optional) |
| parse_warnings | JSONB | Warning dari parser (optional) |
| split | JSONB | Data split bill (optional) |
| created_at | TIMESTAMPTZ | Timestamp dibuat |
| updated_at | TIMESTAMPTZ | Timestamp terakhir diupdate (auto) |

### Table: rules

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| owner_id | UUID | Foreign key ke auth.users |
| pattern | TEXT | Pattern untuk matching |
| match | TEXT | Match type (contains, equals) |
| category | TEXT | Kategori target |
| created_at | TIMESTAMPTZ | Timestamp dibuat |
| updated_at | TIMESTAMPTZ | Timestamp terakhir diupdate (auto) |

## Security Features

### Row Level Security (RLS)

Setiap user hanya bisa:
- **SELECT**: Lihat data milik sendiri
- **INSERT**: Tambah data dengan owner_id sendiri
- **UPDATE**: Update data milik sendiri
- **DELETE**: Hapus data milik sendiri

RLS di-enforce di database level, jadi aman dari:
- Direct API access
- SQL injection
- Client-side manipulation

### Automatic Timestamps

- `created_at`: Auto-set saat INSERT
- `updated_at`: Auto-update saat UPDATE (via trigger)

Server timestamp digunakan untuk conflict resolution (Last-Write-Wins)

## Next Steps

Setelah setup selesai:
1. ✅ Test login dengan Google OAuth
2. ✅ Test migrasi data lokal ke server
3. ✅ Test sync dari server ke lokal
4. 🔄 Lanjut ke Phase 2.2: Sync Queue Implementation

## Support

Jika ada masalah:
1. Check Supabase Dashboard → Logs
2. Check browser console untuk error
3. Check network tab untuk failed requests
4. Verify RLS policies dengan query di atas
