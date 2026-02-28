import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatAmountIDR } from "@kemana/core/format";
import { Coffee, Utensils, Car, ShoppingBag, Receipt, MoreHorizontal, Trash2 } from "lucide-react";
import type { TransactionItem } from "../TransactionCard";
import { formatDateLabel, getPaymentMethodText } from "./helpers";

interface TransactionCollapsedRowProps {
    item: TransactionItem;
    displayAmount: number;
    onToggleExpand: () => void;
    onDelete?: (id: string) => void;
    swipeX: number;
    isRevealed: boolean;
    isSnapping: boolean;
    swipeHandleProps: any;
    className?: string;
}

const CategoryIcons: Record<string, ReactNode> = {
    Makan: <Utensils className="h-5 w-5" />,
    Transport: <Car className="h-5 w-5" />,
    Belanja: <ShoppingBag className="h-5 w-5" />,
    Tagihan: <Receipt className="h-5 w-5" />,
    Hiburan: <Coffee className="h-5 w-5" />,
    Lainnya: <MoreHorizontal className="h-5 w-5" />
};

export default function TransactionCollapsedRow({
    item,
    displayAmount,
    onToggleExpand,
    onDelete,
    swipeX,
    isRevealed,
    isSnapping,
    swipeHandleProps,
    className
}: TransactionCollapsedRowProps) {
    return (
        <div className="relative group overflow-hidden">
            {/* Delete button background - revealed on swipe */}
            <div
                data-swipe-delete-action="true"
                className="absolute inset-y-0 right-0 z-0 flex w-20 items-center justify-center bg-danger rounded-r-2xl overflow-hidden"
                onPointerDownCapture={(event) => {
                    event.stopPropagation();
                }}
                onClick={(event) => {
                    event.stopPropagation();
                }}
                style={{
                    opacity: swipeX < -5 ? 1 : 0,
                    transition: 'opacity 0.1s ease-out',
                    pointerEvents: swipeX < -5 ? "auto" : "none"
                }}
            >
                {swipeX < -5 ? (
                    <button
                        type="button"
                        data-swipe-delete-action="true"
                        onPointerDownCapture={(event) => {
                            event.stopPropagation();
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onDelete) {
                                onDelete(item.id);
                            }
                        }}
                        className="flex h-12 w-12 items-center justify-center rounded-full outline-none focus:outline-none active:bg-danger-pressed transition-colors"
                        aria-label="Hapus transaksi"
                    >
                        <Trash2 className="h-5 w-5 text-white" />
                    </button>
                ) : null}
            </div>

            {/* Main card content - swipeable */}
            <div
                className={cn(
                    "relative z-10 flex flex-col bg-bg-elevated outline-none touch-pan-y",
                    isSnapping && "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                )}
                style={{
                    transform: `translateX(${swipeX}px)`,
                    pointerEvents: isRevealed ? 'none' : 'auto'
                }}
                {...swipeHandleProps}
            >
                <button
                    onClick={onToggleExpand}
                    className="flex w-full items-center gap-3 p-4 text-left outline-none focus:outline-none focus-visible:outline-none"
                >
                    <div
                        className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors",
                            "bg-bg-subtle text-text-secondary group-hover:bg-brand-soft group-hover:text-brand"
                        )}
                    >
                        {CategoryIcons[item.category] || CategoryIcons["Lainnya"]}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <span className="truncate text-[15px] font-bold text-text-primary">
                            {item.title}
                        </span>
                        <span className="mt-0.5 truncate text-[12px] font-medium text-text-tertiary">
                            {formatDateLabel(item.time)}
                            {item.paymentMethod ? ` • ${getPaymentMethodText(item.paymentMethod)}` : ""}
                        </span>
                    </div>

                    <div className="flex shrink-0 flex-col items-end justify-center pl-2">
                        <span className="text-[15px] font-bold text-text-primary">
                            -Rp{formatAmountIDR(displayAmount)}
                        </span>
                        {item.split?.shares?.length ? (
                            <div className="mt-1 shrink-0 rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                                Split {item.split.shares.length}
                            </div>
                        ) : item.note ? (
                            <span className="mt-0.5 max-w-[100px] truncate text-[12px] font-medium text-text-tertiary">
                                {item.note}
                            </span>
                        ) : null}
                    </div>
                </button>
            </div>
        </div>
    );
}
