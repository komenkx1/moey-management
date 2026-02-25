import { cn } from "@/lib/utils";
import { formatAmountIDR } from "@kemana/core/format";
import type { NightCloseTopCategory } from "@/app/night-close";
import { Check, Plus, X } from "lucide-react";
import { useBottomSheetDrag } from "./use-bottom-sheet-drag";

interface NightCloseReviewSheetProps {
  isOpen: boolean;
  dateLabel: string;
  total: number;
  count: number;
  promptLine: string;
  topCategory: NightCloseTopCategory | null;
  onClose: () => void;
  onDone: () => void;
  onAddEntry: () => void;
}

export default function NightCloseReviewSheet({
  isOpen,
  dateLabel,
  total,
  count,
  promptLine,
  topCategory,
  onClose,
  onDone,
  onAddEntry
}: NightCloseReviewSheetProps) {
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

      <section
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[86dvh] flex-col rounded-t-[24px] bg-bg-base shadow-2xl will-change-transform sm:mx-auto sm:max-w-md",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen ? "translate-y-0" : "translate-y-full",
          dragY > 0 && "transition-none"
        )}
        style={{
          transform: isOpen && dragY > 0 ? `translateY(${dragY}px)` : undefined
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Review tutup hari"
      >
        <div
          className="w-full shrink-0 cursor-grab touch-none pb-2 active:cursor-grabbing"
          {...dragHandleProps}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border-subtle" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
          <div className="flex flex-col">
            <h2 className="text-[20px] font-bold text-text-primary">Tutup hari ini</h2>
            <p className="mt-0.5 text-[12px] font-medium text-text-secondary">{dateLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-bg-subtle p-2 text-text-secondary transition-transform hover:bg-border-subtle hover:text-text-primary active:scale-95"
            aria-label="Tutup review hari"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-28 pt-2">
          <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-4">
            <div className="text-[12px] font-semibold text-text-secondary">Ringkasan hari ini</div>
            <div className="mt-2 text-[24px] font-bold tracking-tight text-text-primary">Rp{formatAmountIDR(total)}</div>
            <div className="mt-1 text-[13px] font-medium text-text-secondary">{count} catatan</div>
            {topCategory ? (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-base px-3 py-1 text-[12px] font-semibold text-text-primary">
                Kategori terbesar: {topCategory.name} ({topCategory.percent}%)
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3 text-[13px] font-medium leading-relaxed text-text-secondary">
            {promptLine}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-border-subtle bg-bg-elevated/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onAddEntry}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-base text-[13px] font-semibold text-text-primary transition-colors hover:border-brand hover:text-brand"
            >
              <Plus className="h-4 w-4" />
              Tambah catatan
            </button>
            <button
              type="button"
              onClick={onDone}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-pressed"
            >
              <Check className="h-4 w-4" />
              Selesai
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
