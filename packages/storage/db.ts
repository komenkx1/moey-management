// @ts-ignore
import Dexie, { type Table } from "dexie";
import type { CategoryRule, CategoryRules, Entry } from "../core/types";

export interface KemanaMeta {
    key: string;
    value: string;
}

export class KemanaDB extends Dexie {
    entries!: Table<Entry, string>;
    rules!: Table<CategoryRule, string>;
    meta!: Table<KemanaMeta, string>;

    constructor() {
        super("kemana");
        // @ts-ignore
        this.version(1).stores({
            entries: "id, date, category, createdAt",
            rules: "pattern",
            meta: "key"
        });
    }
}

export const db = new KemanaDB();

export async function initDatabase(): Promise<void> {
    // Dexie initializes automatically and declarative schemas are created on first open
    // So this is a no-op for the web platform, but satisfies the universal interface
    return Promise.resolve();
}

export async function loadEntries(): Promise<Entry[]> {
    try {
        const rows = await db.entries.toArray();
        return rows;
    } catch {
        return [];
    }
}

export async function saveEntries(entries: Entry[]): Promise<void> {
    try {
        // @ts-ignore
        await db.transaction("rw", db.entries, async () => {
            await db.entries.clear();
            await db.entries.bulkPut(entries);
        });
    } catch {
        // Ignore write failures to avoid crashing UI.
    }
}

export async function loadRules(): Promise<CategoryRules> {
    try {
        const rows = await db.rules.toArray();
        return rows;
    } catch {
        return [];
    }
}

export async function saveRules(rules: CategoryRules): Promise<void> {
    try {
        // @ts-ignore
        await db.transaction("rw", db.rules, async () => {
            await db.rules.clear();
            await db.rules.bulkPut(rules);
        });
    } catch {
        // Ignore write failures to avoid crashing UI.
    }
}
