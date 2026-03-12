# Test Helpers for UX Critical Improvements

This directory contains test data generators and utilities for property-based testing using fast-check.

## Overview

The test helpers provide:
- **Property-based test generators** using fast-check
- **Unit test helpers** for creating test data
- **Date and time utilities** for consistent test data

## Files

### `test-generators.ts`

Contains all test data generators and helper functions.

## Usage

### Property-Based Testing

Property-based tests verify that properties hold true across many randomly generated inputs:

```typescript
import fc from "fast-check";
import { arbitraryEntry, arbitraryDateString } from "../../helpers/test-generators";

// Feature: ux-critical-improvements, Property 1: Today Total Calculation
test("today total equals sum of entries for given date", () => {
  fc.assert(
    fc.property(
      fc.array(arbitraryEntry()),
      arbitraryDateString(),
      (entries, dateStr) => {
        // Test logic here
        expect(result).toBe(expected);
      }
    ),
    { numRuns: 100 } // Run 100 iterations
  );
});
```

### Unit Testing

Unit tests use the `makeEntry` helper for specific test cases:

```typescript
import { makeEntry } from "../../helpers/test-generators";

test("handles empty entries", () => {
  const entries = [];
  const result = calculateTotal(entries);
  expect(result).toBe(0);
});

test("calculates total correctly", () => {
  const entries = [
    makeEntry({ amount: 10000, date: "2026-02-22" }),
    makeEntry({ amount: 20000, date: "2026-02-22" }),
  ];
  const result = calculateTotal(entries);
  expect(result).toBe(30000);
});
```

## Available Generators

### Basic Generators

- `arbitraryDateString()` - Generates valid YYYY-MM-DD date strings (2020-2030)
- `arbitraryISOTimestamp()` - Generates valid ISO timestamp strings
- `arbitraryCategory()` - Generates valid category values
- `arbitraryPaymentMethod()` - Generates valid payment method values

### Entry Generators

- `arbitraryEntry(overrides?)` - Generates complete Entry objects
- `arbitraryEntryWithDate(date)` - Generates Entry with specific date
- `arbitraryEntryWithAmount(amount)` - Generates Entry with specific amount
- `arbitraryEntriesInDateRange(start, end, minLength?, maxLength?)` - Generates array of entries within date range
- `arbitraryEntryWithNegativeAmounts()` - Generates entries that may have negative amounts (refunds)

### Helper Functions

- `makeEntry(overrides?)` - Creates a simple Entry for unit tests
- `toDateKey(date)` - Converts Date to YYYY-MM-DD string
- `createEntriesWithTotals(todayTotal, historicalTotal, todayDate?, historicalDates?)` - Creates entries with specific totals for comparison testing

## Examples

### Testing Today vs Average

```typescript
import fc from "fast-check";
import { arbitraryEntry, toDateKey } from "../../helpers/test-generators";
import { deriveTodayVsAverageInsight } from "@/lib/dashboard-page-utils/insight";

// Feature: ux-critical-improvements, Property 1: Today Total Calculation
test("today total equals sum of entries for given date", () => {
  fc.assert(
    fc.property(
      fc.array(arbitraryEntry()),
      fc.date(),
      (entries, date) => {
        const result = deriveTodayVsAverageInsight(entries, date);
        const todayKey = toDateKey(date);
        const expectedTotal = entries
          .filter(e => e.date === todayKey)
          .reduce((sum, e) => sum + e.amount, 0);
        
        expect(result.todayTotal).toBe(expectedTotal);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Testing with Specific Scenarios

```typescript
import { makeEntry, createEntriesWithTotals } from "../../helpers/test-generators";

test("handles insufficient history", () => {
  const entries = [
    makeEntry({ date: "2026-02-22", amount: 100 }),
    makeEntry({ date: "2026-02-21", amount: 200 })
  ];
  const result = deriveTodayVsAverageInsight(entries, new Date("2026-02-22"));
  expect(result.hasSufficientHistory).toBe(false);
});

test("compares today vs average correctly", () => {
  const entries = createEntriesWithTotals(
    50000, // today total
    30000, // historical total (distributed across 3 days = 10000/day average)
    "2026-02-22",
    ["2026-02-21", "2026-02-20", "2026-02-19"]
  );
  const result = deriveTodayVsAverageInsight(entries, new Date("2026-02-22"));
  expect(result.todayTotal).toBe(50000);
  expect(result.dailyAverage).toBe(10000);
  expect(result.direction).toBe("up");
});
```

### Testing Edge Cases

```typescript
import { arbitraryEntryWithNegativeAmounts } from "../../helpers/test-generators";

// Feature: ux-critical-improvements, Property 9: Negative Amount Handling
test("handles negative amounts (refunds) correctly", () => {
  fc.assert(
    fc.property(
      fc.array(arbitraryEntryWithNegativeAmounts()),
      (entries) => {
        const result = calculateTotal(entries);
        const expected = entries.reduce((sum, e) => sum + e.amount, 0);
        expect(result).toBe(expected);
      }
    ),
    { numRuns: 100 }
  );
});
```

## Best Practices

1. **Use property-based tests for universal properties** - Test that properties hold across all inputs
2. **Use unit tests for specific examples** - Test edge cases and specific scenarios
3. **Run at least 100 iterations** - Use `{ numRuns: 100 }` for property tests
4. **Tag property tests** - Use comment format: `// Feature: ux-critical-improvements, Property X: Name`
5. **Test edge cases separately** - Empty arrays, null values, boundary conditions
6. **Use descriptive test names** - Clearly state what property or behavior is being tested

## Configuration

The test infrastructure is configured in `vitest.config.ts`:

- Test environment: `happy-dom`
- Test pattern: `tests/unit/**/*.{test,spec}.?(c|m)[jt]s?(x)`
- Aliases configured for `@/` and `@kemana/` imports

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/lib/test-infrastructure.test.ts

# Run tests in watch mode (development)
npx vitest

# Run with coverage
npx vitest --coverage
```

## Dependencies

- **fast-check** - Property-based testing library
- **vitest** - Test runner
- **@testing-library/react** - Component testing utilities
- **happy-dom** - DOM environment for tests
