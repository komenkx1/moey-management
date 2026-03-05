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
    const invalidLines = preview.filter((item) => !item.ok);
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
                    "absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-[24px] bg-bg-base shadow-2xl will-change-transform sm:mx-auto sm:max-w-md",
                    "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isOpen ? "translate-y-0" : "translate-y-full",
                    dragY > 0 && "transition-none"
                )}
                style={{
                    transform: isOpen && dragY > 0 ? `translateY(${dragY}px)` : undefined
                }}
            >
                {/* Drag Handle & Header - Fixed at top */}
                <div className="shrink-0">
                    <div
                        className="w-full cursor-grab touch-none pb-2 active:cursor-grabbing"
                        {...dragHandleProps}
                    >
                        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border-subtle" />
                    </div>
                    <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-1">
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
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto px-5 pb-[120px] pt-4">
                    <Textarea
                        value={input}
                        onChange={(event) => onInputChange(event.target.value)}
                        className="min-h-[180px] rounded-2xl border-border-subtle bg-bg-elevated px-4 py-3 text-[14px] leading-relaxed"
                        placeholder={"Contoh:\nkopi 18\nparkir 4k\nmakan siang 25k 2p"}
                    />

                    <div className="mt-4 mb-4 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2.5">
                        <div className="text-[12px] font-semibold text-text-secondary">
                            Valid {validCount}/{totalLines || 0} baris
                        </div>
                        {totalLines > 0 ? (
                            <div className="mt-2 flex max-h-[30vh] flex-col gap-1.5 overflow-y-auto overscroll-contain pb-1 pr-1">
                                {preview
                                    .filter((line) => line.ok)
                                    .map((line, index) => (
                                        <div
                                            key={`ok-${index}-${line.line}`}
                                            className="truncate text-[12px] font-medium text-text-secondary shrink-0"
                                        >
                                            {line.line} • Rp{formatAmountIDR(line.amount ?? 0)}
                                        </div>
                                    ))}
                                {invalidLines.map((line, index) => (
                                    <div key={`invalid-${index}-${line.line}`} className="text-[12px] font-medium text-danger shrink-0 leading-tight">
                                        {line.line} {line.reason ? `• ${line.reason}` : ""}
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Bottom Button Action - Fixed at bottom */}
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
