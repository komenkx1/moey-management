import { describe, it, expect } from "vitest";
import {
    getTrendGranularity,
    getTrendTitle,
    getTrendSubtitle,
    generateTrendSeries
} from "../kemana-utils";
import type { Entry } from "@kemana/core/types";

describe("Trend Chart Utils", () => {
    const baseNow = new Date("2026-02-18T12:00:00Z");

    it("should determine hour granularity for today", () => {
        expect(getTrendGranularity("today", null, baseNow)).toBe("hour");
    });

    it("should determine day granularity for 7d", () => {
        expect(getTrendGranularity("7d", null, baseNow)).toBe("day");
    });

    it("should determine week granularity for 30d", () => {
        expect(getTrendGranularity("30d", null, baseNow)).toBe("week");
    });

    it("should determine month granularity for all", () => {
        expect(getTrendGranularity("all", null, baseNow)).toBe("month");
    });

    it("should return correct subtitles", () => {
        expect(getTrendSubtitle("hour")).toBe("Biar kelihatan jam paling sering keluar uang.");
        expect(getTrendSubtitle("week")).toBe("Lihat naik-turun dari pekan ke pekan.");
    });

    it("should output correct titles based on granularity", () => {
        expect(getTrendTitle("today", "hour", null, baseNow)).toBe("Ritme pengeluaran hari ini");
        expect(getTrendTitle("7d", "day", null, baseNow)).toBe("Ritme 7 hari terakhir");
    });

    it("should generate buckets correctly for week (30d)", () => {
        const entries: Entry[] = [];
        const buckets = generateTrendSeries(entries, "30d", null, baseNow);
        expect(buckets).toHaveLength(5); // 30 / 7 is ~ 4.2 weeks -> 5 buckets
        expect(buckets[buckets.length - 1].label).toBe("Pekan ini");
        expect(buckets[buckets.length - 2].label).toBe("Pekan lalu");
    });

    it("maps local hour into Pagi/Siang/Sore/Malam correctly", () => {
        const entries: Entry[] = [
            {
                id: "pagi",
                text: "sarapan",
                amount: 10000,
                date: "2026-02-18",
                category: "Makan",
                source: "quick_add",
                createdAt: "2026-02-18T08:00:00",
                updatedAt: "2026-02-18T08:00:00"
            },
            {
                id: "siang",
                text: "makan siang",
                amount: 20000,
                date: "2026-02-18",
                category: "Makan",
                source: "quick_add",
                createdAt: "2026-02-18T12:30:00",
                updatedAt: "2026-02-18T12:30:00"
            },
            {
                id: "sore",
                text: "ngopi",
                amount: 30000,
                date: "2026-02-18",
                category: "Makan",
                source: "quick_add",
                createdAt: "2026-02-18T16:00:00",
                updatedAt: "2026-02-18T16:00:00"
            },
            {
                id: "malam",
                text: "snack",
                amount: 40000,
                date: "2026-02-18",
                category: "Makan",
                source: "quick_add",
                createdAt: "2026-02-18T22:00:00",
                updatedAt: "2026-02-18T22:00:00"
            }
        ];

        const buckets = generateTrendSeries(entries, "today", null, new Date("2026-02-18T23:00:00"));
        expect(buckets).toHaveLength(4);
        expect(buckets[0]).toEqual({ label: "Pagi", total: 10000 });
        expect(buckets[1]).toEqual({ label: "Siang", total: 20000 });
        expect(buckets[2]).toEqual({ label: "Sore", total: 30000 });
        expect(buckets[3]).toEqual({ label: "Malam", total: 40000 });
    });

    it("does not leak non-today entries into today rhythm buckets", () => {
        const entries: Entry[] = [
            {
                id: "old-malam",
                text: "nonton",
                amount: 30000,
                date: "2026-02-17",
                category: "Hiburan",
                source: "quick_add",
                createdAt: "2026-02-17T21:00:00",
                updatedAt: "2026-02-17T21:00:00"
            }
        ];

        const buckets = generateTrendSeries(entries, "today", null, new Date("2026-02-18T11:25:00"));
        expect(buckets).toEqual([
            { label: "Pagi", total: 0 },
            { label: "Siang", total: 0 },
            { label: "Sore", total: 0 },
            { label: "Malam", total: 0 }
        ]);
    });
});
