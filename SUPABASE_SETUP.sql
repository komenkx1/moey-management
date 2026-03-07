-- ============================================
-- KEMANA APP - SUPABASE DATABASE SETUP
-- ============================================
-- Copy dan paste script ini ke Supabase SQL Editor
-- Dashboard > SQL Editor > New Query
-- ============================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create entries table
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  raw_input TEXT,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'quick_add',
  payment_method TEXT,
  parse_warnings JSONB,
  split JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create rules table
CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  match TEXT NOT NULL CHECK (match IN ('contains', 'equals')),
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, pattern, match)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_entries_owner_date ON entries(owner_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_entries_owner_updated ON entries(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rules_owner ON rules(owner_id);

-- 5. Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers
DROP TRIGGER IF EXISTS update_entries_updated_at ON entries;
CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rules_updated_at ON rules;
CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- 8. Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own entries" ON entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON entries;
DROP POLICY IF EXISTS "Users can update own entries" ON entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON entries;
DROP POLICY IF EXISTS "Users can view own rules" ON rules;
DROP POLICY IF EXISTS "Users can insert own rules" ON rules;
DROP POLICY IF EXISTS "Users can update own rules" ON rules;
DROP POLICY IF EXISTS "Users can delete own rules" ON rules;

-- 9. Create RLS Policies for entries
CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (auth.uid() = owner_id);

-- 10. Create RLS Policies for rules
CREATE POLICY "Users can view own rules"
  ON rules FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own rules"
  ON rules FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own rules"
  ON rules FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own rules"
  ON rules FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Verify tables created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public';
-- ============================================
