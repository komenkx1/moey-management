/**
 * Test data generators for property-based testing with fast-check
 * Used across UX critical improvements tests
 */

import fc from "fast-check";
import type { Entry, Category, PaymentMethod } from "@kemana/core/types";

/**
 * Generates a valid date string in YYYY-MM-DD format
 * Range: 2020-01-01 to 2030-12-31
 */
export const arbitraryDateString = (): fc.Arbitrary<string> => {
  return fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map((date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    });
};

/**
 * Generates a valid ISO timestamp string
 * Range: 2020-01-01 to 2030-12-31
 */
export const arbitraryISOTimestamp = (): fc.Arbitrary<string> => {
  return fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .filter((date) => !Number.isNaN(date.getTime()))
    .map((date) => date.toISOString());
};

/**
 * Generates a valid category
 */
export const arbitraryCategory = (): fc.Arbitrary<Category> => {
  return fc.constantFrom(
    "Makan",
    "Transport",
    "Belanja",
    "Tagihan",
    "Hiburan",
    "Lainnya"
  );
};

/**
 * Generates a valid payment method
 */
export const arbitraryPaymentMethod = (): fc.Arbitrary<PaymentMethod> => {
  return fc.constantFrom(
    "Unknown",
    "Cash",
    "QRIS",
    "Debit",
    "Credit",
    "Transfer"
  );
};

/**
 * Generates a valid Entry object
 * Amounts are positive by default (0 to 10,000,000)
 */
export const arbitraryEntry = (
  overrides?: Partial<Entry>
): fc.Arbitrary<Entry> => {
  return fc.record({
    id: fc.uuid(),
    text: fc.string({ minLength: 1, maxLength: 100 }),
    amount: fc.integer({ min: 0, max: 10_000_000 }),
    date: arbitraryDateString(),
    category: arbitraryCategory(),
    paymentMethod: arbitraryPaymentMethod(),
    source: fc.constant("test" as const),
    createdAt: arbitraryISOTimestamp(),
    updatedAt: arbitraryISOTimestamp(),
  }).map((entry) => ({
    ...entry,
    ...overrides,
  }));
};

/**
 * Generates an Entry with a specific date
 */
export const arbitraryEntryWithDate = (
  date: string
): fc.Arbitrary<Entry> => {
  return arbitraryEntry({ date });
};

/**
 * Generates an Entry with a specific amount
 */
export const arbitraryEntryWithAmount = (
  amount: number
): fc.Arbitrary<Entry> => {
  return arbitraryEntry({ amount });
};

/**
 * Generates an array of entries with dates within a specific range
 */
export const arbitraryEntriesInDateRange = (
  startDate: Date,
  endDate: Date,
  minLength = 0,
  maxLength = 100
): fc.Arbitrary<Entry[]> => {
  const dateArbitrary = fc
    .date({ min: startDate, max: endDate })
    .map((date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    });

  return fc.array(
    fc.record({
      id: fc.uuid(),
      text: fc.string({ minLength: 1, maxLength: 100 }),
      amount: fc.integer({ min: 0, max: 10_000_000 }),
      date: dateArbitrary,
      category: arbitraryCategory(),
      paymentMethod: arbitraryPaymentMethod(),
      source: fc.constant("test" as const),
      createdAt: arbitraryISOTimestamp(),
      updatedAt: arbitraryISOTimestamp(),
    }),
    { minLength, maxLength }
  );
};

/**
 * Generates entries that may include negative amounts (refunds)
 */
export const arbitraryEntryWithNegativeAmounts = (): fc.Arbitrary<Entry> => {
  return fc.record({
    id: fc.uuid(),
    text: fc.string({ minLength: 1, maxLength: 100 }),
    amount: fc.integer({ min: -1_000_000, max: 10_000_000 }),
    date: arbitraryDateString(),
    category: arbitraryCategory(),
    paymentMethod: arbitraryPaymentMethod(),
    source: fc.constant("test" as const),
    createdAt: arbitraryISOTimestamp(),
    updatedAt: arbitraryISOTimestamp(),
  });
};

/**
 * Helper to create a simple Entry for unit tests
 */
export function makeEntry(overrides?: Partial<Entry>): Entry {
  const fallbackIso = new Date("2026-02-22T10:00:00.000Z").toISOString();
  return {
    id: "entry",
    text: "test",
    amount: 10000,
    date: "2026-02-22",
    category: "Makan",
    paymentMethod: "Cash",
    source: "test",
    createdAt: fallbackIso,
    updatedAt: fallbackIso,
    ...overrides,
  };
}

/**
 * Converts a Date to YYYY-MM-DD format
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Creates entries with specific totals for testing comparisons
 * Useful for testing today vs average and period comparisons
 */
export function createEntriesWithTotals(
  todayTotal: number,
  historicalTotal: number,
  todayDate: string = "2026-02-22",
  historicalDates: string[] = ["2026-02-21", "2026-02-20", "2026-02-19"]
): Entry[] {
  const entries: Entry[] = [];

  // Create today's entry
  if (todayTotal > 0) {
    entries.push(
      makeEntry({
        id: "today-1",
        amount: todayTotal,
        date: todayDate,
        createdAt: new Date(`${todayDate}T10:00:00.000Z`).toISOString(),
      })
    );
  }

  // Distribute historical total across multiple days
  if (historicalTotal > 0 && historicalDates.length > 0) {
    const amountPerDay = Math.floor(historicalTotal / historicalDates.length);
    historicalDates.forEach((date, index) => {
      entries.push(
        makeEntry({
          id: `historical-${index + 1}`,
          amount: amountPerDay,
          date,
          createdAt: new Date(`${date}T10:00:00.000Z`).toISOString(),
        })
      );
    });
  }

  return entries;
}
