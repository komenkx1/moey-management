-- Change ID columns from UUID to TEXT to support custom ID format
-- This allows us to use custom IDs like "tmm..." instead of UUIDs

-- 1. Drop foreign key constraints and indexes that depend on ID
DROP INDEX IF EXISTS idx_entries_owner_date;
DROP INDEX IF EXISTS idx_entries_owner_updated;

-- 2. Alter entries table - change id from UUID to TEXT
ALTER TABLE entries ALTER COLUMN id TYPE TEXT;

-- 3. Recreate indexes
CREATE INDEX idx_entries_owner_date ON entries(owner_id, date DESC);
CREATE INDEX idx_entries_owner_updated ON entries(owner_id, updated_at DESC);

-- 4. Alter rules table - change id from UUID to TEXT  
ALTER TABLE rules ALTER COLUMN id TYPE TEXT;
ALTER TABLE rules ALTER COLUMN id SET DEFAULT ('rule_' || substr(md5(random()::text), 1, 16));
