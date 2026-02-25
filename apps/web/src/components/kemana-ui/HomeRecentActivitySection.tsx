import { memo, type ComponentProps, type MutableRefObject } from "react";
import { NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionCard, type TransactionItem } from "@/components/kemana-ui/TransactionCard";

interface HomeRecentActivitySectionProps {
  allTransactions: TransactionItem[];
  homeItemRefs: MutableRefObject<Map<string, HTMLDivElement | null>>;
  highlightEntryId: string | null;
  homePendingScrollId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  inferCategoryFromText: (value: string) => TransactionItem["category"];
  onSaveTransaction: ComponentProps<typeof TransactionCard>["onSave"];
  onDeleteTransaction: ComponentProps<typeof TransactionCard>["onDelete"];
  onOpenNotes: () => void;
}

function HomeRecentActivitySection({
  allTransactions,
  homeItemRefs,
  highlightEntryId,
  homePendingScrollId,
  expandedIds,
  onToggleExpand,
  inferCategoryFromText,
  onSaveTransaction,
  onDeleteTransaction,
  onOpenNotes
}: HomeRecentActivitySectionProps) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <h3 className="text-[16px] font-bold text-text-primary">Aktivitas terbaru</h3>
        <div className="flex flex-col gap-3">
          {allTransactions.slice(0, 5).map((transaction) => (
            <div
              key={transaction.id}
              data-home-entry-id={transaction.id}
              ref={(element) => {
                homeItemRefs.current.set(transaction.id, element);
              }}
              className={cn(
                highlightEntryId === transaction.id || homePendingScrollId === transaction.id
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
          ))}
        </div>
      </div>

      {allTransactions.length === 0 ? (
        <div className="flex flex-col gap-2.5">
          <div className="empty-state-acitivity">
            <div className="empty-state-acitivity-icon flex items-center justify-center">
              <NotebookPen />
            </div>
            <div className="empty-state-acitivity-title text-center my-3">
              <b>Belum ada catatan</b>
            </div>
            <div className="empty-state-acitivity-subtitle text-center">
              Yuk mulai catat pengeluaranmu
            </div>
          </div>
        </div>
      ) : allTransactions.length > 5 ? (
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onOpenNotes}
            className="h-11 w-full rounded-xl bg-brand text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-pressed"
          >
            Lihat semua catatan
          </button>
        </div>
      ) : null}
    </>
  );
}


// Memoize to prevent re-renders when parent state changes but props don't
export default memo(HomeRecentActivitySection, (prev, next) => {
  // Check if transactions array changed (first 5 items)
  const prevTransactions = prev.allTransactions.slice(0, 5);
  const nextTransactions = next.allTransactions.slice(0, 5);
  
  if (prevTransactions.length !== nextTransactions.length) {
    return false;
  }
  
  for (let i = 0; i < prevTransactions.length; i++) {
    if (prevTransactions[i].id !== nextTransactions[i].id) {
      return false;
    }
  }
  
  // Check other props
  return (
    prev.highlightEntryId === next.highlightEntryId &&
    prev.homePendingScrollId === next.homePendingScrollId &&
    prev.expandedIds === next.expandedIds &&
    prev.allTransactions.length === next.allTransactions.length
  );
});
