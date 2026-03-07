# Database Migration Workflow

## ✅ Setup Complete!

Database sudah ter-setup dengan Supabase CLI. Sekarang kamu bisa manage migrations dari terminal.

## Workflow untuk Perubahan Database

### 1. Buat Migration Baru

```bash
# Buat file migration baru
npx supabase migration new nama_perubahan

# Contoh:
npx supabase migration new add_sync_queue_table
```

Ini akan create file baru di `supabase/migrations/` dengan timestamp.

### 2. Edit Migration File

Edit file yang baru dibuat di `supabase/migrations/`:

```sql
-- Contoh: Add sync_queue table
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_owner_status ON sync_queue(owner_id, status);
```

### 3. Push ke Supabase

```bash
# Push migration ke remote database
npx supabase db push

# Atau pakai script
./scripts/push-db.sh
```

### 4. Verify

Check di Supabase Dashboard → Table Editor untuk verify table baru.

## Commands Berguna

### Push Migrations
```bash
npx supabase db push
```

### Pull Schema dari Remote
```bash
npx supabase db pull
```

### Reset Local Database (Development)
```bash
npx supabase db reset
```

### Generate Types (TypeScript)
```bash
npx supabase gen types typescript --local > types/supabase.ts
```

## File Structure

```
project/
├── supabase/
│   ├── config.toml              # Supabase config
│   └── migrations/              # Migration files
│       ├── 001_initial_schema.sql
│       └── 002_next_migration.sql
└── scripts/
    └── push-db.sh              # Helper script
```

## Best Practices

### 1. Always Use Migrations
Jangan edit database manual di dashboard. Selalu buat migration file.

### 2. Descriptive Names
```bash
# Good
npx supabase migration new add_sync_queue_table
npx supabase migration new add_user_preferences

# Bad
npx supabase migration new update
npx supabase migration new fix
```

### 3. Test Locally First (Optional)
Jika pakai Docker, bisa test migration locally:
```bash
npx supabase start
npx supabase db reset
```

### 4. Idempotent Migrations
Selalu gunakan `IF NOT EXISTS` atau `IF EXISTS`:
```sql
CREATE TABLE IF NOT EXISTS ...
DROP TABLE IF EXISTS ...
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
```

### 5. Rollback Strategy
Jika migration error, buat migration baru untuk rollback:
```bash
npx supabase migration new rollback_sync_queue
```

## Common Patterns

### Add New Table
```sql
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own data"
  ON table_name FOR ALL
  USING (auth.uid() = owner_id);

-- Index
CREATE INDEX idx_table_owner ON table_name(owner_id);
```

### Add Column
```sql
ALTER TABLE entries 
ADD COLUMN IF NOT EXISTS new_column TEXT;
```

### Add Index
```sql
CREATE INDEX IF NOT EXISTS idx_name 
ON table_name(column_name);
```

### Modify RLS Policy
```sql
-- Drop old
DROP POLICY IF EXISTS "old_policy_name" ON table_name;

-- Create new
CREATE POLICY "new_policy_name"
  ON table_name FOR SELECT
  USING (auth.uid() = owner_id);
```

## Troubleshooting

### Error: "function uuid_generate_v4() does not exist"
**Fix**: Use `gen_random_uuid()` instead (built-in Postgres 13+)

### Error: "relation already exists"
**Fix**: Add `IF NOT EXISTS` to CREATE statements

### Error: "Cannot connect to Docker daemon"
**Fix**: Ignore if only using remote database. Docker only needed for local dev.

### Error: "Need to install supabase package"
**Fix**: Just press Y, npx will auto-install

## Next Steps

Sekarang kamu bisa:
1. ✅ Buat migration baru dengan `npx supabase migration new`
2. ✅ Edit SQL file di `supabase/migrations/`
3. ✅ Push dengan `npx supabase db push`
4. ✅ No need to open dashboard untuk setiap perubahan!

Untuk Phase 2.2, kamu akan buat migration untuk `sync_queue` table.
