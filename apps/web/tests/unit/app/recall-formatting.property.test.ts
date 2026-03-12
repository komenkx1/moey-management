/**
 * Property-based tests for recall formatting functions
 * Feature: ux-critical-improvements
 */

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { formatRelativeTime } from "@/app/recall";

describe("Property 5: Relative Time Formatting", () => {
  /**
   * **Validates: Requirements 2.5, 2.6, 2.7, 2.8**
   * 
   * For any timestamp and current time, the relative time formatter should produce
   * Indonesian text in the format:
   * - minutes for differences < 1 hour
   * - hours for differences < 24 hours
   * - "kemarin" for differences < 48 hours
   * - days for longer differences
   */
  test("relative time format matches time difference ranges", () => {
    fc.assert(
      fc.property(
        // Generate random time differences from 0 to 30 days in milliseconds
        fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }),
        (diffMs) => {
          const now = Date.now();
          const timestamp = now - diffMs;
          const result = formatRelativeTime(timestamp, now);

          // Verify format matches time difference ranges
          if (diffMs < 60 * 60 * 1000) {
            // Less than 1 hour: should show minutes
            expect(result).toMatch(/^\d+ menit lalu$/);
            
            // Verify the number is correct
            const expectedMinutes = Math.floor(diffMs / 60000);
            expect(result).toBe(`${expectedMinutes} menit lalu`);
          } else if (diffMs < 24 * 60 * 60 * 1000) {
            // Less than 24 hours: should show hours
            expect(result).toMatch(/^\d+ jam lalu$/);
            
            // Verify the number is correct
            const expectedHours = Math.floor(diffMs / 3600000);
            expect(result).toBe(`${expectedHours} jam lalu`);
          } else if (diffMs < 48 * 60 * 60 * 1000) {
            // Less than 48 hours: should show "kemarin"
            expect(result).toBe("kemarin");
          } else {
            // 48 hours or more: should show days
            expect(result).toMatch(/^\d+ hari lalu$/);
            
            // Verify the number is correct
            const expectedDays = Math.floor(diffMs / 86400000);
            expect(result).toBe(`${expectedDays} hari lalu`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("all output is in Indonesian", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }),
        (diffMs) => {
          const now = Date.now();
          const timestamp = now - diffMs;
          const result = formatRelativeTime(timestamp, now);

          // Verify output contains only Indonesian words
          const indonesianWords = ["menit", "jam", "kemarin", "hari", "lalu"];
          const hasIndonesianWord = indonesianWords.some(word => result.includes(word));
          expect(hasIndonesianWord).toBe(true);

          // Verify no English words are present
          const englishWords = ["minute", "hour", "day", "ago", "yesterday"];
          const hasEnglishWord = englishWords.some(word => result.toLowerCase().includes(word));
          expect(hasEnglishWord).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("boundary conditions are handled correctly", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Exactly 1 hour
          60 * 60 * 1000,
          // Exactly 24 hours
          24 * 60 * 60 * 1000,
          // Exactly 48 hours
          48 * 60 * 60 * 1000,
          // Just before 1 hour
          60 * 60 * 1000 - 1,
          // Just before 24 hours
          24 * 60 * 60 * 1000 - 1,
          // Just before 48 hours
          48 * 60 * 60 * 1000 - 1,
          // Just after 1 hour
          60 * 60 * 1000 + 1,
          // Just after 24 hours
          24 * 60 * 60 * 1000 + 1,
          // Just after 48 hours
          48 * 60 * 60 * 1000 + 1
        ),
        (diffMs) => {
          const now = Date.now();
          const timestamp = now - diffMs;
          const result = formatRelativeTime(timestamp, now);

          // Verify result is a valid Indonesian time format
          const validFormats = [
            /^\d+ menit lalu$/,
            /^\d+ jam lalu$/,
            /^kemarin$/,
            /^\d+ hari lalu$/
          ];
          
          const matchesFormat = validFormats.some(format => format.test(result));
          expect(matchesFormat).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("zero time difference returns 0 menit lalu", () => {
    const now = Date.now();
    const result = formatRelativeTime(now, now);
    expect(result).toBe("0 menit lalu");
  });

  test("very small time differences (< 1 minute) return 0 menit lalu", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 59999 }), // 0 to 59 seconds
        (diffMs) => {
          const now = Date.now();
          const timestamp = now - diffMs;
          const result = formatRelativeTime(timestamp, now);
          expect(result).toBe("0 menit lalu");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("time differences are calculated correctly across all ranges", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 * 24 * 60 * 60 * 1000 }),
        (diffMs) => {
          const now = Date.now();
          const timestamp = now - diffMs;
          const result = formatRelativeTime(timestamp, now);

          // Extract the number from the result (if present)
          const match = result.match(/^(\d+)/);
          
          if (match) {
            const displayedNumber = parseInt(match[1], 10);
            
            if (result.includes("menit")) {
              const expectedMinutes = Math.floor(diffMs / 60000);
              expect(displayedNumber).toBe(expectedMinutes);
            } else if (result.includes("jam")) {
              const expectedHours = Math.floor(diffMs / 3600000);
              expect(displayedNumber).toBe(expectedHours);
            } else if (result.includes("hari")) {
              const expectedDays = Math.floor(diffMs / 86400000);
              expect(displayedNumber).toBe(expectedDays);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
