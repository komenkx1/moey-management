import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatAmountIDR } from "@kemana/core/format";
import { Coffee, Utensils, Car, ShoppingBag, Receipt, MoreHorizontal } from "lucide-react";

export interface QuickRecallItem {
    id: string;
    category: string;
    title: string;
    amount: number;
}

interface QuickRecallChipsProps {
    items: QuickRecallItem[];
    onSelect?: (item: QuickRecallItem) => void;
    className?: string;
}

const CategoryIcons: Record<string, ReactNode> = {
    Makan: <Utensils className="h-4 w-4" />,
    Transport: <Car className="h-4 w-4" />,
    Belanja: <ShoppingBag className="h-4 w-4" />,
    Tagihan: <Receipt className="h-4 w-4" />,
    Hiburan: <Coffee className="h-4 w-4" />,
    Lainnya: <MoreHorizontal className="h-4 w-4" />
};

export default function QuickRecallChips({ items, onSelect, className }: QuickRecallChipsProps) {
    if (!items || items.length === 0) return null;

    return (
        <div className={cn("flex flex-col gap-2.5", className)}>
            <div className="flex flex-col gap-0.5 px-1">
                <h3 className="text-[14px] font-bold tracking-tight text-text-primary">Catat lagi cepat</h3>
                <p className="text-[12px] font-medium text-text-secondary">Saran menyesuaikan kebiasaanmu.</p>
            </div>

            {/* Horizontal Scrollable Row */}
            <div className="-mx-4 flex overflow-x-auto scroll-smooth px-4 pb-3 pt-1 sm:-mx-0 sm:px-0 scrollbar-hide">
                <div className="flex gap-3">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSelect?.(item)}
                            className="group flex min-w-[148px] flex-col gap-2.5 rounded-[16px] border border-border-subtle bg-bg-card p-3.5 text-left shadow-sm transition-all hover:border-brand active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-subtle text-text-secondary group-hover:bg-brand-soft group-hover:text-brand transition-colors">
                                    {CategoryIcons[item.category] || CategoryIcons["Lainnya"]}
                                </div>
                                <span className="truncate text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                                    {item.category}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                                <span className="truncate text-[14px] font-semibold text-text-primary">
                                    {item.title}
                                </span>
                                <span className="text-[15px] font-bold text-text-primary mt-0.5">
                                    Rp{formatAmountIDR(item.amount)}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
