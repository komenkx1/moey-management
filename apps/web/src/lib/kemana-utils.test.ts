import { describe, expect, it } from "vitest";
import {
    DateFilterPreset,
    extractSummedAmountMeta,
    formatDayLabel,
    formatItemPillText,
    getFilteredEntries,
    getSmartEmptyState,
    getSpendingStatus,
    getSummaryStats,
    groupEntriesByDate,
    includesDateInFilter,
    parseDateKey,
    parseItemBreakdownFromSubtitle,
    splitDisplayText,
    sumAmount,
    toDateKey
} from "./kemana-utils";
import type { Entry, ParseWarning } from "@kemana/core/types";

function makeEntry(overrides?: Partial<Entry>): Entry {
    const fallbackIso = new Date("2026-02-20T10:00:00.000Z").toISOString();
    return {
        id: "test",
        text: "test",
        amount: 10000,
        date: "2026-02-20",
        category: "Makan",
        source: "quick_add",
        createdAt: fallbackIso,
        updatedAt: fallbackIso,
        ...overrides
    };
}

describe("Date Utilities", () => {
    it("toDateKey formats correctly", () => {
        expect(toDateKey(new Date("2026-02-05T10:00:00Z"))).toBe("2026-02-05");
    });

    it("parseDateKey parses valid strings", () => {
        const date = parseDateKey("2026-02-05");
        expect(date).not.toBeNull();
        expect(date?.getFullYear()).toBe(2026);
        expect(date?.getMonth()).toBe(1); // Feb
        expect(date?.getDate()).toBe(5);
    });

    it("parseDateKey handles invalid strings", () => {
        expect(parseDateKey("2026-xx-yy")).toBeNull();
    });

    it("formatDayLabel outputs relative text", () => {
        const now = new Date("2026-02-20T10:00:00Z");
        expect(formatDayLabel("2026-02-20", now)).toBe("Hari ini");
        expect(formatDayLabel("2026-02-19", now)).toBe("Kemarin");

        // Use localized output fallback
        const formatted = formatDayLabel("2026-02-15", now);
        expect(formatted).toContain("Min");
    });
});

describe("groupEntriesByDate", () => {
    it("groups correctly ordered by newest first", () => {
        const entries = [
            makeEntry({ date: "2026-02-20", amount: 100 }),
            makeEntry({ date: "2026-02-18", amount: 200 }),
            makeEntry({ date: "2026-02-20", amount: 300 })
        ];

        const { dates, groups } = groupEntriesByDate(entries);

        expect(dates).toEqual(["2026-02-20", "2026-02-18"]);
        expect(groups["2026-02-20"]).toHaveLength(2);
        expect(groups["2026-02-18"]).toHaveLength(1);
    });
});

describe("Filtering", () => {
    const now = new Date("2026-02-20T10:00:00.000Z");
    const entries = [
        makeEntry({ id: "1", date: "2026-02-20" }), // Today
        makeEntry({ id: "2", date: "2026-02-18" }), // 2 days ago
        makeEntry({ id: "3", date: "2026-02-10" }), // 10 days ago
        makeEntry({ id: "4", date: "2026-01-01" })  // Way back
    ];

    it("filters 'today'", () => {
        const res = getFilteredEntries(entries, "today", now);
        expect(res.map(e => e.id)).toEqual(["1"]);
    });

    it("filters '7d'", () => {
        const res = getFilteredEntries(entries, "7d", now);
        expect(res.map(e => e.id)).toEqual(["1", "2"]);
    });

    it("filters '30d'", () => {
        const res = getFilteredEntries(entries, "30d", now);
        expect(res.map(e => e.id)).toEqual(["1", "2", "3"]);
    });

    it("filters 'all'", () => {
        const res = getFilteredEntries(entries, "all", now);
        expect(res.map(e => e.id)).toEqual(["1", "2", "3", "4"]);
    });
});

describe("getSummaryStats", () => {
    const now = new Date("2026-02-20T10:00:00.000Z");

    it("calculates summary correctly with data", () => {
        const entries = [
            makeEntry({ date: "2026-02-20", amount: 150000, category: "Makan" }),
            makeEntry({ date: "2026-02-20", amount: 50000, category: "Transport" })
        ];

        const stats = getSummaryStats({
            allEntries: entries,
            filteredEntries: entries,
            preset: "today",
            now
        });

        expect(stats.totalAmount).toBe(200000);
        expect(stats.entryCount).toBe(2);
        expect(stats.topCategory?.category).toBe("Makan");
        expect(stats.topCategory?.totalAmount).toBe(150000);
    });

    it("provides smart empty state when there are no entries", () => {
        const stats = getSummaryStats({
            allEntries: [],
            filteredEntries: [],
            preset: "today",
            now
        });

        expect(stats.totalAmount).toBe(0);
        expect(stats.emptyState).not.toBeNull();
        expect(stats.emptyState?.title).toContain("Catat pengeluaran");
    });
});

describe("getSpendingStatus", () => {
    it("returns 'hemat' when todayTotal is far below average", () => {
        const status = getSpendingStatus({ todayTotal: 20000, sevenDayAverage: 100000, trackedDays: 7 });
        expect(status.tone).toBe("aman");
    });

    it("returns 'boros' when todayTotal is significantly above average", () => {
        const status = getSpendingStatus({ todayTotal: 250000, sevenDayAverage: 50000, trackedDays: 7 });
        expect(status.tone).toBe("lumayan");
    });

    it("returns 'aman' or 'normal' as default when new", () => {
        const status = getSpendingStatus({ todayTotal: 50000, sevenDayAverage: 0, trackedDays: 0 });
        expect(["aman", "normal"]).toContain(status.tone);
    });
});

describe("Text Parsing Helpers", () => {
    it("splitDisplayText isolates title and subtitle", () => {
        expect(splitDisplayText("kopi - nasi")).toEqual({ title: "kopi", subtitle: "nasi" });
        expect(splitDisplayText("mcdonalds")).toEqual({ title: "mcdonalds", subtitle: undefined });
    });

    it("extractSummedAmountMeta from warnings", () => {
        const warnings: ParseWarning[] = [{ code: "AMOUNT_SUMMED", message: "Summed: 50 + 20", meta: { parts: 2, total: 70000 } }];
        expect(extractSummedAmountMeta(warnings)).toEqual({ parts: 2, total: 70000 });
        expect(extractSummedAmountMeta([])).toBeNull();
    });

    it("parseItemBreakdownFromSubtitle handles lines", () => {
        const subtitle = "kopi 15k, 2x roti 10k";
        const breakdown = parseItemBreakdownFromSubtitle(subtitle);
        expect(breakdown).toHaveLength(2);
        if (breakdown) {
            expect(breakdown[0].label).toContain("kopi");
            expect(breakdown[0].amount).toBe(15000);

            expect(breakdown[1].label).toContain("roti");
            expect(breakdown[1].qty).toBe(2);
            expect(breakdown[1].amount).toBe(10000);
        }
    });

    it("formatItemPillText combines labels nicely", () => {
        expect(formatItemPillText({ label: "roti", raw: "" })).toBe("roti");
        expect(formatItemPillText({ label: "roti", qty: 2, raw: "" })).toBe("roti ×2");
        expect(formatItemPillText({ label: "roti", amount: 15000, raw: "" })).toBe("roti • Rp15k");
        expect(formatItemPillText({ label: "roti", qty: 2, amount: 15000, raw: "" })).toBe("roti ×2 • Rp15k");
    });
});
