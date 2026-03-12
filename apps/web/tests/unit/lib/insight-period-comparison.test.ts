/**
 * Unit tests for derivePeriodComparison edge cases
 * Task 3.3: Write unit tests for derivePeriodComparison edge cases
 * Requirements: 3.7, 3.9, 8.4
 */

import { describe, test, expect } from "vitest";
import { derivePeriodComparison } from "../../../src/lib/dashboard-page-utils/insight";
import { makeEntry } from "../../helpers/test-generators";

describe("derivePeriodComparison edge cases", () => {
  test("empty entries returns hasData: false", () => {
    const result = derivePeriodComparison([], "30d", new Date("2026-02-22"));

    expect(result.hasData).toBe(false);
    expect(result.hasPreviousData).toBe(false);
    expect(result.currentTotal).toBe(0);
    expect(result.previousTotal).toBe(0);
    expect(result.percentageChange).toBeNull();
    expect(result.direction).toBe("neutral");
  });

  test("no previous period data returns hasPreviousData: false", () => {
    // Create entries only in current period (last 30 days)
    const now = new Date("2026-02-22");
    const entries = [
      makeEntry({ date: "2026-02-20", amount: 100000 }),
      makeEntry({ date: "2026-02-21", amount: 150000 }),
      makeEntry({ date: "2026-02-22", amount: 200000 }),
    ];

    const result = derivePeriodComparison(entries, "30d", now);

    expect(result.hasData).toBe(true);
    expect(result.hasPreviousData).toBe(false);
    expect(result.currentTotal).toBe(450000);
    expect(result.previousTotal).toBe(0);
  });

  test("previousTotal === 0 returns percentageChange: null", () => {
    // Create entries only in current period, none in previous period
    const now = new Date("2026-02-22");
    const entries = [
      makeEntry({ date: "2026-02-20", amount: 100000 }),
      makeEntry({ date: "2026-02-21", amount: 150000 }),
    ];

    const result = derivePeriodComparison(entries, "30d", now);

    expect(result.previousTotal).toBe(0);
    expect(result.percentageChange).toBeNull();
  });

  test("percentage rounding to whole numbers", () => {
    const now = new Date("2026-02-22");
    
    // Current period: Feb 23 - Feb 22 (30 days back from Feb 22)
    // Previous period: Jan 24 - Jan 23 (30 days before that)
    const entries = [
      // Current period entries
      makeEntry({ date: "2026-02-20", amount: 100000 }),
      makeEntry({ date: "2026-02-21", amount: 100000 }),
      makeEntry({ date: "2026-02-22", amount: 100000 }),
      // Previous period entries (30 days before)
      makeEntry({ date: "2026-01-20", amount: 50000 }),
      makeEntry({ date: "2026-01-21", amount: 50000 }),
      makeEntry({ date: "2026-01-22", amount: 50000 }),
    ];

    const result = derivePeriodComparison(entries, "30d", now);

    // Current: 300000, Previous: 150000
    // Percentage: abs((300000 - 150000) / 150000) * 100 = 100%
    expect(result.currentTotal).toBe(300000);
    expect(result.previousTotal).toBe(150000);
    expect(result.percentageChange).toBe(100);
    expect(Number.isInteger(result.percentageChange)).toBe(true);
  });

  test("percentage rounding with decimal values", () => {
    const now = new Date("2026-02-22");
    
    const entries = [
      // Current period: 333
      makeEntry({ date: "2026-02-22", amount: 333 }),
      // Previous period: 100
      makeEntry({ date: "2026-01-23", amount: 100 }),
    ];

    const result = derivePeriodComparison(entries, "30d", now);

    // Percentage: abs((333 - 100) / 100) * 100 = 233%
    expect(result.percentageChange).toBe(233);
    expect(Number.isInteger(result.percentageChange)).toBe(true);
  });

  test("zero percentage difference displays neutral direction", () => {
    const now = new Date("2026-02-22");
    
    const entries = [
      // Current period
      makeEntry({ date: "2026-02-22", amount: 100000 }),
      // Previous period (same amount)
      makeEntry({ date: "2026-01-23", amount: 100000 }),
    ];

    const result = derivePeriodComparison(entries, "30d", now);

    expect(result.currentTotal).toBe(100000);
    expect(result.previousTotal).toBe(100000);
    expect(result.percentageChange).toBe(0);
    expect(result.direction).toBe("neutral");
  });

  test("handles invalid date gracefully", () => {
    const entries = [
      makeEntry({ date: "2026-02-22", amount: 100000 }),
    ];

    // Pass invalid date
    const invalidDate = new Date("invalid");
    const result = derivePeriodComparison(entries, "30d", invalidDate);

    // Should default to new Date() and still work
    expect(result).toBeDefined();
    expect(result.hasData).toBeDefined();
  });

  test("handles non-array entries gracefully", () => {
    // @ts-expect-error Testing invalid input
    const result = derivePeriodComparison(null, "30d", new Date("2026-02-22"));

    expect(result.hasData).toBe(false);
    expect(result.hasPreviousData).toBe(false);
    expect(result.percentageChange).toBeNull();
  });

  test("handles 'all' preset returns neutral result", () => {
    const entries = [
      makeEntry({ date: "2026-02-22", amount: 100000 }),
    ];

    const result = derivePeriodComparison(entries, "all", new Date("2026-02-22"));

    // 'all' preset has windowDays: null, so should return early
    expect(result.hasData).toBe(false);
    expect(result.hasPreviousData).toBe(false);
    expect(result.percentageChange).toBeNull();
    expect(result.direction).toBe("neutral");
  });

  test("direction is 'up' when current > previous", () => {
    const now = new Date("2026-02-22");
    
    const entries = [
      // Current period: 200
      makeEntry({ date: "2026-02-22", amount: 200 }),
      // Previous period: 100
      makeEntry({ date: "2026-01-23", amount: 100 }),
    ];

    const result = derivePeriodComparison(entries, "30d", now);

    expect(result.direction).toBe("up");
    expect(result.currentTotal).toBeGreaterThan(result.previousTotal);
  });

  test("direction is 'down' when current < previous", () => {
    const now = new Date("2026-02-22");
    
    const entries = [
      // Current period: 100
      makeEntry({ date: "2026-02-22", amount: 100 }),
      // Previous period: 200
      makeEntry({ date: "2026-01-23", amount: 200 }),
    ];

    const result = derivePeriodComparison(entries, "30d", now);

    expect(result.direction).toBe("down");
    expect(result.currentTotal).toBeLessThan(result.previousTotal);
  });

  test("works with 7d preset", () => {
    const now = new Date("2026-02-22");
    
    const entries = [
      // Current period (last 7 days)
      makeEntry({ date: "2026-02-22", amount: 100 }),
      // Previous period (7 days before that)
      makeEntry({ date: "2026-02-15", amount: 50 }),
    ];

    const result = derivePeriodComparison(entries, "7d", now);

    expect(result.hasData).toBe(true);
    expect(result.currentTotal).toBe(100);
    expect(result.previousTotal).toBe(50);
    expect(result.percentageChange).toBe(100);
  });

  test("works with today preset", () => {
    const now = new Date("2026-02-22");
    
    const entries = [
      // Today
      makeEntry({ date: "2026-02-22", amount: 100 }),
      // Yesterday
      makeEntry({ date: "2026-02-21", amount: 50 }),
    ];

    const result = derivePeriodComparison(entries, "today", now);

    expect(result.hasData).toBe(true);
    expect(result.currentTotal).toBe(100);
    expect(result.previousTotal).toBe(50);
    expect(result.percentageChange).toBe(100);
  });
});
