import { useState, memo, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatAmountIDR } from "@kemana/core/format";
import { Coffee, Utensils, Car, ShoppingBag, Receipt, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface TransactionItem {
    id: string;
    title: string;
    note?: string;
    amount: number;
    type: "expense";
    category: string;
    paymentMethod?: string;
    time: string;
}

interface TransactionCardProps {
    item: TransactionItem;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onSave?: (updatedItem: TransactionItem) => void;
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

function TransactionCardComponent({
    item,
    isExpanded,
    onToggleExpand,
    onSave,
    className
}: TransactionCardProps) {
    const [draftAmount, setDraftAmount] = useState(item.amount.toString());
    const [draftNote, setDraftNote] = useState(item.note || "");
    const [draftDate, setDraftDate] = useState(new Date().toISOString().split('T')[0]); // Mock base date

    // Add split bill mock state
    const [hasSplit, setHasSplit] = useState(false);

    const hasChanges = draftAmount !== item.amount.toString() || draftNote !== (item.note || "") || draftDate !== new Date().toISOString().split('T')[0];

    const handleSave = () => {
        if (onSave) {
            onSave({
                ...item,
                amount: parseInt(draftAmount, 10) || 0,
                note: draftNote,
                time: draftDate // Mock apply 
            });
        }
        onToggleExpand(); // Close after save
    };

    const handleCancel = () => {
        // Reset drafts
        setDraftAmount(item.amount.toString());
        setDraftNote(item.note || "");
        setDraftDate(new Date().toISOString().split('T')[0]);
        onToggleExpand();
    };

    return (
        <div
            className={cn(
                "group flex flex-col overflow-hidden rounded-2xl bg-bg-elevated transition-all",
                isExpanded
                    ? "ring-1 ring-border-subtle shadow-[0_8px_30px_rgba(0,0,0,0.06)] scale-[1.01] my-1"
                    : "hover:bg-bg-subtle active:scale-[0.99]",
                className
            )}
        >
            {/* Collapsed Header Area (Always visible) */}
            <button
                onClick={onToggleExpand}
                className="flex items-center gap-3 p-4 text-left w-full focus:outline-none"
            >
                <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors",
                    "bg-bg-subtle text-text-secondary group-hover:bg-brand-soft group-hover:text-brand"
                )}>
                    {CategoryIcons[item.category] || CategoryIcons["Lainnya"]}
                </div>

                <div className="flex flex-1 flex-col justify-center min-w-0">
                    <span className="truncate text-[15px] font-bold text-text-primary">
                        {item.title}
                    </span>
                    <span className="truncate text-[13px] font-medium text-text-tertiary mt-0.5">
                        {item.time} {item.paymentMethod ? `• ${item.paymentMethod}` : ""}
                    </span>
                </div>

                <div className="flex flex-col items-end justify-center shrink-0 pl-2">
                    <span
                        className={cn(
                            "text-[15px] font-bold",
                            "text-text-primary"
                        )}
                    >
                        -Rp{formatAmountIDR(item.amount)}
                    </span>
                    {item.note && !isExpanded && (
                        <span className="truncate max-w-[100px] text-[12px] font-medium text-text-tertiary mt-0.5">
                            {item.note}
                        </span>
                    )}
                </div>
            </button>

            {/* Expanded Inline Edit Area (Lazy rendered) */}
            {isExpanded && (
                <div className="border-t border-border-subtle bg-bg-base/30 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-4">

                        <div className="grid gap-1">
                            <label className="text-[12px] font-semibold text-text-secondary px-1">Jumlah</label>
                            <Input
                                type="number"
                                value={draftAmount}
                                onChange={(e) => setDraftAmount(e.target.value)}
                                className="h-11 rounded-xl bg-bg-elevated text-[16px] font-semibold tracking-wide"
                            />
                        </div>

                        <div className="grid gap-1">
                            <label className="text-[12px] font-semibold text-text-secondary px-1">Catatan</label>
                            <Input
                                value={draftNote}
                                onChange={(e) => setDraftNote(e.target.value)}
                                placeholder="Tambah detail..."
                                className="h-11 rounded-xl bg-bg-elevated text-[15px]"
                            />
                        </div>

                        <div className="grid gap-1 mt-1">
                            <label className="text-[12px] font-semibold text-text-secondary px-1">Tanggal</label>
                            <Input
                                type="date"
                                value={draftDate}
                                onChange={(e) => setDraftDate(e.target.value)}
                                className="h-11 rounded-xl bg-bg-elevated text-[15px]"
                            />
                        </div>

                        {/* Split Bill CTA */}
                        <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-border-subtle/50">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[12px] font-semibold text-text-secondary">Split Bill</span>
                                {hasSplit && <span className="text-[12px] font-medium text-success">Aktif (2 orang)</span>}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setHasSplit(!hasSplit)}
                                    className={cn("flex-1 h-10 rounded-xl text-[13px] border-border-subtle", hasSplit ? "bg-brand-soft text-brand border-brand/20" : "")}
                                >
                                    Bagi Rata
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setHasSplit(true)}
                                    className="flex-1 h-10 rounded-xl text-[13px] border-border-subtle"
                                >
                                    Custom Split
                                </Button>
                            </div>
                        </div>

                        {hasChanges && (
                            <span className="text-[12px] font-medium text-warning px-1 mt-1">
                                Perubahan belum disimpan
                            </span>
                        )}

                        <div className="flex items-center gap-3 pt-3 mt-1 border-t border-border-subtle/50">
                            <Button
                                variant="ghost"
                                onClick={handleCancel}
                                className="flex-1 rounded-xl h-11 font-semibold text-text-secondary hover:bg-bg-subtle active:bg-border-subtle"
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleSave}
                                className="flex-1 rounded-xl h-11 font-bold bg-brand hover:bg-brand-pressed text-white shadow-sm"
                            >
                                Simpan
                            </Button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

// React.memo to prevent re-rendering the whole list when one card expands
export const TransactionCard = memo(TransactionCardComponent, (prev, next) => {
    return prev.item.amount === next.item.amount &&
        prev.item.note === next.item.note &&
        prev.isExpanded === next.isExpanded;
});
