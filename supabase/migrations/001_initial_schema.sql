-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Entries table
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

-- Rules table
CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  match TEXT NOT NULL CHECK (match IN ('contains', 'equals')),
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, pattern, match)
);

-- Indexes for performance
CREATE INDEX idx_entries_owner_date ON entries(owner_id, date DESC);
CREATE INDEX idx_entries_owner_updated ON entries(owner_id, updated_at DESC);
CREATE INDEX idx_rules_owner ON rules(owner_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for entries
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

-- RLS Policies for rules
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
