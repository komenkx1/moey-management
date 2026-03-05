import type { ComponentProps, MutableRefObject, Ref } from "react";
import { formatAmountIDR } from "@kemana/core/format";
import type { Entry } from "@kemana/core/types";
import { cn } from "@/lib/utils";
import { formatDayLabel, type CustomDateRange, type DateFilterPreset, type TodaySummaryStats } from "@/lib/kemana-utils";
import DateRangeFilter from "@/components/kemana-ui/DateRangeFilter";
import { TransactionCard, type TransactionItem } from "@/components/kemana-ui/TransactionCard";
import { useExpandedIds } from "@/store/kemana/hooks-granular";
import { useCallback } from "react";

import { isNativeIOS } from "@/lib/capacitor";

interface NotesTabContentProps {
  storageWarning: string | null;
  dateFilter: DateFilterPreset;
  onDateFilterChange: (value: DateFilterPreset) => void;
  customRange: CustomDateRange;
  onCustomRangeChange: (range: CustomDateRange) => void;
  summaryStats: TodaySummaryStats;
  onOpenBulk: () => void;
  onOpenDataTools: () => void;
  orderedDates: string[];
  dailyTotal: Record<string, number>;
  groupedEntries: Record<string, Entry[]>;
  toTransactionItem: (entry: Entry) => TransactionItem;
  highlightEntryId: string | null;
  pendingScrollToId: string | null;
  itemRefs: MutableRefObject<Map<string, HTMLDivElement | null>>;
  inferCategoryFromText: (value: string) => Entry["category"];
  onSaveTransaction: ComponentProps<typeof TransactionCard>["onSave"];
  onDeleteTransaction: ComponentProps<typeof TransactionCard>["onDelete"];
  filteredTransactionsLength: number;
  notesHasMore: boolean;
  notesLoadMoreRef: Ref<HTMLDivElement>;
  shouldVirtualizeNotes: boolean;
  filteredEntriesLength: number;
  visibleCount: number;
}

export default function NotesTabContent({
  storageWarning,
  dateFilter,
  onDateFilterChange,
  customRange,
  onCustomRangeChange,
  summaryStats,
  onOpenBulk,
  onOpenDataTools,
  orderedDates,
  dailyTotal,
  groupedEntries,
  toTransactionItem,
  highlightEntryId,
  pendingScrollToId,
  itemRefs,
  inferCategoryFromText,
  onSaveTransaction,
  onDeleteTransaction,
  filteredTransactionsLength,
  notesHasMore,
  notesLoadMoreRef,
  shouldVirtualizeNotes,
  filteredEntriesLength,
  visibleCount
}: NotesTabContentProps) {
  const { expandedIds, setExpandedIds } = useExpandedIds();

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [setExpandedIds]);

  return (
    <div className="px-4 py-2">
      {storageWarning ? (
        <div className="mb-3 rounded-xl border border-danger/20 bg-danger-soft/60 px-3 py-2 text-[12px] font-medium text-danger">
          {storageWarning}
        </div>
      ) : null}

      <DateRangeFilter
        value={dateFilter}
        onChange={onDateFilterChange}
        customRange={customRange}
        onCustomRangeChange={onCustomRangeChange}
        className="mb-2"
      />

      <div className="mb-3 mt-2 rounded-[16px] bg-bg-card px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-border-subtle">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-text-secondary">{summaryStats.periodLabel}</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              summaryStats.status.tone === "boros"
                ? "bg-danger-soft text-danger"
                : summaryStats.status.tone === "lumayan"
                  ? "bg-warning-soft text-warning"
                  : "bg-bg-subtle text-text-secondary"
            )}
          >
            {summaryStats.status.label}
          </span>
        </div>
        <div className="mt-1 text-[22px] font-bold tracking-tight text-text-primary">
          -Rp{formatAmountIDR(summaryStats.totalAmount)}
        </div>
        <div className="mt-1 text-[12px] font-medium text-text-secondary">{summaryStats.compareText}</div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenBulk}
          className="h-10 rounded-xl border border-border-subtle bg-bg-elevated text-[13px] font-semibold text-text-primary transition-colors hover:border-brand hover:text-brand"
        >
          Catat banyak
        </button>
        <button
          type="button"
          onClick={onOpenDataTools}
          className="h-10 rounded-xl border border-border-subtle bg-bg-elevated text-[13px] font-semibold text-text-primary transition-colors hover:border-brand hover:text-brand"
        >
          Data & tools
        </button>
      </div>

      <div className="flex flex-col gap-5 pb-[calc(124px+env(safe-area-inset-bottom))]">
        {orderedDates.map((dateString) => (
          <div key={dateString} className="flex flex-col gap-2">
            <div
              className={cn(
                "sticky top-0 z-30 -mx-4 flex items-center justify-between gap-2 border-b border-border-subtle/70 px-4 pb-2 pt-3",
                isNativeIOS()
                  ? "bg-bg-base/96 backdrop-blur-md supports-[backdrop-filter]:bg-bg-base/88"
                  : "bg-bg-base"
              )}
            >
              <span className="text-[14px] font-bold text-text-primary">{formatDayLabel(dateString)}</span>
              <span className="text-[12px] font-medium text-text-secondary">
                -Rp{formatAmountIDR(dailyTotal[dateString] ?? 0)}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {(groupedEntries[dateString] ?? []).map((entry) => {
                const transaction = toTransactionItem(entry);
                const highlighted = highlightEntryId === transaction.id || pendingScrollToId === transaction.id;

                return (
                  <div
                    key={transaction.id}
                    data-entry-id={transaction.id}
                    ref={(element) => {
                      itemRefs.current.set(transaction.id, element);
                    }}
                    className={cn(
                      highlighted
                        ? "relative before:pointer-events-none before:absolute before:-inset-[2px] before:rounded-[18px] before:ring-2 before:ring-brand before:animate-in before:fade-in before:zoom-in before:duration-300 before:[animation-fill-mode:forwards] before:animate-out before:fade-out before:[animation-delay:3.7s] before:[animation-duration:300ms]"
                        : ""
                    )}
                  >
                    <TransactionCard
                      item={transaction}
                      isExpanded={expandedIds.has(transaction.id)}
                      onToggleExpand={() => handleToggleExpand(transaction.id)}
                      inferCategory={inferCategoryFromText}
                      onSave={onSaveTransaction}
                      onDelete={onDeleteTransaction}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredTransactionsLength === 0 ? (
          <div className="animate-in fade-in rounded-2xl border border-dashed border-border-subtle bg-bg-elevated px-4 py-10 text-center">
            <p className="text-[14px] font-semibold text-text-primary">
              {summaryStats.emptyState?.title ?? "Belum ada catatan."}
            </p>
            <p className="mt-1 text-[12px] font-medium text-text-secondary">
              {summaryStats.emptyState?.subtitle ?? "Mulai dari input cepat atau tombol Catat."}
            </p>
          </div>
        ) : null}

        {notesHasMore ? (
          <div
            ref={notesLoadMoreRef}
            className="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2 text-center text-[12px] font-medium text-text-secondary"
          >
            Memuat catatan lainnya...
          </div>
        ) : null}

        {shouldVirtualizeNotes && filteredEntriesLength > 0 ? (
          <div className="text-center text-[11px] font-medium text-text-tertiary">
            Menampilkan {visibleCount} dari {filteredEntriesLength} catatan
          </div>
        ) : null}
      </div>
    </div>
  );
}
