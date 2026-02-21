import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { migrateFromLocalStorage, db, loadEntries, loadRules } from "@kemana/storage";
import type { Entry, CategoryRules } from "@kemana/core/types";

describe("migrateFromLocalStorage", () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(async () => {
        // Clear dexie
        await db.entries.clear();
        await db.rules.clear();
        await db.meta.clear();

        // Mock localStorage
        mockStorage = {};
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key: string) => mockStorage[key] || null),
            setItem: vi.fn((key: string, value: string) => {
                mockStorage[key] = value;
            }),
            removeItem: vi.fn((key: string) => {
                delete mockStorage[key];
            })
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("Skips migration if marker already set", async () => {
        mockStorage["kemana.migrated.dexie.v1"] = "true";
        mockStorage["kemana.entries.v1"] = JSON.stringify([{ id: "test", date: "2026-02-20", amount: 10000, text: "kopi" }]);

        await migrateFromLocalStorage();

        const entries = await loadEntries();
        expect(entries).toHaveLength(0); // Did not migrate because marker existed
    });

    it("Migrates valid entries and sets marker", async () => {
        const legacyEntries: Partial<Entry>[] = [
            { id: "1", date: "2026-02-20", amount: 10000, text: "kopi", category: "Makan", createdAt: "2026-02-20T10:00:00Z", updatedAt: "2026-02-20T10:00:00Z" },
            { id: "2", date: "2026-02-21", amount: 15000, text: "teh", category: "Makan", createdAt: "2026-02-21T10:00:00Z", updatedAt: "2026-02-21T10:00:00Z" }
        ];

        mockStorage["kemana.entries.v1"] = JSON.stringify(legacyEntries);

        await migrateFromLocalStorage();

        const entries = await loadEntries();
        expect(entries).toHaveLength(2);
        expect(mockStorage["kemana.migrated.dexie.v1"]).toBe("true");
    });

    it("Filters out totally corrupted entries during migration", async () => {
        const mixedEntries = [
            { id: "1", date: "2026-02-20", amount: 10000, text: "kopi", category: "Makan", createdAt: "2026", updatedAt: "2026" },
            { missing_fields_completely: true },
            { id: "2", amount: "string_instead_of_number", text: "x", category: "Makan", date: "2026-02-20", createdAt: "2026", updatedAt: "2026" }
        ];
        mockStorage["kemana.entries.v1"] = JSON.stringify(mixedEntries);

        await migrateFromLocalStorage();

        const entries = await loadEntries();
        expect(entries).toHaveLength(1); // Only the valid one should migrate
        expect(entries[0].id).toBe("1");
    });

    it("Migrates habits meta correctly", async () => {
        // The script uses night_close_marker_...
        const key = "kemana.nightCloseClosedAt";
        mockStorage[key] = "true";

        await migrateFromLocalStorage();

        const meta = await db.meta.where("key").equals(key).first();
        expect(meta?.value).toBe("true");
    });
});
