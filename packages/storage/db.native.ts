// @ts-ignore
import * as SQLite from 'expo-sqlite';
import type { Entry, CategoryRules } from '@kemana/core/types';

const dbRaw = SQLite.openDatabaseSync('kemana.db');

export function initDatabase() {
    dbRaw.execSync(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      amount INTEGER NOT NULL,
      raw_input TEXT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT NOT NULL,
      payment_method TEXT,
      parse_warnings TEXT,
      split TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date DESC);
    CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at DESC);
    
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL,
      match TEXT NOT NULL,
      category TEXT NOT NULL,
      UNIQUE(pattern, match)
    );
    
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export async function loadEntries(): Promise<Entry[]> {
    try {
        const result = dbRaw.getAllSync<any>('SELECT * FROM entries ORDER BY created_at DESC');
        return result.map((row: any) => ({
            id: row.id,
            text: row.text,
            amount: row.amount,
            rawInput: row.raw_input || undefined,
            date: row.date,
            category: row.category,
            source: row.source,
            paymentMethod: row.payment_method || undefined,
            parseWarnings: row.parse_warnings ? JSON.parse(row.parse_warnings) : undefined,
            split: row.split ? JSON.parse(row.split) : undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    } catch {
        return [];
    }
}

export async function saveEntries(entries: Entry[]): Promise<void> {
    try {
        dbRaw.withTransactionSync(() => {
            dbRaw.runSync('DELETE FROM entries');

            const stmt = dbRaw.prepareSync(`
        INSERT INTO entries (
          id, text, amount, raw_input, date, category, source,
          payment_method, parse_warnings, split, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            for (const entry of entries) {
                stmt.executeSync([
                    entry.id,
                    entry.text,
                    entry.amount,
                    entry.rawInput || null,
                    entry.date,
                    entry.category,
                    entry.source,
                    entry.paymentMethod || null,
                    entry.parseWarnings ? JSON.stringify(entry.parseWarnings) : null,
                    entry.split ? JSON.stringify(entry.split) : null,
                    entry.createdAt,
                    entry.updatedAt
                ]);
            }

            stmt.finalizeSync();
        });
    } catch {
        // Ignore write failures to match dexie behavior
    }
}

export async function loadRules(): Promise<CategoryRules> {
    try {
        const result = dbRaw.getAllSync<any>('SELECT * FROM rules');
        return result.map((row: any) => ({
            pattern: row.pattern,
            match: row.match,
            category: row.category,
        }));
    } catch {
        return [];
    }
}

export async function saveRules(rules: CategoryRules): Promise<void> {
    try {
        dbRaw.withTransactionSync(() => {
            dbRaw.runSync('DELETE FROM rules');

            const stmt = dbRaw.prepareSync(`
        INSERT INTO rules (pattern, match, category) VALUES (?, ?, ?)
      `);

            for (const rule of rules) {
                stmt.executeSync([rule.pattern, rule.match, rule.category]);
            }

            stmt.finalizeSync();
        });
    } catch {
        // Ignore write failures
    }
}

export { initDatabase as db };
