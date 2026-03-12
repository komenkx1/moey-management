/**
 * Property-based tests for Today vs Average insight calculations
 * Feature: ux-critical-improvements
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { deriveTodayVsAverageInsight } from "../../../src/lib/dashboard-page-utils/insight";
import {
  arbitraryEntry,
  arbitraryEntriesInDateRange,
  toDateKey,
} from "../../helpers/test-generators";
import type { Entry } from "@kemana/core/types";

describe("Property 1: Today Total Calculation", () => {
  /**
   * Property 1: Today Total Calculation
   * Validates: Requirements 1.1, 4.1
   * 
   * For any set of entries and any date, calculating today's total should equal
   * the sum of all entry amounts where the entry date matches the given date.
   */
  it("today total equals sum of entries matching the given date", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEntry(), { minLength: 0, maxLength: 50 }),
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (entries: Entry[], date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Calculate expected total manually
          const todayKey = toDateKey(date);
          const expectedTotal = entries
            .filter((e) => e.date === todayKey)
            .reduce((sum, e) => sum + e.amount, 0);
          
          // Property: todayTotal should equal the sum of entries for the given date
          expect(result.todayTotal).toBe(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("today total is zero when no entries match the given date", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (date: Date) => {
          // Create entries that are NOT on the given date
          const todayKey = toDateKey(date);
          const differentDate = new Date(date);
          differentDate.setDate(differentDate.getDate() - 1);
          const differentDateKey = toDateKey(differentDate);
          
          const entries: Entry[] = [];
          const numEntries = Math.floor(Math.random() * 10);
          
          for (let i = 0; i < numEntries; i++) {
            entries.push({
              id: `entry-${i}`,
              text: "test",
              amount: Math.floor(Math.random() * 10000),
              date: differentDateKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Property: todayTotal should be zero when no entries match
          expect(result.todayTotal).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("today total handles entries with various amounts correctly", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1_000_000 }), { minLength: 1, maxLength: 20 }),
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (amounts: number[], date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          const todayKey = toDateKey(date);
          
          // Create entries with the specified amounts for today
          const entries: Entry[] = amounts.map((amount, i) => ({
            id: `entry-${i}`,
            text: "test",
            amount,
            date: todayKey,
            category: "Makan",
            paymentMethod: "Cash",
            source: "test",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          
          const result = deriveTodayVsAverageInsight(entries, date);
          const expectedTotal = amounts.reduce((sum, amt) => sum + amt, 0);
          
          // Property: todayTotal should equal the sum of all amounts
          expect(result.todayTotal).toBe(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 2: Daily Average Excludes Zero-Transaction Days", () => {
  /**
   * Property 2: Daily Average Excludes Zero-Transaction Days
   * Validates: Requirements 1.2, 4.2, 4.3
   * 
   * For any set of historical entries, the daily average should be calculated by
   * dividing the total amount by the count of unique dates that have at least one
   * transaction (excluding days with zero transactions).
   */
  it("daily average equals total divided by count of unique dates with transactions", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        fc.array(
          fc.record({
            date: fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
            amount: fc.integer({ min: 1, max: 100_000 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (todayDate: Date, historicalData: Array<{ date: Date; amount: number }>) => {
          // Skip invalid dates
          if (!todayDate || Number.isNaN(todayDate.getTime())) {
            return true;
          }
          
          const todayKey = toDateKey(todayDate);
          
          // Create entries from historical data, ensuring they're NOT on today
          const entries: Entry[] = historicalData
            .filter((data) => {
              // Filter out invalid dates
              if (!data.date || Number.isNaN(data.date.getTime())) {
                return false;
              }
              const dataKey = toDateKey(data.date);
              return dataKey !== todayKey; // Exclude today
            })
            .map((data, i) => ({
              id: `entry-${i}`,
              text: "test",
              amount: data.amount,
              date: toDateKey(data.date),
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: data.date.toISOString(),
              updatedAt: data.date.toISOString(),
            }));
          
          // Skip if no historical entries after filtering
          if (entries.length === 0) {
            return true;
          }
          
          const result = deriveTodayVsAverageInsight(entries, todayDate);
          
          // Calculate expected values manually
          const uniqueDates = new Set(entries.map((e) => e.date));
          const activeDays = uniqueDates.size;
          const totalHistorical = entries.reduce((sum, e) => sum + e.amount, 0);
          const expectedAverage = totalHistorical / activeDays;
          
          // Property: dailyAverage should equal total / count of unique dates
          expect(result.dailyAverage).toBeCloseTo(expectedAverage, 2);
          expect(result.hasSufficientHistory).toBe(activeDays >= 3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("daily average excludes days with zero transactions (gaps)", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 3, max: 10 }), // Number of days with transactions
        fc.integer({ min: 1, max: 5 }), // Number of gap days (no transactions)
        (todayDate: Date, activeDaysCount: number, gapDaysCount: number) => {
          // Skip invalid dates
          if (!todayDate || Number.isNaN(todayDate.getTime())) {
            return true;
          }
          
          const todayKey = toDateKey(todayDate);
          const entries: Entry[] = [];
          
          // Create entries for active days (days with transactions)
          // Use dates before today
          for (let i = 1; i <= activeDaysCount; i++) {
            const date = new Date(todayDate);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            // Add 1-3 entries per active day
            const entriesPerDay = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < entriesPerDay; j++) {
              entries.push({
                id: `entry-${i}-${j}`,
                text: "test",
                amount: Math.floor(Math.random() * 50_000) + 1000,
                date: dateKey,
                category: "Makan",
                paymentMethod: "Cash",
                source: "test",
                createdAt: date.toISOString(),
                updatedAt: date.toISOString(),
              });
            }
          }
          
          // Note: Gap days are implicitly created by NOT adding entries for those dates
          // The property test verifies that the average calculation only counts days
          // that actually have transactions
          
          const result = deriveTodayVsAverageInsight(entries, todayDate);
          
          // Calculate expected values
          const uniqueDates = new Set(entries.map((e) => e.date));
          const actualActiveDays = uniqueDates.size;
          const totalHistorical = entries.reduce((sum, e) => sum + e.amount, 0);
          const expectedAverage = totalHistorical / actualActiveDays;
          
          // Property: dailyAverage should be calculated using ONLY active days
          // NOT (total / (activeDays + gapDays))
          expect(result.dailyAverage).toBeCloseTo(expectedAverage, 2);
          
          // Verify that the average is higher than it would be if gaps were included
          // (because we're dividing by fewer days)
          const averageWithGaps = totalHistorical / (actualActiveDays + gapDaysCount);
          expect(result.dailyAverage).toBeGreaterThan(averageWithGaps);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("daily average handles single-day historical data correctly", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 1, max: 100_000 }),
        (todayDate: Date, amount: number) => {
          // Skip invalid dates
          if (!todayDate || Number.isNaN(todayDate.getTime())) {
            return true;
          }
          
          const todayKey = toDateKey(todayDate);
          
          // Create a single historical entry (not today)
          const yesterday = new Date(todayDate);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayKey = toDateKey(yesterday);
          
          const entries: Entry[] = [
            {
              id: "entry-1",
              text: "test",
              amount,
              date: yesterdayKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: yesterday.toISOString(),
              updatedAt: yesterday.toISOString(),
            },
          ];
          
          const result = deriveTodayVsAverageInsight(entries, todayDate);
          
          // Property: With one day of data, average should equal that day's total
          expect(result.dailyAverage).toBe(amount);
          expect(result.hasSufficientHistory).toBe(false); // Less than 3 days
        }
      ),
      { numRuns: 100 }
    );
  });

  it("daily average correctly groups multiple entries on the same date", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        fc.array(fc.integer({ min: 1, max: 50_000 }), { minLength: 2, maxLength: 10 }),
        (todayDate: Date, amounts: number[]) => {
          // Skip invalid dates
          if (!todayDate || Number.isNaN(todayDate.getTime())) {
            return true;
          }
          
          const todayKey = toDateKey(todayDate);
          
          // Create multiple entries all on the same historical date
          const yesterday = new Date(todayDate);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayKey = toDateKey(yesterday);
          
          const entries: Entry[] = amounts.map((amount, i) => ({
            id: `entry-${i}`,
            text: "test",
            amount,
            date: yesterdayKey,
            category: "Makan",
            paymentMethod: "Cash",
            source: "test",
            createdAt: yesterday.toISOString(),
            updatedAt: yesterday.toISOString(),
          }));
          
          const result = deriveTodayVsAverageInsight(entries, todayDate);
          
          // Calculate expected total
          const expectedTotal = amounts.reduce((sum, amt) => sum + amt, 0);
          
          // Property: Multiple entries on same date should be summed correctly
          // and divided by 1 (since it's only 1 unique date)
          expect(result.dailyAverage).toBe(expectedTotal);
          expect(result.hasSufficientHistory).toBe(false); // Only 1 day
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 3: Comparison Direction Correctness", () => {
  /**
   * Property 3: Comparison Direction Correctness
   * Validates: Requirements 1.4, 1.5
   * 
   * For any two amounts (today vs average), the direction indicator should be
   * "up" when today exceeds average, "down" when today is less than average,
   * and "neutral" when they are equal.
   */
  it("direction is 'up' when today total exceeds daily average", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // todayTotal
        fc.integer({ min: 0, max: 999_999 }), // dailyAverage (always less)
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (todayAmount: number, avgAmount: number, date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          // Ensure todayAmount > avgAmount
          const actualTodayAmount = avgAmount + todayAmount;
          
          // Create entries: today's entry + historical entries
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          // Add today's entry
          entries.push({
            id: "today-1",
            text: "test",
            amount: actualTodayAmount,
            date: todayKey,
            category: "Makan",
            paymentMethod: "Cash",
            source: "test",
            createdAt: date.toISOString(),
            updatedAt: date.toISOString(),
          });
          
          // Add historical entries to create the desired average
          // We need at least 3 days for sufficient history
          const numHistoricalDays = 3;
          for (let i = 1; i <= numHistoricalDays; i++) {
            const historicalDate = new Date(date);
            historicalDate.setDate(historicalDate.getDate() - i);
            const historicalKey = toDateKey(historicalDate);
            
            entries.push({
              id: `historical-${i}`,
              text: "test",
              amount: avgAmount,
              date: historicalKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: historicalDate.toISOString(),
              updatedAt: historicalDate.toISOString(),
            });
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Property: When today > average, direction should be "up"
          expect(result.todayTotal).toBeGreaterThan(result.dailyAverage);
          expect(result.direction).toBe("up");
          expect(result.difference).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("direction is 'down' when today total is less than daily average", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999_999 }), // todayTotal (lower)
        fc.integer({ min: 1, max: 1_000_000 }), // dailyAverage (higher)
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (todayAmount: number, avgAmount: number, date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          // Ensure avgAmount > todayAmount
          const actualAvgAmount = todayAmount + avgAmount;
          
          // Create entries: today's entry + historical entries
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          // Add today's entry
          entries.push({
            id: "today-1",
            text: "test",
            amount: todayAmount,
            date: todayKey,
            category: "Makan",
            paymentMethod: "Cash",
            source: "test",
            createdAt: date.toISOString(),
            updatedAt: date.toISOString(),
          });
          
          // Add historical entries to create the desired average
          // We need at least 3 days for sufficient history
          const numHistoricalDays = 3;
          for (let i = 1; i <= numHistoricalDays; i++) {
            const historicalDate = new Date(date);
            historicalDate.setDate(historicalDate.getDate() - i);
            const historicalKey = toDateKey(historicalDate);
            
            entries.push({
              id: `historical-${i}`,
              text: "test",
              amount: actualAvgAmount,
              date: historicalKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: historicalDate.toISOString(),
              updatedAt: historicalDate.toISOString(),
            });
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Property: When today < average, direction should be "down"
          expect(result.todayTotal).toBeLessThan(result.dailyAverage);
          expect(result.direction).toBe("down");
          expect(result.difference).toBeLessThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("direction is 'neutral' when today total equals daily average", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // amount (same for both)
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (amount: number, date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          // Create entries: today's entry + historical entries with same amount
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          // Add today's entry
          entries.push({
            id: "today-1",
            text: "test",
            amount,
            date: todayKey,
            category: "Makan",
            paymentMethod: "Cash",
            source: "test",
            createdAt: date.toISOString(),
            updatedAt: date.toISOString(),
          });
          
          // Add historical entries with the same amount
          // We need at least 3 days for sufficient history
          const numHistoricalDays = 3;
          for (let i = 1; i <= numHistoricalDays; i++) {
            const historicalDate = new Date(date);
            historicalDate.setDate(historicalDate.getDate() - i);
            const historicalKey = toDateKey(historicalDate);
            
            entries.push({
              id: `historical-${i}`,
              text: "test",
              amount,
              date: historicalKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: historicalDate.toISOString(),
              updatedAt: historicalDate.toISOString(),
            });
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Property: When today === average, direction should be "neutral"
          expect(result.todayTotal).toBe(result.dailyAverage);
          expect(result.direction).toBe("neutral");
          expect(result.difference).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("direction correctness holds across various amount ranges", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10_000_000, noNaN: true }), // todayTotal
        fc.float({ min: 0, max: 10_000_000, noNaN: true }), // dailyAverage
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (todayAmount: number, avgAmount: number, date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          // Round amounts to avoid floating point precision issues
          const todayTotal = Math.round(todayAmount);
          const avgPerDay = Math.round(avgAmount);
          
          // Create entries: today's entry + historical entries
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          // Add today's entry
          if (todayTotal > 0) {
            entries.push({
              id: "today-1",
              text: "test",
              amount: todayTotal,
              date: todayKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: date.toISOString(),
              updatedAt: date.toISOString(),
            });
          }
          
          // Add historical entries to create the desired average
          const numHistoricalDays = 3;
          for (let i = 1; i <= numHistoricalDays; i++) {
            const historicalDate = new Date(date);
            historicalDate.setDate(historicalDate.getDate() - i);
            const historicalKey = toDateKey(historicalDate);
            
            if (avgPerDay > 0) {
              entries.push({
                id: `historical-${i}`,
                text: "test",
                amount: avgPerDay,
                date: historicalKey,
                category: "Makan",
                paymentMethod: "Cash",
                source: "test",
                createdAt: historicalDate.toISOString(),
                updatedAt: historicalDate.toISOString(),
              });
            }
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Property: Direction should always match the comparison result
          if (result.todayTotal > result.dailyAverage) {
            expect(result.direction).toBe("up");
            expect(result.difference).toBeGreaterThan(0);
          } else if (result.todayTotal < result.dailyAverage) {
            expect(result.direction).toBe("down");
            expect(result.difference).toBeLessThan(0);
          } else {
            expect(result.direction).toBe("neutral");
            expect(result.difference).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("direction correctness with zero amounts", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        fc.constantFrom("today-zero", "average-zero", "both-zero"),
        (date: Date, scenario: string) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          let expectedDirection: "up" | "down" | "neutral";
          
          if (scenario === "today-zero") {
            // Today is zero, average is positive
            // Add historical entries only
            for (let i = 1; i <= 3; i++) {
              const historicalDate = new Date(date);
              historicalDate.setDate(historicalDate.getDate() - i);
              const historicalKey = toDateKey(historicalDate);
              
              entries.push({
                id: `historical-${i}`,
                text: "test",
                amount: 10000,
                date: historicalKey,
                category: "Makan",
                paymentMethod: "Cash",
                source: "test",
                createdAt: historicalDate.toISOString(),
                updatedAt: historicalDate.toISOString(),
              });
            }
            expectedDirection = "down";
          } else if (scenario === "average-zero") {
            // Today is positive, average is zero (no historical data)
            entries.push({
              id: "today-1",
              text: "test",
              amount: 10000,
              date: todayKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: date.toISOString(),
              updatedAt: date.toISOString(),
            });
            expectedDirection = "up";
          } else {
            // Both are zero (no entries at all)
            expectedDirection = "neutral";
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Property: Direction should be correct even with zero amounts
          expect(result.direction).toBe(expectedDirection);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 4: Difference Calculation Accuracy", () => {
  /**
   * Property 4: Difference Calculation Accuracy
   * Validates: Requirements 1.3, 1.7
   * 
   * For any two amounts being compared (today vs average), the displayed difference
   * should equal (todayTotal - dailyAverage). The difference can be positive, negative,
   * or zero depending on the direction.
   */
  it("difference equals todayTotal minus dailyAverage", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10_000_000, noNaN: true }), // todayTotal
        fc.float({ min: 0, max: 10_000_000, noNaN: true }), // dailyAverage
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (todayAmount: number, avgAmount: number, date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          // Round amounts to avoid floating point precision issues
          const todayTotal = Math.round(todayAmount);
          const avgPerDay = Math.round(avgAmount);
          
          // Create entries: today's entry + historical entries
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          // Add today's entry
          if (todayTotal > 0) {
            entries.push({
              id: "today-1",
              text: "test",
              amount: todayTotal,
              date: todayKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: date.toISOString(),
              updatedAt: date.toISOString(),
            });
          }
          
          // Add historical entries to create the desired average
          // We need at least 3 days for sufficient history
          const numHistoricalDays = 3;
          for (let i = 1; i <= numHistoricalDays; i++) {
            const historicalDate = new Date(date);
            historicalDate.setDate(historicalDate.getDate() - i);
            const historicalKey = toDateKey(historicalDate);
            
            if (avgPerDay > 0) {
              entries.push({
                id: `historical-${i}`,
                text: "test",
                amount: avgPerDay,
                date: historicalKey,
                category: "Makan",
                paymentMethod: "Cash",
                source: "test",
                createdAt: historicalDate.toISOString(),
                updatedAt: historicalDate.toISOString(),
              });
            }
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Calculate expected difference
          const expectedDifference = result.todayTotal - result.dailyAverage;
          
          // Property: difference should equal (todayTotal - dailyAverage)
          // Use toBeCloseTo to handle floating point precision
          expect(result.difference).toBeCloseTo(expectedDifference, 2);
          
          // Verify the difference sign matches the direction
          if (result.difference > 0) {
            expect(result.direction).toBe("up");
          } else if (result.difference < 0) {
            expect(result.direction).toBe("down");
          } else {
            expect(result.direction).toBe("neutral");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("difference is positive when today exceeds average", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // todayTotal (higher)
        fc.integer({ min: 0, max: 999_999 }), // dailyAverage (lower)
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (todayAmount: number, avgAmount: number, date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          // Ensure todayAmount > avgAmount
          const actualTodayAmount = avgAmount + todayAmount;
          
          // Create entries
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          // Add today's entry
          entries.push({
            id: "today-1",
            text: "test",
            amount: actualTodayAmount,
            date: todayKey,
            category: "Makan",
            paymentMethod: "Cash",
            source: "test",
            createdAt: date.toISOString(),
            updatedAt: date.toISOString(),
          });
          
          // Add historical entries
          const numHistoricalDays = 3;
          for (let i = 1; i <= numHistoricalDays; i++) {
            const historicalDate = new Date(date);
            historicalDate.setDate(historicalDate.getDate() - i);
            const historicalKey = toDateKey(historicalDate);
            
            entries.push({
              id: `historical-${i}`,
              text: "test",
              amount: avgAmount,
              date: historicalKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: historicalDate.toISOString(),
              updatedAt: historicalDate.toISOString(),
            });
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Property: When today > average, difference should be positive
          expect(result.difference).toBeGreaterThan(0);
          expect(result.difference).toBeCloseTo(
            result.todayTotal - result.dailyAverage,
            2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("difference is negative when today is below average", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999_999 }), // todayTotal (lower)
        fc.integer({ min: 1, max: 1_000_000 }), // dailyAverage (higher)
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (todayAmount: number, avgAmount: number, date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          // Ensure avgAmount > todayAmount
          const actualAvgAmount = todayAmount + avgAmount;
          
          // Create entries
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          // Add today's entry
          entries.push({
            id: "today-1",
            text: "test",
            amount: todayAmount,
            date: todayKey,
            category: "Makan",
            paymentMethod: "Cash",
            source: "test",
            createdAt: date.toISOString(),
            updatedAt: date.toISOString(),
          });
          
          // Add historical entries
          const numHistoricalDays = 3;
          for (let i = 1; i <= numHistoricalDays; i++) {
            const historicalDate = new Date(date);
            historicalDate.setDate(historicalDate.getDate() - i);
            const historicalKey = toDateKey(historicalDate);
            
            entries.push({
              id: `historical-${i}`,
              text: "test",
              amount: actualAvgAmount,
              date: historicalKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: historicalDate.toISOString(),
              updatedAt: historicalDate.toISOString(),
            });
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Property: When today < average, difference should be negative
          expect(result.difference).toBeLessThan(0);
          expect(result.difference).toBeCloseTo(
            result.todayTotal - result.dailyAverage,
            2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("difference is zero when today equals average", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // amount (same for both)
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (amount: number, date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          // Create entries with same amount for today and historical days
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          // Add today's entry
          entries.push({
            id: "today-1",
            text: "test",
            amount,
            date: todayKey,
            category: "Makan",
            paymentMethod: "Cash",
            source: "test",
            createdAt: date.toISOString(),
            updatedAt: date.toISOString(),
          });
          
          // Add historical entries with same amount
          const numHistoricalDays = 3;
          for (let i = 1; i <= numHistoricalDays; i++) {
            const historicalDate = new Date(date);
            historicalDate.setDate(historicalDate.getDate() - i);
            const historicalKey = toDateKey(historicalDate);
            
            entries.push({
              id: `historical-${i}`,
              text: "test",
              amount,
              date: historicalKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: historicalDate.toISOString(),
              updatedAt: historicalDate.toISOString(),
            });
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Property: When today === average, difference should be zero
          expect(result.difference).toBe(0);
          expect(result.difference).toBeCloseTo(
            result.todayTotal - result.dailyAverage,
            2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("difference calculation handles various amount ranges correctly", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 500_000 }), { minLength: 1, maxLength: 5 }), // today amounts
        fc.array(fc.integer({ min: 1, max: 500_000 }), { minLength: 3, maxLength: 10 }), // historical amounts
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        (todayAmounts: number[], historicalAmounts: number[], date: Date) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          // Add today's entries
          todayAmounts.forEach((amount, i) => {
            entries.push({
              id: `today-${i}`,
              text: "test",
              amount,
              date: todayKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: date.toISOString(),
              updatedAt: date.toISOString(),
            });
          });
          
          // Add historical entries across multiple days
          const numHistoricalDays = 3;
          const amountsPerDay = Math.ceil(historicalAmounts.length / numHistoricalDays);
          
          for (let dayIndex = 0; dayIndex < numHistoricalDays; dayIndex++) {
            const historicalDate = new Date(date);
            historicalDate.setDate(historicalDate.getDate() - (dayIndex + 1));
            const historicalKey = toDateKey(historicalDate);
            
            const startIdx = dayIndex * amountsPerDay;
            const endIdx = Math.min(startIdx + amountsPerDay, historicalAmounts.length);
            
            for (let i = startIdx; i < endIdx; i++) {
              entries.push({
                id: `historical-${dayIndex}-${i}`,
                text: "test",
                amount: historicalAmounts[i],
                date: historicalKey,
                category: "Makan",
                paymentMethod: "Cash",
                source: "test",
                createdAt: historicalDate.toISOString(),
                updatedAt: historicalDate.toISOString(),
              });
            }
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Calculate expected values manually
          const expectedTodayTotal = todayAmounts.reduce((sum, amt) => sum + amt, 0);
          const expectedHistoricalTotal = historicalAmounts.reduce((sum, amt) => sum + amt, 0);
          const expectedActiveDays = new Set(
            entries.filter((e) => e.date !== todayKey).map((e) => e.date)
          ).size;
          const expectedAverage = expectedHistoricalTotal / expectedActiveDays;
          const expectedDifference = expectedTodayTotal - expectedAverage;
          
          // Property: difference should always equal (todayTotal - dailyAverage)
          expect(result.todayTotal).toBe(expectedTodayTotal);
          expect(result.dailyAverage).toBeCloseTo(expectedAverage, 2);
          expect(result.difference).toBeCloseTo(expectedDifference, 2);
          
          // Verify consistency with direction
          if (expectedDifference > 0) {
            expect(result.direction).toBe("up");
          } else if (expectedDifference < 0) {
            expect(result.direction).toBe("down");
          } else {
            expect(result.direction).toBe("neutral");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("difference calculation handles edge cases with zero values", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-01-01"), max: new Date("2026-12-31") }),
        fc.constantFrom("today-zero", "average-zero", "both-zero"),
        fc.integer({ min: 1, max: 100_000 }),
        (date: Date, scenario: string, amount: number) => {
          // Skip invalid dates
          if (!date || Number.isNaN(date.getTime())) {
            return true;
          }
          
          const todayKey = toDateKey(date);
          const entries: Entry[] = [];
          
          let expectedDifference: number;
          
          if (scenario === "today-zero") {
            // Today is zero, average is positive
            for (let i = 1; i <= 3; i++) {
              const historicalDate = new Date(date);
              historicalDate.setDate(historicalDate.getDate() - i);
              const historicalKey = toDateKey(historicalDate);
              
              entries.push({
                id: `historical-${i}`,
                text: "test",
                amount,
                date: historicalKey,
                category: "Makan",
                paymentMethod: "Cash",
                source: "test",
                createdAt: historicalDate.toISOString(),
                updatedAt: historicalDate.toISOString(),
              });
            }
            expectedDifference = 0 - amount; // negative
          } else if (scenario === "average-zero") {
            // Today is positive, average is zero (no historical data)
            entries.push({
              id: "today-1",
              text: "test",
              amount,
              date: todayKey,
              category: "Makan",
              paymentMethod: "Cash",
              source: "test",
              createdAt: date.toISOString(),
              updatedAt: date.toISOString(),
            });
            expectedDifference = amount - 0; // positive
          } else {
            // Both are zero (no entries at all)
            expectedDifference = 0;
          }
          
          const result = deriveTodayVsAverageInsight(entries, date);
          
          // Property: difference should be correct even with zero values
          expect(result.difference).toBeCloseTo(expectedDifference, 2);
          expect(result.difference).toBeCloseTo(
            result.todayTotal - result.dailyAverage,
            2
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
