# Implementation Plan: UX Critical Improvements

## Overview

This implementation plan delivers three critical UX improvements to the KeMana expense tracking application:

1. **Today vs Average Insight**: Display today's spending compared to daily average
2. **Actionable Memory Recall**: Replace passive prompts with active, question-based prompts
3. **Period Comparison Context**: Add trend badges showing percentage change vs previous periods

The implementation follows a test-driven approach with property-based testing for correctness properties and unit tests for edge cases. All calculations are performed in utility modules (insight.ts, recall.ts) with UI components consuming the calculated data.

## Tasks

- [x] 1. Set up testing infrastructure and install dependencies
  - Install fast-check for property-based testing: `npm install --save-dev fast-check`
  - Verify vitest configuration supports property-based tests
  - Create test helper utilities for generating test data
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 2. Implement core calculation functions in insight.ts
  - [x] 2.1 Create TodayVsAverageInsight interface and deriveTodayVsAverageInsight function
    - Define TodayVsAverageInsight interface with todayTotal, dailyAverage, difference, direction, hasData, hasSufficientHistory fields
    - Implement deriveTodayVsAverageInsight(entries: Entry[], now: Date = new Date()): TodayVsAverageInsight
    - Filter entries for today using getFilteredEntries(entries, "today", now)
    - Calculate todayTotal using sumAmount(todayEntries)
    - Group historical entries by date, count active days (days with transactions)
    - Calculate dailyAverage = totalHistorical / activeDays (exclude zero-transaction days)
    - Calculate difference = todayTotal - dailyAverage
    - Determine direction: "up" if difference > 0, "down" if < 0, "neutral" if === 0
    - Set hasSufficientHistory = activeDays >= 3
    - Handle edge cases: empty entries, invalid dates, insufficient history
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9, 1.10, 4.1, 4.2, 4.3, 4.8, 4.9_

  - [x] 2.2 Write property test for Property 1: Today Total Calculation
    - **Property 1: Today Total Calculation**
    - **Validates: Requirements 1.1, 4.1**
    - Use fast-check to generate random entries and dates
    - Verify todayTotal equals sum of entries matching the given date
    - Run with minimum 100 iterations
    - _Requirements: 1.1, 4.1_

  - [x] 2.3 Write property test for Property 2: Daily Average Excludes Zero-Transaction Days
    - **Property 2: Daily Average Excludes Zero-Transaction Days**
    - **Validates: Requirements 1.2, 4.2, 4.3**
    - Generate entries with gaps (days without transactions)
    - Verify dailyAverage = total / count of unique dates with transactions
    - Run with minimum 100 iterations
    - _Requirements: 1.2, 4.2, 4.3_

  - [x] 2.4 Write property test for Property 3: Comparison Direction Correctness
    - **Property 3: Comparison Direction Correctness**
    - **Validates: Requirements 1.4, 1.5**
    - Generate random amounts for today and average
    - Verify direction is "up" when today > average, "down" when today < average, "neutral" when equal
    - Run with minimum 100 iterations
    - _Requirements: 1.4, 1.5_

  - [x] 2.5 Write property test for Property 4: Difference Calculation Accuracy
    - **Property 4: Difference Calculation Accuracy**
    - **Validates: Requirements 1.3, 1.7**
    - Generate random amounts for comparison
    - Verify difference equals absolute value of (todayTotal - dailyAverage)
    - Run with minimum 100 iterations
    - _Requirements: 1.3, 1.7_

  - [x] 2.6 Write unit tests for deriveTodayVsAverageInsight edge cases
    - Test empty entries array returns hasData: false
    - Test insufficient history (< 3 days) returns hasSufficientHistory: false
    - Test zero-transaction days are excluded from average calculation
    - Test invalid date defaults to new Date()
    - Test single day of data
    - Test first transaction is today
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_

- [x] 3. Implement period comparison calculation in insight.ts
  - [x] 3.1 Create PeriodComparisonInsight interface and derivePeriodComparison function
    - Define PeriodComparisonInsight interface with currentTotal, previousTotal, percentageChange, direction, hasData, hasPreviousData fields
    - Implement derivePeriodComparison(entries: Entry[], preset: DateFilterPreset = "30d", now: Date = new Date()): PeriodComparisonInsight
    - Get current period entries using getFilteredEntries(entries, preset, now)
    - Calculate currentTotal using sumAmount(currentEntries)
    - Calculate previous period start date: offsetDate(now, -windowDays * 2) to offsetDate(now, -windowDays)
    - Get previous period entries using getFilteredEntries with offset date
    - Calculate previousTotal using sumAmount(previousEntries)
    - Calculate percentageChange = Math.round(Math.abs((currentTotal - previousTotal) / previousTotal) * 100)
    - Handle edge case: if previousTotal === 0, set percentageChange to null
    - Determine direction based on currentTotal vs previousTotal
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.8, 3.9, 3.10, 4.4_

  - [x] 3.2 Write property test for Property 6: Period Comparison Window Consistency
    - **Property 6: Period Comparison Window Consistency**
    - **Validates: Requirements 3.1, 3.4, 3.8, 3.10, 4.4**
    - Generate entries across multiple periods
    - Verify previous period window has same length as current period
    - Verify percentageChange = Math.abs((current - previous) / previous) * 100 rounded to whole numbers
    - Run with minimum 100 iterations
    - _Requirements: 3.1, 3.4, 3.8, 3.10, 4.4_

  - [x] 3.3 Write unit tests for derivePeriodComparison edge cases
    - Test empty entries returns hasData: false
    - Test no previous period data returns hasPreviousData: false
    - Test previousTotal === 0 returns percentageChange: null
    - Test percentage rounding to whole numbers
    - Test zero percentage difference displays "Sama dengan bulan lalu"
    - _Requirements: 3.7, 3.9, 8.4_

- [x] 4. Checkpoint - Ensure calculation functions pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement relative time formatting in recall.ts
  - [x] 5.1 Create formatRelativeTime function
    - Implement formatRelativeTime(timestamp: number, now: number = Date.now()): string
    - Calculate diffMs = now - timestamp
    - If diffMs < 60 * 60 * 1000 (< 1 hour): return "${Math.floor(diffMs / 60000)} menit lalu"
    - If diffMs < 24 * 60 * 60 * 1000 (< 24 hours): return "${Math.floor(diffMs / 3600000)} jam lalu"
    - If diffMs < 48 * 60 * 60 * 1000 (< 48 hours): return "kemarin"
    - Else: return "${Math.floor(diffMs / 86400000)} hari lalu"
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 6.5_

  - [x] 5.2 Write property test for Property 5: Relative Time Formatting
    - **Property 5: Relative Time Formatting**
    - **Validates: Requirements 2.5, 2.6, 2.7, 2.8**
    - Generate random time differences (0 to 30 days)
    - Verify format matches time difference ranges: minutes (< 1h), hours (< 24h), "kemarin" (< 48h), days (>= 48h)
    - Verify all output is in Indonesian
    - Run with minimum 100 iterations
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

  - [x] 5.3 Write unit tests for formatRelativeTime edge cases
    - Test 30 minutes ago returns "30 menit lalu"
    - Test 5 hours ago returns "5 jam lalu"
    - Test 36 hours ago returns "kemarin"
    - Test 3 days ago returns "3 hari lalu"
    - Test boundary conditions (exactly 1 hour, exactly 24 hours, exactly 48 hours)
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

- [x] 6. Update recall prompts in recall.ts
  - [x] 6.1 Modify getSmartRecallPrompt to use new wording and formatRelativeTime
    - Update gap recall: "Terakhir mencatat ${formatRelativeTime(lastEntryTimestamp, now)} - Ingat ada pengeluaran setelah itu?"
    - Update first today recall: "Belum ada catatan hari ini - Ada transaksi yang belum dicatat?"
    - Update comeback recall: "Kamu sempat keluar tadi? - Ada pengeluaran yang belum dicatat?"
    - Maintain existing smart detection logic for gap, first_today, and comeback conditions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.9, 2.10, 6.4_

  - [x] 6.2 Write unit tests for updated recall prompts
    - Test gap recall uses formatRelativeTime and new wording
    - Test first today recall uses new wording
    - Test comeback recall uses new wording
    - Test existing detection logic still works correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.9, 2.10_

- [x] 7. Checkpoint - Ensure recall functions pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Update HomeTabContent component to display today vs average
  - [x] 8.1 Add todayVsAverageInsight calculation and display
    - Import deriveTodayVsAverageInsight from insight.ts
    - Calculate todayVsAverageInsight using useMemo with [entries, now] dependencies
    - Add comparison section to Insight Card with border-t separator
    - Display "Hari ini vs Rata-rata:" label
    - Show direction arrow (↑ for up, ↓ for down, → for neutral)
    - Display absolute difference amount formatted with formatAmountIDR
    - Show "Butuh lebih banyak data" when hasSufficientHistory is false
    - Handle null/error cases gracefully with try-catch
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 5.1, 5.5, 5.7, 8.1, 8.4_

  - [~] 8.2 Write integration tests for HomeTabContent with today vs average
    - Test component displays "Hari ini vs Rata-rata" label
    - Test component displays formatted amounts
    - Test component displays correct direction arrows
    - Test component shows fallback message for insufficient data
    - Test component handles empty entries gracefully
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1_

- [ ] 9. Update SummaryHeroCard component to display trend badge
  - [x] 9.1 Add trendBadge prop and display logic
    - Add optional trendBadge prop to SummaryHeroCardProps: { label: string; tone: "up" | "down" | "neutral" } | null
    - Display trend badge next to period label when trendBadge is provided
    - Use conditional styling: red/danger for "up", green/success for "down", neutral/gray for "neutral"
    - Format badge with rounded-full, px-2.5 py-1, text-[11px] font-semibold
    - Omit badge when trendBadge is null (insufficient previous data)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 5.2, 5.3, 5.4, 5.6_

  - [~] 9.2 Write integration tests for SummaryHeroCard with trend badge
    - Test component displays trend badge when provided
    - Test component uses correct colors for up/down/neutral
    - Test component omits badge when trendBadge is null
    - Test badge displays percentage and comparison text
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.9_

- [ ] 10. Wire up calculations in dashboard page (page.tsx)
  - [x] 10.1 Calculate todayVsAverageInsight and periodComparison in dashboard
    - Import deriveTodayVsAverageInsight and derivePeriodComparison from insight.ts
    - Calculate todayVsAverageInsight using useMemo with [entries, now] dependencies
    - Calculate periodComparison using useMemo with [entries, now] dependencies
    - Create trendBadge object from periodComparison results
    - Format trend badge label: "↑ X% dibanding bulan lalu" for up, "↓ X% dibanding bulan lalu" for down, "Sama dengan bulan lalu" for zero
    - Pass todayVsAverageInsight to HomeTabContent component
    - Pass trendBadge to SummaryHeroCard component
    - _Requirements: 3.5, 3.6, 3.7, 4.5, 4.6, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9_

  - [~] 10.2 Write integration tests for dashboard wiring
    - Test todayVsAverageInsight is calculated and passed to HomeTabContent
    - Test periodComparison is calculated and trendBadge is passed to SummaryHeroCard
    - Test calculations are memoized correctly
    - Test error handling when calculations fail
    - _Requirements: 4.5, 4.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9, 8.4_

- [ ] 11. Add property tests for remaining correctness properties
  - [~] 11.1 Write property test for Property 7: Timezone Consistency
    - **Property 7: Timezone Consistency**
    - **Validates: Requirements 4.8**
    - Generate entries with various timestamps
    - Verify "today" calculation uses consistent timezone across all operations
    - Run with minimum 100 iterations
    - _Requirements: 4.8_

  - [~] 11.2 Write property test for Property 8: Currency Precision
    - **Property 8: Currency Precision**
    - **Validates: Requirements 4.9, 6.1**
    - Generate random currency amounts with various decimal places
    - Verify calculations maintain 2 decimal precision
    - Verify formatted output uses Indonesian Rupiah format with period separators
    - Run with minimum 100 iterations
    - _Requirements: 4.9, 6.1_

  - [~] 11.3 Write property test for Property 9: Negative Amount Handling
    - **Property 9: Negative Amount Handling**
    - **Validates: Requirements 8.7**
    - Generate entries with mix of positive and negative amounts (refunds)
    - Verify all calculations include negative amounts correctly
    - Verify totals, averages, and comparisons handle negatives properly
    - Run with minimum 100 iterations
    - _Requirements: 8.7_

  - [~] 11.4 Write property test for Property 10: Graceful Error Handling
    - **Property 10: Graceful Error Handling**
    - **Validates: Requirements 8.4, 8.10**
    - Generate edge-case inputs: empty arrays, null values, invalid dates
    - Verify functions return valid result objects with appropriate flags
    - Verify no errors are thrown for invalid inputs
    - Run with minimum 100 iterations
    - _Requirements: 8.4, 8.10_

- [~] 12. Checkpoint - Ensure all property tests and integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Add visual design and accessibility improvements
  - [~] 13.1 Verify color contrast and accessibility compliance
    - Verify all text elements meet WCAG AA contrast standards
    - Verify trend badges use both color and iconography (arrows)
    - Verify upward trends use red/warning colors (higher spending)
    - Verify downward trends use green/success colors (lower spending)
    - Verify recall prompts are visually distinct
    - Verify consistent typography and spacing with existing design system
    - Test both light and dark mode themes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [~] 13.2 Write accessibility tests
    - Test color contrast ratios for all new text elements
    - Test screen reader compatibility for new UI elements
    - Test keyboard navigation for interactive elements (if any)
    - _Requirements: 5.1, 5.2, 5.9_

- [ ] 14. Add localization and formatting verification
  - [~] 14.1 Verify Indonesian localization and formatting
    - Verify all currency amounts use Indonesian Rupiah format (Rp with period separators)
    - Verify all new text elements are in Indonesian
    - Verify informal Indonesian ("kamu") is used in recall prompts
    - Verify relative time strings are in Indonesian
    - Verify trend badge labels are in Indonesian
    - Verify percentage formatting follows Indonesian conventions
    - Verify consistent terminology with existing KeMana interface
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [~] 14.2 Write localization tests
    - Test currency formatting matches Indonesian conventions
    - Test all text strings are in Indonesian
    - Test relative time formatting is in Indonesian
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 15. Performance testing and optimization
  - [~] 15.1 Verify performance requirements
    - Test dashboard loads and renders within 500ms on typical devices
    - Verify calculations complete in < 10ms for typical dataset (1000 entries)
    - Verify memoization prevents redundant calculations
    - Test cache invalidation when new transactions are added
    - Test with large datasets (10k+ entries) to ensure performance scales
    - _Requirements: 4.5, 4.6, 4.7, 7.9_

  - [~] 15.2 Write performance tests
    - Test calculation performance with 1000 entries
    - Test calculation performance with 10000 entries
    - Test memoization effectiveness
    - Test cache invalidation behavior
    - _Requirements: 4.5, 4.6, 4.7_

- [ ] 16. Final integration and edge case testing
  - [~] 16.1 Write comprehensive edge case tests
    - Test no transactions scenario displays onboarding message
    - Test only one day of data displays today total without comparison
    - Test user's first transaction is today handles missing average gracefully
    - Test network failure uses cached data if available
    - Test timezone unavailable defaults to device timezone
    - Test extremely large transaction amounts format without overflow
    - Test percentage calculations resulting in infinity or NaN display fallback
    - Test all input data validation prevents runtime errors
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

- [~] 17. Final checkpoint - Ensure all tests pass and feature is complete
  - Run all unit tests, property tests, integration tests, and e2e tests
  - Verify all acceptance criteria are met
  - Verify no existing tests are broken
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (10 properties total)
- Unit tests validate specific examples and edge cases
- Integration tests validate UI component behavior
- All calculations use existing utility functions (getFilteredEntries, sumAmount, formatAmountIDR)
- No new Zustand state slices needed - calculations derive from existing entries
- TypeScript is used for all implementation (design document specifies TypeScript)
- fast-check library is used for property-based testing with minimum 100 iterations per test
- All new strings are in Indonesian following existing KeMana conventions

## Test File Organization

Property-based tests should be created in:
- `apps/web/tests/unit/lib/insight-calculations.property.test.ts` (Properties 1-4, 6-10)
- `apps/web/tests/unit/app/recall-formatting.property.test.ts` (Property 5)

Unit tests should be created in:
- `apps/web/tests/unit/lib/insight-today-vs-average.test.ts`
- `apps/web/tests/unit/lib/insight-period-comparison.test.ts`
- `apps/web/tests/unit/app/recall-prompts.test.ts`

Integration tests should be created in:
- `apps/web/tests/unit/components/HomeTabContent-insights.test.tsx`
- `apps/web/tests/unit/components/SummaryHeroCard-trend.test.tsx`
