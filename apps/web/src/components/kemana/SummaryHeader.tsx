"use client";

import { formatAmountIDR } from "@kemana/core/format";
import type { DateFilterPreset, TodaySummaryStats } from "@/lib/kemana-utils";

interface SummaryHeaderProps {
  filterOptions: Array<{ value: DateFilterPreset; label: string }>;
  dateFilter: DateFilterPreset;
  onDateFilterChange: (preset: DateFilterPreset) => void;
  summary: TodaySummaryStats;
}

export default function SummaryHeader({
  filterOptions,
  dateFilter,
  onDateFilterChange,
  summary
}: SummaryHeaderProps) {
  const breakdownText = summary.topCategories
    .map((item) => `${item.category} ${item.percentage}%`)
    .join(" • ");

  return (
    <>
      <section className="range-filter" aria-label="Filter tanggal">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`chip filter-chip ${dateFilter === option.value ? "active" : ""}`}
            onClick={() => onDateFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </section>

      <section className="daily-summary-card" aria-label="Ringkasan hari ini">
        <div className="daily-summary-title">{summary.periodLabel}</div>
        <div className="daily-summary-amount">Kamu keluar Rp{formatAmountIDR(summary.totalAmount)}</div>
        <div className={`daily-summary-status ${summary.status.tone}`}>{summary.status.label}</div>
        <div className="daily-summary-compare">{summary.compareText}</div>
        <div className="daily-summary-meta">{summary.entryCount} transaksi</div>
        {summary.emptyState ? (
          <div className="daily-summary-empty">
            <div className="daily-summary-empty-title">{summary.emptyState.title}</div>
            <div className="daily-summary-empty-subtitle">{summary.emptyState.subtitle}</div>
          </div>
        ) : (
          <>
            {breakdownText ? <div className="daily-summary-breakdown">{breakdownText}</div> : null}
            {summary.topCategory ? (
              <div className="daily-summary-top">
                Terbesar: {summary.topCategory.category} (Rp{formatAmountIDR(summary.topCategory.totalAmount)})
              </div>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
