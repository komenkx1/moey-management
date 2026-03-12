/**
 * Test infrastructure verification
 * Ensures fast-check and vitest are properly configured
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  arbitraryEntry,
  arbitraryDateString,
  makeEntry,
  toDateKey,
} from "../../helpers/test-generators";

describe("Test Infrastructure", () => {
  it("vitest is properly configured", () => {
    expect(true).toBe(true);
  });

  it("fast-check is installed and working", () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        expect(typeof n).toBe("number");
        return true;
      }),
      { numRuns: 10 }
    );
  });

  it("arbitraryEntry generates valid entries", () => {
    fc.assert(
      fc.property(arbitraryEntry(), (entry) => {
        expect(entry).toHaveProperty("id");
        expect(entry).toHaveProperty("text");
        expect(entry).toHaveProperty("amount");
        expect(entry).toHaveProperty("date");
        expect(entry).toHaveProperty("category");
        expect(entry.amount).toBeGreaterThanOrEqual(0);
        return true;
      }),
      { numRuns: 10 }
    );
  });

  it("arbitraryDateString generates valid date strings", () => {
    fc.assert(
      fc.property(arbitraryDateString(), (dateStr) => {
        expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const date = new Date(dateStr);
        expect(date.toString()).not.toBe("Invalid Date");
        return true;
      }),
      { numRuns: 10 }
    );
  });

  it("makeEntry creates valid test entries", () => {
    const entry = makeEntry();
    expect(entry.id).toBe("entry");
    expect(entry.amount).toBe(10000);
    expect(entry.category).toBe("Makan");

    const customEntry = makeEntry({ amount: 50000, text: "custom" });
    expect(customEntry.amount).toBe(50000);
    expect(customEntry.text).toBe("custom");
  });

  it("toDateKey formats dates correctly", () => {
    const date = new Date("2026-02-22T10:00:00.000Z");
    expect(toDateKey(date)).toBe("2026-02-22");

    const date2 = new Date("2026-01-05T10:00:00.000Z");
    expect(toDateKey(date2)).toBe("2026-01-05");
  });
});
