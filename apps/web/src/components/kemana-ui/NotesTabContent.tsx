import type { ComponentProps, MutableRefObject, Ref } from "react";
import { formatAmountIDR } from "@kemana/core/format";
import type { Entry } from "@kemana/core/types";
import { cn } from "@/lib/utils";
import { formatDayLabel, type CustomDateRange, type DateFilterPreset, type TodaySummaryStats } from "@/lib/kemana-utils";
import DateRangeFilter from "@/components/kemana-ui/DateRangeFilter";
import { TransactionCard, type TransactionItem } from "@/components/kemana-ui/TransactionCard";

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
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
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
  expandedIds,
  onToggleExpand,
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
            <div className="sticky top-[calc(var(--safe-header-offset)+74px)] z-10 -mx-4 flex items-center justify-between gap-2 border-b border-border-subtle/70 bg-bg-base/94 px-4 pb-2 pt-3 backdrop-blur-md">
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
                        ? "animate-in fade-in zoom-in rounded-[16px] ring-2 ring-brand duration-300"
                        : ""
                    )}
                  >
                    <TransactionCard
                      item={transaction}
                      isExpanded={expandedIds.has(transaction.id)}
                      onToggleExpand={() => onToggleExpand(transaction.id)}
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
