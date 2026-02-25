import { cn } from "@/lib/utils";
import { formatAmountIDR } from "@kemana/core/format";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { useBottomSheetDrag } from "./use-bottom-sheet-drag";

export interface BulkPreviewLine {
    line: string;
    ok: boolean;
    reason?: string;
    amount?: number;
}

interface BulkInputSheetProps {
    isOpen: boolean;
    onClose: () => void;
    input: string;
    onInputChange: (value: string) => void;
    preview: BulkPreviewLine[];
    validCount: number;
    onSave: () => void;
}

export default function BulkInputSheet({
    isOpen,
    onClose,
    input,
    onInputChange,
    preview,
    validCount,
    onSave
}: BulkInputSheetProps) {
    const totalLines = preview.length;
    const invalidLines = preview.filter((item) => !item.ok).slice(0, 3);
    const { dragY, dragHandleProps } = useBottomSheetDrag({
        isOpen,
        onClose
    });

    return (
        <div
            className={cn("fixed inset-0 z-50", isOpen ? "visible pointer-events-auto" : "invisible pointer-events-none")}
            aria-hidden={!isOpen}
        >
            <div
                className={cn(
                    "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            <div
                className={cn(
                    "absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-[24px] bg-bg-base shadow-2xl sm:mx-auto sm:max-w-md",
                    !isOpen && "translate-y-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                )}
                style={{ 
                    transform: isOpen ? (dragY > 0 ? `translateY(${dragY}px)` : 'translateY(0)') : undefined 
                }}
            >
                <div
                    className="w-full shrink-0 cursor-grab touch-none pb-2 active:cursor-grabbing"
                    {...dragHandleProps}
                >
                    <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border-subtle" />
                </div>
                <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
                    <div className="flex flex-col">
                        <h2 className="text-[20px] font-bold text-text-primary">Catat banyak sekaligus</h2>
                        <p className="mt-0.5 text-[12px] font-medium text-text-secondary">
                            Satu baris untuk satu catatan. Format tetap cepat.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full bg-bg-subtle p-2 text-text-secondary transition-transform hover:bg-border-subtle hover:text-text-primary active:scale-95"
                        aria-label="Tutup input massal"
                    >
                        <X className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
                    <Textarea
                        value={input}
                        onChange={(event) => onInputChange(event.target.value)}
                        className="min-h-[180px] rounded-2xl border-border-subtle bg-bg-elevated px-4 py-3 text-[14px] leading-relaxed"
                        placeholder={"Contoh:\nkopi 18\nparkir 4k\nmakan siang 25k 2p"}
                    />

                    <div className="mt-3 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2.5">
                        <div className="text-[12px] font-semibold text-text-secondary">
                            Valid {validCount}/{totalLines || 0} baris
                        </div>
                        {totalLines > 0 ? (
                            <div className="mt-2 flex flex-col gap-1.5">
                                {preview
                                    .filter((line) => line.ok)
                                    .slice(0, 2)
                                    .map((line) => (
                                        <div
                                            key={`ok-${line.line}`}
                                            className="truncate text-[12px] font-medium text-text-secondary"
                                        >
                                            {line.line} • Rp{formatAmountIDR(line.amount ?? 0)}
                                        </div>
                                    ))}
                                {invalidLines.map((line) => (
                                    <div key={`invalid-${line.line}`} className="text-[12px] font-medium text-danger">
                                        {line.line} {line.reason ? `• ${line.reason}` : ""}
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 border-t border-border-subtle bg-bg-elevated/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-md">
                    <button
                        onClick={onSave}
                        disabled={validCount === 0}
                        className="flex w-full items-center justify-center rounded-2xl bg-brand py-4 text-[16px] font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-pressed active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
                    >
                        Simpan {validCount || 0} catatan
                    </button>
                </div>
            </div>
        </div>
    );
}
