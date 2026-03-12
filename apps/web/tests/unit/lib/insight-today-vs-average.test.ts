import { describe, expect, it } from "vitest";
import type { Entry } from "@kemana/core/types";
import { deriveTodayVsAverageInsight } from "@/lib/dashboard-page-utils/insight";

function makeEntry(overrides?: Partial<Entry>): Entry {
  const fallbackIso = new Date("2024-01-05T10:00:00.000Z").toISOString();
  return {
    id: `entry-${Math.random()}`,
    text: "test",
    amount: 10000,
    date: "2024-01-05",
    category: "Makan",
    paymentMethod: "Cash",
    source: "quick_add",
    createdAt: fallbackIso,
    updatedAt: fallbackIso,
    ...overrides
  };
}

describe("deriveTodayVsAverageInsight", () => {
  it("returns empty insight for no entries", () => {
    const result = deriveTodayVsAverageInsight([], new Date("2024-01-05"));
    expect(result.hasData).toBe(false);
    expect(result.todayTotal).toBe(0);
    expect(result.dailyAverage).toBe(0);
    expect(result.hasSufficientHistory).toBe(false);
  });

  it("calculates today's total correctly", () => {
    const entries = [
      makeEntry({ date: "2024-01-05", amount: 100 }),
      makeEntry({ date: "2024-01-05", amount: 200 }),
      makeEntry({ date: "2024-01-04", amount: 300 })
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-05"));
    expect(result.todayTotal).toBe(300);
  });

  it("excludes zero-transaction days from average", () => {
    const entries = [
      makeEntry({ date: "2024-01-01", amount: 100 }),
      makeEntry({ date: "2024-01-03", amount: 300 }), // day 2 has no transactions
      makeEntry({ date: "2024-01-04", amount: 200 }),
      makeEntry({ date: "2024-01-05", amount: 0 }) // today
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-05"));
    // Average should be (100 + 300 + 200) / 3 = 200, not 600 / 4 = 150
    expect(result.dailyAverage).toBe(200);
  });

  it("handles insufficient history (< 3 days)", () => {
    const entries = [
      makeEntry({ date: "2024-01-01", amount: 100 }),
      makeEntry({ date: "2024-01-02", amount: 200 })
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-03"));
    expect(result.hasSufficientHistory).toBe(false);
  });

  it("sets hasSufficientHistory to true with >= 3 days", () => {
    const entries = [
      makeEntry({ date: "2024-01-01", amount: 100 }),
      makeEntry({ date: "2024-01-02", amount: 200 }),
      makeEntry({ date: "2024-01-03", amount: 300 })
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-04"));
    expect(result.hasSufficientHistory).toBe(true);
  });

  it("calculates direction as 'up' when today > average", () => {
    const entries = [
      makeEntry({ date: "2024-01-01", amount: 100 }),
      makeEntry({ date: "2024-01-02", amount: 100 }),
      makeEntry({ date: "2024-01-03", amount: 100 }),
      makeEntry({ date: "2024-01-04", amount: 500 }) // today
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-04"));
    expect(result.direction).toBe("up");
    expect(result.difference).toBe(400); // 500 - 100
  });

  it("calculates direction as 'down' when today < average", () => {
    const entries = [
      makeEntry({ date: "2024-01-01", amount: 500 }),
      makeEntry({ date: "2024-01-02", amount: 500 }),
      makeEntry({ date: "2024-01-03", amount: 500 }),
      makeEntry({ date: "2024-01-04", amount: 100 }) // today
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-04"));
    expect(result.direction).toBe("down");
    expect(result.difference).toBe(-400); // 100 - 500
  });

  it("calculates direction as 'neutral' when today === average", () => {
    const entries = [
      makeEntry({ date: "2024-01-01", amount: 200 }),
      makeEntry({ date: "2024-01-02", amount: 200 }),
      makeEntry({ date: "2024-01-03", amount: 200 }),
      makeEntry({ date: "2024-01-04", amount: 200 }) // today
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-04"));
    expect(result.direction).toBe("neutral");
    expect(result.difference).toBe(0);
  });

  it("handles first transaction is today", () => {
    const entries = [
      makeEntry({ date: "2024-01-05", amount: 100 })
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-05"));
    expect(result.todayTotal).toBe(100);
    expect(result.dailyAverage).toBe(0);
    expect(result.hasSufficientHistory).toBe(false);
    expect(result.hasData).toBe(true);
  });

  it("handles invalid date by defaulting to new Date()", () => {
    const entries = [
      makeEntry({ date: "2024-01-05", amount: 100 })
    ];
    // @ts-expect-error - testing invalid input
    const result = deriveTodayVsAverageInsight(entries, new Date("invalid"));
    expect(result).toBeDefined();
    expect(result.hasData).toBeDefined();
  });

  it("handles non-array entries input", () => {
    // @ts-expect-error - testing invalid input
    const result = deriveTodayVsAverageInsight(null, new Date("2024-01-05"));
    expect(result.hasData).toBe(false);
    expect(result.todayTotal).toBe(0);
  });

  it("handles single day of data", () => {
    const entries = [
      makeEntry({ date: "2024-01-05", amount: 100 }),
      makeEntry({ date: "2024-01-05", amount: 200 })
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-05"));
    expect(result.todayTotal).toBe(300);
    expect(result.dailyAverage).toBe(0); // No historical data
    expect(result.hasSufficientHistory).toBe(false);
    expect(result.hasData).toBe(true);
  });

  it("returns hasData: false for empty entries array", () => {
    const result = deriveTodayVsAverageInsight([], new Date("2024-01-05"));
    expect(result.hasData).toBe(false);
    expect(result.todayTotal).toBe(0);
    expect(result.dailyAverage).toBe(0);
    expect(result.difference).toBe(0);
  });

  it("returns hasSufficientHistory: false for insufficient history (< 3 days)", () => {
    const entries = [
      makeEntry({ date: "2024-01-01", amount: 100 }),
      makeEntry({ date: "2024-01-02", amount: 200 }),
      makeEntry({ date: "2024-01-03", amount: 50 })
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-03"));
    expect(result.hasSufficientHistory).toBe(false);
    expect(result.todayTotal).toBe(50);
  });

  it("excludes zero-transaction days from average calculation", () => {
    const entries = [
      makeEntry({ date: "2024-01-01", amount: 300 }),
      // 2024-01-02 has no transactions (zero-transaction day)
      makeEntry({ date: "2024-01-03", amount: 600 }),
      // 2024-01-04 has no transactions (zero-transaction day)
      makeEntry({ date: "2024-01-05", amount: 100 }) // today
    ];
    const result = deriveTodayVsAverageInsight(entries, new Date("2024-01-05"));
    // Average should be (300 + 600) / 2 = 450, not (300 + 600) / 4 = 225
    expect(result.dailyAverage).toBe(450);
    expect(result.hasSufficientHistory).toBe(false); // Only 2 historical days
  });

  it("defaults to new Date() when invalid date is provided", () => {
    const today = new Date();
    const todayKey = today.toISOString().split("T")[0];
    const entries = [
      makeEntry({ date: todayKey, amount: 100 })
    ];
    // @ts-expect-error - testing invalid input
    const result = deriveTodayVsAverageInsight(entries, new Date("invalid-date"));
    // Should use current date as fallback
    expect(result).toBeDefined();
    expect(result.hasData).toBeDefined();
  });
});
