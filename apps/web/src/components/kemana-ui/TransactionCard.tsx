import { memo, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { EntrySplit, ParseWarning } from "@kemana/core/types";
import { useSwipeToDelete } from "./use-swipe-to-delete";
import TransactionCollapsedRow from "./transaction/TransactionCollapsedRow";
import TransactionEditForm from "./transaction/TransactionEditForm";
import { warningFingerprint, splitFingerprint } from "./transaction/helpers";

export interface TransactionItem {
    id: string;
    title: string;
    note?: string;
    amount: number;
    type: "expense";
    category: string;
    paymentMethod?: string;
    time: string;
    split?: EntrySplit;
    rawInput?: string;
    parseWarnings?: ParseWarning[];
}

export interface TransactionCardProps {
    item: TransactionItem;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onSave?: (updatedItem: TransactionItem) => void;
    onDelete?: (id: string) => void;
    inferCategory?: (text: string) => string;
    className?: string;
}

function TransactionCardComponent({
    item,
    isExpanded,
    onToggleExpand,
    onSave,
    onDelete,
    inferCategory,
    className
}: TransactionCardProps) {
    const displayAmount = useMemo(() => {
        if (!item.split?.shares?.length) {
            return item.split?.payer && item.split.payer.toLowerCase() !== "kamu" ? 0 : item.amount;
        }

        const myShare = item.split.shares.find((s) => s.person.toLowerCase() === "kamu");
        if (myShare) {
            return myShare.amount;
        }

        if (item.split.payer.toLowerCase() === "kamu") {
            return item.amount;
        }

        return 0;
    }, [item.amount, item.split]);

    const { swipeX, isRevealed, isSwiping, isSnapping, reset: resetSwipe, swipeHandleProps } = useSwipeToDelete({
        onDelete: () => {
            if (onDelete) {
                onDelete(item.id);
            }
        },
        enabled: !isExpanded
    });

    useEffect(() => {
        if (isExpanded) {
            resetSwipe();
        }
    }, [isExpanded, resetSwipe]);

    return (
        <div
            className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl bg-bg-elevated outline-none",
                "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] gpu-accelerated",
                isExpanded
                    ? "my-1 scale-[1.005] ring-1 ring-border-subtle shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                    : "hover:bg-bg-subtle active:scale-[0.985]",
                className
            )}
        >
            <TransactionCollapsedRow
                item={item}
                displayAmount={displayAmount}
                onToggleExpand={onToggleExpand}
                onDelete={onDelete}
                swipeX={swipeX}
                isRevealed={isRevealed}
                isSnapping={isSnapping}
                swipeHandleProps={swipeHandleProps}
            />

            {isExpanded && (
                <TransactionEditForm
                    item={item}
                    displayAmount={displayAmount}
                    onSave={(updated) => {
                        onSave?.(updated);
                        onToggleExpand();
                    }}
                    onCancel={onToggleExpand}
                    onDelete={onDelete}
                    inferCategory={inferCategory}
                />
            )}
        </div>
    );
}

function isTransactionCardPropsEqual(prev: TransactionCardProps, next: TransactionCardProps): boolean {
    return (
        prev.isExpanded === next.isExpanded &&
        prev.item.id === next.item.id &&
        prev.item.title === next.item.title &&
        prev.item.note === next.item.note &&
        prev.item.amount === next.item.amount &&
        prev.item.category === next.item.category &&
        prev.item.paymentMethod === next.item.paymentMethod &&
        prev.item.time === next.item.time &&
        prev.item.rawInput === next.item.rawInput &&
        warningFingerprint(prev.item.parseWarnings) === warningFingerprint(next.item.parseWarnings) &&
        splitFingerprint(prev.item.split) === splitFingerprint(next.item.split)
    );
}

export const TransactionCard = memo(TransactionCardComponent, isTransactionCardPropsEqual);
