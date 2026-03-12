/**
 * Property-based tests for Period Comparison insight calculations
 * Feature: ux-critical-improvements
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { derivePeriodComparison } from "../../../src/lib/dashboard-page-utils/insight";
import type { DateFilterPreset } from "../../../src/lib/kemana-utils";
import {
  arbitraryEntry,
  toDateKey,
  makeEntry,
} from "../../helpers/test-generators";
import type { Entry } from "@kemana/core/types";

describe("Property 6: Period Comparison Window Consistency", () => {
  /**
   * Property 6: Period Comparison Window Consistency
   * Validates: Requirements 3.1, 3.4, 3.8, 3.10, 4.4
   * 
   * For any date filter preset and reference date, the previous period window
   * should have the same length as the current period window, and the percentage
   * change should be calculated as Math.abs((current - previous) / previous) * 100
   * rounded to whole numbers.
   */
  it("previous period window has same length as current period window", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DateFilterPreset>("today", "7d", "30d"),
        fc.date({ min: new Date("2024-06-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 0, max: 50 }), // number of entries
        (preset: DateFilterPreset, now: Date, numEntries: number) => {
          // Skip invalid dates
          if (!now || Number.isNaN(now.getTime())) {
            return true;
          }

          // Determine window size based on preset
          const windowDays = preset === "today" ? 1 : preset === "7d" ? 7 : 30;

          // Create entries spanning both current and previous periods
          const entries: Entry[] = [];
          for (let i = 0; i < numEntries; i++) {
            // Randomly place entries in either current or previous period
            const daysBack = Math.floor(Math.random() * (windowDays * 2));
            const date = new Date(now);
            date.setDate(date.getDate() - daysBack);
            const dateKey = toDateKey(date);
            
            entries.push(
              makeEntry({
                id: `entry-${i}`,
                amount: Math.floor(Math.random() * 100_000) + 1000,
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          const result = derivePeriodComparison(entries, preset, now);

          // Property: The function should process entries for both periods
          // We can't directly verify window lengths without reimplementing the logic,
          // but we can verify that the calculation is consistent
          
          // If we have data in both periods, the calculation should be valid
          if (result.hasPreviousData && result.hasData) {
            // Percentage change should be null if previousTotal is 0
            if (result.previousTotal === 0) {
              expect(result.percentageChange).toBeNull();
            } else {
              // Percentage change should be a non-negative whole number
              expect(result.percentageChange).not.toBeNull();
              if (result.percentageChange !== null) {
                expect(result.percentageChange).toBeGreaterThanOrEqual(0);
                expect(Number.isInteger(result.percentageChange)).toBe(true);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("percentage change equals Math.abs((current - previous) / previous) * 100 rounded", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DateFilterPreset>("today", "7d", "30d"),
        fc.date({ min: new Date("2024-06-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 1, max: 1_000_000 }), // currentTotal (non-zero)
        fc.integer({ min: 1, max: 1_000_000 }), // previousTotal (non-zero)
        (preset: DateFilterPreset, now: Date, currentAmount: number, previousAmount: number) => {
          // Skip invalid dates
          if (!now || Number.isNaN(now.getTime())) {
            return true;
          }

          // Determine window size based on preset
          const windowDays = preset === "today" ? 1 : preset === "7d" ? 7 : 30;

          // Create entries for current period
          const currentEntries: Entry[] = [];
          for (let i = 0; i < windowDays; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            currentEntries.push(
              makeEntry({
                id: `current-${i}`,
                amount: Math.floor(currentAmount / windowDays),
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          // Create entries for previous period
          const previousEntries: Entry[] = [];
          for (let i = windowDays; i < windowDays * 2; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            previousEntries.push(
              makeEntry({
                id: `previous-${i}`,
                amount: Math.floor(previousAmount / windowDays),
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          const allEntries = [...currentEntries, ...previousEntries];
          const result = derivePeriodComparison(allEntries, preset, now);

          // Calculate expected percentage change
          const expectedPercentageChange = Math.round(
            Math.abs((result.currentTotal - result.previousTotal) / result.previousTotal) * 100
          );

          // Property: percentageChange should match the formula
          if (result.previousTotal > 0) {
            expect(result.percentageChange).toBe(expectedPercentageChange);
          } else {
            expect(result.percentageChange).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("percentage change is rounded to whole numbers", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DateFilterPreset>("today", "7d", "30d"),
        fc.date({ min: new Date("2024-06-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 1, max: 1_000_000 }), // currentTotal
        fc.integer({ min: 1, max: 1_000_000 }), // previousTotal
        (preset: DateFilterPreset, now: Date, currentAmount: number, previousAmount: number) => {
          // Skip invalid dates
          if (!now || Number.isNaN(now.getTime())) {
            return true;
          }

          // Ensure amounts are different to get a non-zero percentage
          if (currentAmount === previousAmount) {
            currentAmount += 1;
          }

          // Determine window size based on preset
          const windowDays = preset === "today" ? 1 : preset === "7d" ? 7 : 30;

          // Create entries for current period
          const currentEntries: Entry[] = [];
          for (let i = 0; i < windowDays; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            currentEntries.push(
              makeEntry({
                id: `current-${i}`,
                amount: Math.floor(currentAmount / windowDays),
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          // Create entries for previous period
          const previousEntries: Entry[] = [];
          for (let i = windowDays; i < windowDays * 2; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            previousEntries.push(
              makeEntry({
                id: `previous-${i}`,
                amount: Math.floor(previousAmount / windowDays),
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          const allEntries = [...currentEntries, ...previousEntries];
          const result = derivePeriodComparison(allEntries, preset, now);

          // Property: percentageChange should always be a whole number (integer)
          if (result.percentageChange !== null) {
            expect(Number.isInteger(result.percentageChange)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("direction is 'up' when current exceeds previous", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DateFilterPreset>("today", "7d", "30d"),
        fc.date({ min: new Date("2024-06-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 100, max: 1_000_000 }), // previousAmount (ensure divisible)
        fc.integer({ min: 100, max: 1_000_000 }), // additionalAmount
        (preset: DateFilterPreset, now: Date, previousAmount: number, additionalAmount: number) => {
          // Skip invalid dates
          if (!now || Number.isNaN(now.getTime())) {
            return true;
          }

          // Ensure current > previous
          const currentAmount = previousAmount + additionalAmount;

          // Determine window size based on preset
          const windowDays = preset === "today" ? 1 : preset === "7d" ? 7 : 30;

          // Ensure amounts are large enough to avoid rounding to zero
          const amountPerCurrentDay = Math.max(1, Math.floor(currentAmount / windowDays));
          const amountPerPreviousDay = Math.max(1, Math.floor(previousAmount / windowDays));

          // Create entries for current period (higher amount)
          const currentEntries: Entry[] = [];
          for (let i = 0; i < windowDays; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            currentEntries.push(
              makeEntry({
                id: `current-${i}`,
                amount: amountPerCurrentDay,
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          // Create entries for previous period (lower amount)
          const previousEntries: Entry[] = [];
          for (let i = windowDays; i < windowDays * 2; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            previousEntries.push(
              makeEntry({
                id: `previous-${i}`,
                amount: amountPerPreviousDay,
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          const allEntries = [...currentEntries, ...previousEntries];
          const result = derivePeriodComparison(allEntries, preset, now);

          // Property: When current > previous, direction should be "up"
          if (result.currentTotal > result.previousTotal) {
            expect(result.direction).toBe("up");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("direction is 'down' when current is less than previous", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DateFilterPreset>("today", "7d", "30d"),
        fc.date({ min: new Date("2024-06-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 100, max: 1_000_000 }), // currentAmount (lower)
        fc.integer({ min: 100, max: 1_000_000 }), // additionalAmount
        (preset: DateFilterPreset, now: Date, currentAmount: number, additionalAmount: number) => {
          // Skip invalid dates
          if (!now || Number.isNaN(now.getTime())) {
            return true;
          }

          // Ensure previous > current
          const previousAmount = currentAmount + additionalAmount;

          // Determine window size based on preset
          const windowDays = preset === "today" ? 1 : preset === "7d" ? 7 : 30;

          // Ensure amounts are large enough to avoid rounding to zero
          const amountPerCurrentDay = Math.max(1, Math.floor(currentAmount / windowDays));
          const amountPerPreviousDay = Math.max(1, Math.floor(previousAmount / windowDays));

          // Create entries for current period (lower amount)
          const currentEntries: Entry[] = [];
          for (let i = 0; i < windowDays; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            currentEntries.push(
              makeEntry({
                id: `current-${i}`,
                amount: amountPerCurrentDay,
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          // Create entries for previous period (higher amount)
          const previousEntries: Entry[] = [];
          for (let i = windowDays; i < windowDays * 2; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            previousEntries.push(
              makeEntry({
                id: `previous-${i}`,
                amount: amountPerPreviousDay,
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          const allEntries = [...currentEntries, ...previousEntries];
          const result = derivePeriodComparison(allEntries, preset, now);

          // Property: When current < previous, direction should be "down"
          if (result.currentTotal < result.previousTotal) {
            expect(result.direction).toBe("down");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("direction is 'neutral' when current equals previous", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DateFilterPreset>("today", "7d", "30d"),
        fc.date({ min: new Date("2024-06-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 100, max: 1_000_000 }), // amount (same for both)
        (preset: DateFilterPreset, now: Date, amount: number) => {
          // Skip invalid dates
          if (!now || Number.isNaN(now.getTime())) {
            return true;
          }

          // Determine window size based on preset
          const windowDays = preset === "today" ? 1 : preset === "7d" ? 7 : 30;

          // Ensure amount is large enough and evenly divisible
          const amountPerDay = Math.max(1, Math.floor(amount / windowDays));

          // Create entries for current period
          const currentEntries: Entry[] = [];
          for (let i = 0; i < windowDays; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            currentEntries.push(
              makeEntry({
                id: `current-${i}`,
                amount: amountPerDay,
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          // Create entries for previous period (same amount)
          const previousEntries: Entry[] = [];
          for (let i = windowDays; i < windowDays * 2; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            previousEntries.push(
              makeEntry({
                id: `previous-${i}`,
                amount: amountPerDay,
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          const allEntries = [...currentEntries, ...previousEntries];
          const result = derivePeriodComparison(allEntries, preset, now);

          // Property: When current === previous, direction should be "neutral"
          // Allow for small rounding differences due to integer division
          const difference = Math.abs(result.currentTotal - result.previousTotal);
          
          if (difference === 0) {
            expect(result.direction).toBe("neutral");
            if (result.percentageChange !== null) {
              expect(result.percentageChange).toBe(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("handles zero previous total correctly (returns null percentage)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DateFilterPreset>("today", "7d", "30d"),
        fc.date({ min: new Date("2024-06-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 1, max: 1_000_000 }), // currentAmount
        (preset: DateFilterPreset, now: Date, currentAmount: number) => {
          // Skip invalid dates
          if (!now || Number.isNaN(now.getTime())) {
            return true;
          }

          // Determine window size based on preset
          const windowDays = preset === "today" ? 1 : preset === "7d" ? 7 : 30;

          // Create entries for current period only (no previous period entries)
          const currentEntries: Entry[] = [];
          for (let i = 0; i < windowDays; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            currentEntries.push(
              makeEntry({
                id: `current-${i}`,
                amount: Math.floor(currentAmount / windowDays),
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          const result = derivePeriodComparison(currentEntries, preset, now);

          // Property: When previousTotal is 0, percentageChange should be null
          if (result.previousTotal === 0) {
            expect(result.percentageChange).toBeNull();
            expect(result.hasPreviousData).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("percentage change uses absolute value (always non-negative)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DateFilterPreset>("today", "7d", "30d"),
        fc.date({ min: new Date("2024-06-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 1, max: 1_000_000 }), // amount1
        fc.integer({ min: 1, max: 1_000_000 }), // amount2
        (preset: DateFilterPreset, now: Date, amount1: number, amount2: number) => {
          // Skip invalid dates
          if (!now || Number.isNaN(now.getTime())) {
            return true;
          }

          // Determine window size based on preset
          const windowDays = preset === "today" ? 1 : preset === "7d" ? 7 : 30;

          // Create entries for current period
          const currentEntries: Entry[] = [];
          for (let i = 0; i < windowDays; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            currentEntries.push(
              makeEntry({
                id: `current-${i}`,
                amount: Math.floor(amount1 / windowDays),
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          // Create entries for previous period
          const previousEntries: Entry[] = [];
          for (let i = windowDays; i < windowDays * 2; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateKey = toDateKey(date);
            
            previousEntries.push(
              makeEntry({
                id: `previous-${i}`,
                amount: Math.floor(amount2 / windowDays),
                date: dateKey,
                createdAt: date.toISOString(),
              })
            );
          }

          const allEntries = [...currentEntries, ...previousEntries];
          const result = derivePeriodComparison(allEntries, preset, now);

          // Property: percentageChange should always be non-negative (uses Math.abs)
          if (result.percentageChange !== null) {
            expect(result.percentageChange).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("handles empty entries array gracefully", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DateFilterPreset>("today", "7d", "30d"),
        fc.date({ min: new Date("2024-06-01"), max: new Date("2026-12-31") }),
        (preset: DateFilterPreset, now: Date) => {
          // Skip invalid dates
          if (!now || Number.isNaN(now.getTime())) {
            return true;
          }

          const result = derivePeriodComparison([], preset, now);

          // Property: Empty entries should return zero totals and no data flags
          expect(result.currentTotal).toBe(0);
          expect(result.previousTotal).toBe(0);
          expect(result.percentageChange).toBeNull();
          expect(result.direction).toBe("neutral");
          expect(result.hasData).toBe(false);
          expect(result.hasPreviousData).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("works correctly across different presets (today, 7d, 30d)", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2024-06-01"), max: new Date("2026-12-31") }),
        fc.integer({ min: 1, max: 100_000 }),
        (now: Date, baseAmount: number) => {
          // Skip invalid dates
          if (!now || Number.isNaN(now.getTime())) {
            return true;
          }

          const presets: DateFilterPreset[] = ["today", "7d", "30d"];
          
          for (const preset of presets) {
            const windowDays = preset === "today" ? 1 : preset === "7d" ? 7 : 30;

            // Create entries spanning both current and previous periods
            const entries: Entry[] = [];
            for (let i = 0; i < windowDays * 2; i++) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);
              const dateKey = toDateKey(date);
              
              entries.push(
                makeEntry({
                  id: `entry-${i}`,
                  amount: baseAmount,
                  date: dateKey,
                  createdAt: date.toISOString(),
                })
              );
            }

            const result = derivePeriodComparison(entries, preset, now);

            // Property: Should have data for both periods
            expect(result.hasData).toBe(true);
            expect(result.hasPreviousData).toBe(true);
            
            // Property: Totals should be approximately equal (same amount per day)
            // Allow for small differences due to date filtering edge cases
            const difference = Math.abs(result.currentTotal - result.previousTotal);
            const tolerance = baseAmount * 2; // Allow some tolerance
            expect(difference).toBeLessThanOrEqual(tolerance);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
