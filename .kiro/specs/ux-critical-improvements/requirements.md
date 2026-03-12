# Requirements Document

## Introduction

This document specifies requirements for three critical UX improvements to the KeMana expense tracking application. These improvements address key usability issues discovered through dogfooding and UX analysis, specifically focusing on how users log expenses retrospectively rather than in real-time. The improvements enhance daily spending awareness, improve memory recall prompting, and add contextual comparisons to make large numbers more meaningful.

## Glossary

- **Home_Dashboard**: The main screen users see when opening the app, containing summary cards and insights
- **Insight_Card**: A UI component on the Home_Dashboard that displays spending status and actionable prompts
- **Summary_Hero_Card**: A UI component on the Home_Dashboard showing 30-day spending totals, transaction count, and averages
- **Memory_Recall_System**: The system that prompts users to log expenses they may have forgotten
- **Daily_Average**: The average daily spending calculated from historical transaction data
- **Today_Total**: The sum of all expenses logged for the current calendar day
- **Period_Comparison**: A percentage-based comparison between current and previous time periods
- **Recall_Prompt**: Text displayed to users encouraging them to remember and log past expenses
- **Gap_Recall**: A recall prompt shown when significant time has passed since last logging
- **First_Today_Recall**: A recall prompt shown when no expenses have been logged today
- **Comeback_Recall**: A recall prompt shown when user returns after being away
- **Insight_Tab**: A separate tab containing comprehensive analytics and spending trends
- **Trend_Badge**: A visual indicator showing spending direction (up/down) with percentage

## Requirements

### Requirement 1: Today vs Average Daily Spending Comparison

**User Story:** As a KeMana user, I want to see how today's spending compares to my average daily spending, so that I can quickly understand if today is a high or low spending day.

#### Acceptance Criteria

1. WHEN the Home_Dashboard loads, THE Insight_Card SHALL display the Today_Total amount
2. WHEN the Home_Dashboard loads, THE Insight_Card SHALL display the Daily_Average amount
3. WHEN the Home_Dashboard loads, THE Insight_Card SHALL calculate the difference between Today_Total and Daily_Average
4. WHEN Today_Total exceeds Daily_Average, THE Insight_Card SHALL display an upward arrow indicator
5. WHEN Today_Total is below Daily_Average, THE Insight_Card SHALL display a downward arrow indicator
6. WHEN Today_Total equals Daily_Average, THE Insight_Card SHALL display a neutral indicator
7. THE Insight_Card SHALL display the absolute difference amount between Today_Total and Daily_Average
8. THE Insight_Card SHALL use the label "Hari ini vs Rata-rata" for the comparison section
9. WHEN Today_Total is zero, THE Insight_Card SHALL display "Rp0" for today's spending
10. WHEN insufficient historical data exists to calculate Daily_Average, THE Insight_Card SHALL display a fallback message indicating more data is needed

### Requirement 2: Actionable Memory Recall Prompts

**User Story:** As a KeMana user, I want memory recall prompts that actively trigger my memory, so that I remember to log expenses I made earlier.

#### Acceptance Criteria

1. WHEN a Gap_Recall condition is detected, THE Memory_Recall_System SHALL display "Terakhir mencatat [time_ago] - Ingat ada pengeluaran setelah itu?"
2. WHEN a First_Today_Recall condition is detected, THE Memory_Recall_System SHALL display "Belum ada catatan hari ini - Ada transaksi yang belum dicatat?"
3. WHEN a Comeback_Recall condition is detected, THE Memory_Recall_System SHALL display "Kamu sempat keluar tadi? - Ada pengeluaran yang belum dicatat?"
4. THE Memory_Recall_System SHALL replace passive wording with question-based prompts
5. THE Memory_Recall_System SHALL calculate time_ago as a human-readable relative time (e.g., "3 jam lalu", "kemarin")
6. WHEN time_ago is less than 1 hour, THE Memory_Recall_System SHALL display minutes (e.g., "30 menit lalu")
7. WHEN time_ago is between 1 and 24 hours, THE Memory_Recall_System SHALL display hours (e.g., "5 jam lalu")
8. WHEN time_ago is 24 hours or more, THE Memory_Recall_System SHALL display days (e.g., "2 hari lalu")
9. THE Recall_Prompt SHALL maintain existing smart detection logic for gap, first_today, and comeback conditions
10. THE Recall_Prompt SHALL be displayed in the Insight_Card on the Home_Dashboard

### Requirement 3: Period Comparison Context for Large Numbers

**User Story:** As a KeMana user, I want to see how my current spending compares to previous periods, so that I can understand spending trends and make large numbers more meaningful.

#### Acceptance Criteria

1. WHEN the Summary_Hero_Card displays a 30-day total, THE Summary_Hero_Card SHALL calculate the comparison with the previous 30-day period
2. WHEN current period spending exceeds previous period spending, THE Summary_Hero_Card SHALL display an upward Trend_Badge
3. WHEN current period spending is below previous period spending, THE Summary_Hero_Card SHALL display a downward Trend_Badge
4. THE Trend_Badge SHALL display the percentage difference between current and previous periods
5. THE Trend_Badge SHALL use the format "↑ X% dibanding bulan lalu" for increases
6. THE Trend_Badge SHALL use the format "↓ X% dibanding bulan lalu" for decreases
7. WHEN the percentage difference is zero, THE Summary_Hero_Card SHALL display "Sama dengan bulan lalu"
8. THE Summary_Hero_Card SHALL round percentage values to whole numbers
9. WHEN insufficient data exists for previous period comparison, THE Summary_Hero_Card SHALL omit the Trend_Badge
10. THE Period_Comparison SHALL use the same time window length for both current and previous periods

### Requirement 4: Data Calculation and Performance

**User Story:** As a KeMana user, I want the dashboard to load quickly with accurate calculations, so that I can check my spending without delays.

#### Acceptance Criteria

1. THE Home_Dashboard SHALL calculate Today_Total from all transactions with today's date
2. THE Home_Dashboard SHALL calculate Daily_Average from historical transactions within the available data range
3. WHEN calculating Daily_Average, THE System SHALL exclude days with zero transactions
4. WHEN calculating Period_Comparison, THE System SHALL use transactions from the exact previous period window
5. THE System SHALL cache calculation results to avoid redundant computations
6. WHEN new transactions are added, THE System SHALL invalidate relevant caches and recalculate affected metrics
7. THE Home_Dashboard SHALL complete all calculations and render within 500 milliseconds on typical devices
8. THE System SHALL handle timezone differences correctly when determining "today" for Today_Total
9. FOR ALL calculations involving currency amounts, THE System SHALL maintain precision to 2 decimal places
10. THE System SHALL handle edge cases where transaction data is empty or incomplete without errors

### Requirement 5: Visual Design and Accessibility

**User Story:** As a KeMana user, I want the new UI elements to be visually clear and accessible, so that I can easily understand the information regardless of my visual abilities.

#### Acceptance Criteria

1. THE Insight_Card SHALL use sufficient color contrast for all text elements to meet WCAG AA standards
2. THE Trend_Badge SHALL use color and iconography together to convey direction (not color alone)
3. WHEN displaying upward trends, THE System SHALL use red or warning colors to indicate higher spending
4. WHEN displaying downward trends, THE System SHALL use green or success colors to indicate lower spending
5. THE Insight_Card SHALL maintain visual hierarchy with today's spending as the most prominent element
6. THE Summary_Hero_Card SHALL integrate the Trend_Badge without disrupting existing layout
7. THE Recall_Prompt SHALL be visually distinct from other text in the Insight_Card
8. THE System SHALL use consistent typography and spacing with existing KeMana design system
9. THE System SHALL support both light and dark mode themes for all new UI elements
10. THE System SHALL ensure all interactive elements have minimum touch target sizes of 44x44 pixels

### Requirement 6: Localization and Formatting

**User Story:** As a KeMana user, I want all text and numbers formatted according to Indonesian conventions, so that the interface feels natural and familiar.

#### Acceptance Criteria

1. THE System SHALL format all currency amounts using Indonesian Rupiah format (e.g., "Rp3.110.537")
2. THE System SHALL use period separators for thousands in currency amounts
3. THE System SHALL use Indonesian language for all new text elements
4. THE Recall_Prompt SHALL use informal Indonesian ("kamu") to maintain friendly tone
5. THE System SHALL format relative time strings in Indonesian (e.g., "3 jam lalu", "kemarin")
6. THE Trend_Badge SHALL use Indonesian text for comparison labels
7. THE System SHALL handle singular and plural forms correctly in Indonesian
8. WHEN displaying percentages, THE System SHALL use Indonesian number formatting conventions
9. THE System SHALL maintain consistent terminology with existing KeMana interface
10. THE System SHALL support future localization to other languages through string externalization

### Requirement 7: Integration and Compatibility

**User Story:** As a KeMana developer, I want the new features to integrate seamlessly with existing code, so that we maintain system stability and don't break current functionality.

#### Acceptance Criteria

1. THE System SHALL use existing Zustand state management for all new data requirements
2. THE System SHALL integrate with existing insight.ts utility functions
3. THE System SHALL integrate with existing recall.ts utility functions
4. THE System SHALL maintain compatibility with existing HomeTabContent component structure
5. THE System SHALL maintain compatibility with existing SummaryHeroCard component structure
6. THE System SHALL maintain compatibility with existing InsightTabContent component
7. WHEN new calculations are added, THE System SHALL reuse existing transaction data queries
8. THE System SHALL not modify existing API contracts or data structures
9. THE System SHALL maintain existing performance characteristics of the Home_Dashboard
10. THE System SHALL pass all existing unit and integration tests after implementation

### Requirement 8: Error Handling and Edge Cases

**User Story:** As a KeMana user, I want the app to handle unusual situations gracefully, so that I always see meaningful information even with incomplete data.

#### Acceptance Criteria

1. WHEN no transactions exist, THE Insight_Card SHALL display a helpful onboarding message
2. WHEN only one day of data exists, THE System SHALL display Today_Total without comparison
3. WHEN the user's first transaction is today, THE System SHALL handle missing Daily_Average gracefully
4. WHEN calculation errors occur, THE System SHALL log errors and display fallback UI
5. WHEN network requests fail, THE System SHALL use cached data if available
6. WHEN timezone data is unavailable, THE System SHALL default to device timezone
7. WHEN transaction amounts are negative (refunds), THE System SHALL include them in calculations correctly
8. WHEN transaction amounts are extremely large, THE System SHALL format them without overflow
9. WHEN percentage calculations result in infinity or NaN, THE System SHALL display a fallback message
10. THE System SHALL validate all input data before performing calculations to prevent runtime errors
