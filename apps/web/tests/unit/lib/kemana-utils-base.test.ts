import { describe, it, expect } from "vitest";
import {
  toDateKey,
  offsetDate,
  parseDateKey,
  normalizeDateInput,
  getDefaultCustomDateRange,
  normalizeCustomDateRange,
  getCustomRangeDayCount,
  sanitizeCurrencyInput,
  parseCurrencyInputToNumber,
  formatCurrencyInputDisplay,
  sumAmount,
  toDayStartTimestamp,
  formatDayLabel,
  groupEntriesByDate,
  getFilteredEntries,
  includesDateInFilter,
  getBestFilterForDate,
  getFilterLabel,
  getSpendingStatus,
  getTopCategory,
  getTopCategoryBreakdown,
  getSmartEmptyState,
  getSummaryStats,
  type DateFilterPreset,
  type CustomDateRange
} from "../../../src/lib/kemana-utils/base";
import type { Entry, Category } from "@kemana/core/types";

// Helper to create test entries with proper types
const createTestEntry = (overrides: Partial<Entry> & { id: string; amount: number; date: string; text: string; category: Category }): Entry => ({
  source: "test",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

describe("base utils", () => {
  describe("toDateKey", () => {
    it("should format date to YYYY-MM-DD", () => {
      expect(toDateKey(new Date(2024, 0, 15))).toBe("2024-01-15");
      expect(toDateKey(new Date(2024, 11, 31))).toBe("2024-12-31");
    });

    it("should pad single digit months and days", () => {
      expect(toDateKey(new Date(2024, 0, 1))).toBe("2024-01-01");
      expect(toDateKey(new Date(2024, 9, 5))).toBe("2024-10-05");
    });
  });

  describe("offsetDate", () => {
    it("should add days to date", () => {
      const base = new Date(2024, 0, 15);
      expect(offsetDate(base, 5)).toEqual(new Date(2024, 0, 20));
    });

    it("should subtract days when negative", () => {
      const base = new Date(2024, 0, 15);
      expect(offsetDate(base, -5)).toEqual(new Date(2024, 0, 10));
    });
  });

  describe("parseDateKey", () => {
    it("should parse valid date key", () => {
      const result = parseDateKey("2024-01-15");
      expect(result).toEqual(new Date(2024, 0, 15));
    });

    it("should return null for invalid format", () => {
      expect(parseDateKey("invalid")).toBeNull();
      expect(parseDateKey("2024/01/15")).toBeNull();
      expect(parseDateKey("15-01-2024")).toBeNull();
    });

    it("should return null for invalid dates", () => {
      expect(parseDateKey("2024-13-15")).toBeNull();
      expect(parseDateKey("2024-01-32")).toBeNull();
    });
  });

  describe("normalizeDateInput", () => {
    it("should return valid date key as-is", () => {
      expect(normalizeDateInput("2024-01-15")).toBe("2024-01-15");
    });

    it("should parse natural language dates", () => {
      const result = normalizeDateInput("January 15, 2024");
      expect(result).toBe("2024-01-15");
    });

    it("should return null for invalid input", () => {
      expect(normalizeDateInput("not a date")).toBeNull();
    });
  });

  describe("getDefaultCustomDateRange", () => {
    it("should return 7-day range ending today", () => {
      const now = new Date(2024, 0, 15);
      const result = getDefaultCustomDateRange(now);
      
      expect(result.start).toBe("2024-01-09");
      expect(result.end).toBe("2024-01-15");
    });
  });

  describe("normalizeCustomDateRange", () => {
    it("should return valid range as-is", () => {
      const range: CustomDateRange = { start: "2024-01-01", end: "2024-01-15" };
      const result = normalizeCustomDateRange(range, new Date(2024, 0, 15));
      
      expect(result).toEqual(range);
    });

    it("should swap dates if start > end", () => {
      const range: CustomDateRange = { start: "2024-01-15", end: "2024-01-01" };
      const result = normalizeCustomDateRange(range, new Date(2024, 0, 15));
      
      expect(result.start).toBe("2024-01-01");
      expect(result.end).toBe("2024-01-15");
    });

    it("should return default range for null input", () => {
      const result = normalizeCustomDateRange(null, new Date(2024, 0, 15));
      
      expect(result.start).toBe("2024-01-09");
      expect(result.end).toBe("2024-01-15");
    });
  });

  describe("getCustomRangeDayCount", () => {
    it("should calculate correct day count", () => {
      const range: CustomDateRange = { start: "2024-01-01", end: "2024-01-07" };
      expect(getCustomRangeDayCount(range)).toBe(7);
    });

    it("should return 1 for same day range", () => {
      const range: CustomDateRange = { start: "2024-01-01", end: "2024-01-01" };
      expect(getCustomRangeDayCount(range)).toBe(1);
    });
  });

  describe("sanitizeCurrencyInput", () => {
    it("should remove non-digit characters", () => {
      expect(sanitizeCurrencyInput("Rp 50.000")).toBe("50000");
      expect(sanitizeCurrencyInput("$1,234.56")).toBe("123456");
    });

    it("should handle empty string", () => {
      expect(sanitizeCurrencyInput("")).toBe("");
    });
  });

  describe("parseCurrencyInputToNumber", () => {
    it("should parse currency string to number", () => {
      expect(parseCurrencyInputToNumber("Rp 50.000")).toBe(50000);
      expect(parseCurrencyInputToNumber("100000")).toBe(100000);
    });

    it("should return 0 for empty input", () => {
      expect(parseCurrencyInputToNumber("")).toBe(0);
    });

    it("should return 0 for invalid input", () => {
      expect(parseCurrencyInputToNumber("abc")).toBe(0);
    });
  });

  describe("formatCurrencyInputDisplay", () => {
    it("should format number to IDR", () => {
      expect(formatCurrencyInputDisplay("50000")).toBe("50.000");
    });

    it("should return empty string for zero", () => {
      expect(formatCurrencyInputDisplay("0")).toBe("");
    });
  });

  describe("sumAmount", () => {
    it("should sum entry amounts", () => {
      const entries: Entry[] = [
        createTestEntry({ id: "1", amount: 50000, date: "2024-01-15", text: "Test", category: "Makan" }),
        createTestEntry({ id: "2", amount: 30000, date: "2024-01-15", text: "Test", category: "Makan" })
      ];
      expect(sumAmount(entries)).toBe(80000);
    });

    it("should return 0 for empty array", () => {
      expect(sumAmount([])).toBe(0);
    });
  });

  describe("toDayStartTimestamp", () => {
    it("should return timestamp at start of day", () => {
      const date = new Date(2024, 0, 15, 14, 30, 45);
      const result = toDayStartTimestamp(date);
      const expected = new Date(2024, 0, 15, 0, 0, 0).getTime();
      expect(result).toBe(expected);
    });
  });

  describe("formatDayLabel", () => {
    it("should return 'Hari ini' for today", () => {
      const today = new Date(2024, 0, 15);
      expect(formatDayLabel("2024-01-15", today)).toBe("Hari ini");
    });

    it("should return 'Kemarin' for yesterday", () => {
      const today = new Date(2024, 0, 15);
      expect(formatDayLabel("2024-01-14", today)).toBe("Kemarin");
    });

    it("should return weekday for recent dates", () => {
      const today = new Date(2024, 0, 15); // Monday
      expect(formatDayLabel("2024-01-14", today)).toBe("Kemarin");
    });
  });

  describe("groupEntriesByDate", () => {
    it("should group entries by date", () => {
      const entries: Entry[] = [
        createTestEntry({ id: "1", amount: 50000, date: "2024-01-15", text: "Test 1", category: "Makan", createdAt: "2024-01-15T10:00:00Z", updatedAt: "2024-01-15T10:00:00Z" }),
        createTestEntry({ id: "2", amount: 30000, date: "2024-01-15", text: "Test 2", category: "Makan", createdAt: "2024-01-15T11:00:00Z", updatedAt: "2024-01-15T11:00:00Z" }),
        createTestEntry({ id: "3", amount: 20000, date: "2024-01-14", text: "Test 3", category: "Makan", createdAt: "2024-01-14T10:00:00Z", updatedAt: "2024-01-14T10:00:00Z" })
      ];
      
      const result = groupEntriesByDate(entries);
      
      expect(result.dates).toEqual(["2024-01-15", "2024-01-14"]);
      expect(result.groups["2024-01-15"]).toHaveLength(2);
      expect(result.groups["2024-01-14"]).toHaveLength(1);
    });
  });

  describe("getFilteredEntries", () => {
    const entries: Entry[] = [
      createTestEntry({ id: "1", amount: 50000, date: "2024-01-15", text: "Today", category: "Makan" }),
      createTestEntry({ id: "2", amount: 30000, date: "2024-01-14", text: "Yesterday", category: "Makan" }),
      createTestEntry({ id: "3", amount: 20000, date: "2024-01-10", text: "Old", category: "Makan" })
    ];

    it("should filter by today", () => {
      const now = new Date(2024, 0, 15);
      const result = getFilteredEntries(entries, "today", now);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("should filter by 7d", () => {
      const now = new Date(2024, 0, 15);
      // 7d includes today (15th) and 6 days back (9th-14th)
      // So 2024-01-15, 2024-01-14, and 2024-01-10 should all be included
      const result = getFilteredEntries(entries, "7d", now);
      expect(result).toHaveLength(3);
    });

    it("should return all for 'all' preset", () => {
      const result = getFilteredEntries(entries, "all", new Date());
      expect(result).toHaveLength(3);
    });
  });

  describe("includesDateInFilter", () => {
    it("should return true for all preset", () => {
      expect(includesDateInFilter("2024-01-15", "all", new Date())).toBe(true);
    });

    it("should check today correctly", () => {
      const today = new Date(2024, 0, 15);
      expect(includesDateInFilter("2024-01-15", "today", today)).toBe(true);
      expect(includesDateInFilter("2024-01-14", "today", today)).toBe(false);
    });
  });

  describe("getBestFilterForDate", () => {
    it("should return today for current date", () => {
      const now = new Date(2024, 0, 15);
      expect(getBestFilterForDate("2024-01-15", now)).toBe("today");
    });

    it("should return 7d for recent dates", () => {
      const now = new Date(2024, 0, 15);
      expect(getBestFilterForDate("2024-01-10", now)).toBe("7d");
    });

    it("should return all for old dates", () => {
      const now = new Date(2024, 0, 15);
      expect(getBestFilterForDate("2023-01-15", now)).toBe("all");
    });
  });

  describe("getFilterLabel", () => {
    it("should return correct labels", () => {
      expect(getFilterLabel("today")).toBe("Hari ini");
      expect(getFilterLabel("7d")).toBe("7 hari terakhir");
      expect(getFilterLabel("30d")).toBe("30 hari terakhir");
      expect(getFilterLabel("all")).toBe("Semua data");
    });
  });

  describe("getSpendingStatus", () => {
    it("should return hemat for zero spending", () => {
      const result = getSpendingStatus({ todayTotal: 0, sevenDayAverage: 100000, trackedDays: 10 });
      expect(result.tone).toBe("hemat");
    });

    it("should return normal for average spending", () => {
      const result = getSpendingStatus({ todayTotal: 100000, sevenDayAverage: 100000, trackedDays: 30 });
      expect(result.tone).toBe("normal");
    });

    it("should handle low data days", () => {
      const result = getSpendingStatus({ todayTotal: 50000, sevenDayAverage: 100000, trackedDays: 2 });
      expect(result.tone).toBe("normal");
    });
  });

  describe("getTopCategory", () => {
    it("should return top category by amount", () => {
      const entries: Entry[] = [
        createTestEntry({ id: "1", amount: 50000, date: "2024-01-15", text: "Makanan", category: "Makan" }),
        createTestEntry({ id: "2", amount: 30000, date: "2024-01-15", text: "Transport", category: "Transport" }),
        createTestEntry({ id: "3", amount: 20000, date: "2024-01-15", text: "Makanan lagi", category: "Makan" })
      ];
      
      const result = getTopCategory(entries);
      expect(result?.category).toBe("Makan");
      expect(result?.totalAmount).toBe(70000);
    });

    it("should return null for empty array", () => {
      expect(getTopCategory([])).toBeNull();
    });
  });

  describe("getTopCategoryBreakdown", () => {
    it("should return category breakdown", () => {
      const entries: Entry[] = [
        createTestEntry({ id: "1", amount: 50000, date: "2024-01-15", text: "Makanan", category: "Makan" }),
        createTestEntry({ id: "2", amount: 30000, date: "2024-01-15", text: "Transport", category: "Transport" })
      ];
      
      const result = getTopCategoryBreakdown(entries);
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe("Makan");
      expect(result[0].percentage).toBeGreaterThan(0);
    });
  });

  describe("getSmartEmptyState", () => {
    it("should return first entry message for empty entries", () => {
      const result = getSmartEmptyState([], new Date());
      expect(result.title).toContain("Catat pengeluaran");
    });

    it("should detect yesterday entry", () => {
      const now = new Date(2024, 0, 15);
      const entries: Entry[] = [
        createTestEntry({ id: "1", amount: 50000, date: "2024-01-14", text: "Kemarin", category: "Makan" })
      ];
      
      const result = getSmartEmptyState(entries, now);
      expect(result.title).toContain("nggak keluar uang");
    });
  });

  describe("getSummaryStats", () => {
    it("should calculate summary stats correctly", () => {
      const entries: Entry[] = [
        createTestEntry({ id: "1", amount: 50000, date: "2024-01-15", text: "Test", category: "Makan" }),
        createTestEntry({ id: "2", amount: 30000, date: "2024-01-15", text: "Test", category: "Transport" })
      ];
      
      const result = getSummaryStats({
        allEntries: entries,
        filteredEntries: entries,
        preset: "today",
        now: new Date(2024, 0, 15)
      });
      
      expect(result.totalAmount).toBe(80000);
      expect(result.entryCount).toBe(2);
      expect(result.periodLabel).toBe("Hari ini");
    });
  });
});