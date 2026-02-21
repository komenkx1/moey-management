import type { CategoryRules, Entry } from "../core/types";
import { db } from "./db";

const MIGRATION_DONE_KEY = "kemana.migrated.dexie.v1";
const ENTRIES_KEY = "kemana.entries.v1";
const RULES_KEY = "kemana.rules.v1";
const RECOVERY_COUNT_KEY = "kemana.recoveryCount";
const LAST_RECOVERY_AT_KEY = "kemana.lastRecoveryAt";
const LAST_ENTRY_AT_KEY = "kemana.lastEntryAt";
const NIGHT_CLOSE_CLOSED_AT_KEY = "kemana.nightCloseClosedAt";

export async function migrateFromLocalStorage(): Promise<{
    migrated: boolean;
    entriesCount: number;
    rulesCount: number;
}> {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
        return { migrated: false, entriesCount: 0, rulesCount: 0 };
    }

    const isMigrated = localStorage.getItem(MIGRATION_DONE_KEY);
    if (isMigrated === "true") {
        return { migrated: false, entriesCount: 0, rulesCount: 0 };
    }

    let entries: Entry[] = [];
    try {
        const rawEntries = localStorage.getItem(ENTRIES_KEY);
        if (rawEntries) {
            entries = JSON.parse(rawEntries);
        }
    } catch {
        // Keep empty
    }

    let rules: CategoryRules = [];
    try {
        const rawRules = localStorage.getItem(RULES_KEY);
        if (rawRules) {
            rules = JSON.parse(rawRules);
        }
    } catch {
        // Keep empty
    }

    const recoveryCount = localStorage.getItem(RECOVERY_COUNT_KEY);
    const lastRecoveryAt = localStorage.getItem(LAST_RECOVERY_AT_KEY);
    const lastEntryAt = localStorage.getItem(LAST_ENTRY_AT_KEY);
    const nightCloseClosedAt = localStorage.getItem(NIGHT_CLOSE_CLOSED_AT_KEY);

    try {
        await db.transaction("rw", db.entries, db.rules, db.meta, async () => {
            if (entries.length > 0) {
                await db.entries.bulkPut(entries);
            }

            if (rules.length > 0) {
                await db.rules.bulkPut(rules);
            }

            const metaUpdates = [];
            if (recoveryCount) metaUpdates.push({ key: RECOVERY_COUNT_KEY, value: recoveryCount });
            if (lastRecoveryAt) metaUpdates.push({ key: LAST_RECOVERY_AT_KEY, value: lastRecoveryAt });
            if (lastEntryAt) metaUpdates.push({ key: LAST_ENTRY_AT_KEY, value: lastEntryAt });
            if (nightCloseClosedAt) metaUpdates.push({ key: NIGHT_CLOSE_CLOSED_AT_KEY, value: nightCloseClosedAt });

            if (metaUpdates.length > 0) {
                await db.meta.bulkPut(metaUpdates);
            }
        });

        localStorage.setItem(MIGRATION_DONE_KEY, "true");

        return {
            migrated: true,
            entriesCount: entries.length,
            rulesCount: rules.length
        };
    } catch {
        console.error("Failed to migrate data from localStorage to Dexie.");
        return { migrated: false, entriesCount: 0, rulesCount: 0 };
    }
}
