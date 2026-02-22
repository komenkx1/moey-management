import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Coffee, Utensils, Car, ShoppingBag, Receipt, MoreHorizontal, X } from "lucide-react";
import { formatAmountIDR } from "@kemana/core/format";

type TxType = "expense";

interface AddTransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  prefill?: any; // Dummy prefill data
}

const CATEGORIES = [
  { id: "Makan", icon: Utensils },
  { id: "Transport", icon: Car },
  { id: "Belanja", icon: ShoppingBag },
  { id: "Tagihan", icon: Receipt },
  { id: "Hiburan", icon: Coffee },
  { id: "Lainnya", icon: MoreHorizontal },
];

const PAYMENTS = ["Cash", "QRIS", "Transfer"];

export default function AddTransactionSheet({ isOpen, onClose, onSave, prefill }: AddTransactionSheetProps) {
  const [type, setType] = useState<TxType>(prefill?.type || "expense");
  const [amountStr, setAmountStr] = useState(prefill?.amount?.toString() || "");
  const [category, setCategory] = useState(prefill?.category || "");
  const [note, setNote] = useState(prefill?.note || "");
  const [payment, setPayment] = useState(prefill?.payment || "");

  // Touch handlers for drag-to-close
  const [dragY, setDragY] = useState(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  };

  const rawAmount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setAmountStr(val);
  };

  const handleSave = () => {
    onSave({ type, amount: rawAmount, category, note, payment });
    onClose();
    // Reset state for next open (ideal implementation in a real app)
    setTimeout(() => {
      setAmountStr("");
      setCategory("");
      setNote("");
    }, 300); // Reset after animation finishes
  };

  return (
    <div className={cn("fixed inset-0 z-50 pointer-events-none", isOpen && "pointer-events-auto")}>
      <div
        className={cn("absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[24px] bg-bg-base shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:mx-auto sm:max-w-md",
          isOpen && dragY === 0 ? "translate-y-0" : "translate-y-full"
        )}
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
      >
        {/* Drag Handle Area */}
        <div
          className="w-full shrink-0 cursor-grab active:cursor-grabbing pb-2"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex h-1.5 w-12 shrink-0 items-center justify-center rounded-full bg-border-subtle mx-auto mt-3" />
        </div>

        <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
          <div className="flex flex-col">
            <h2 className="text-[20px] font-bold text-text-primary">Catat transaksi</h2>
            {prefill && <span className="text-[12px] font-medium text-text-tertiary mt-0.5">Dari Smart Recall</span>}
          </div>
          <button onClick={onClose} className="rounded-full bg-bg-subtle p-2 text-text-secondary active:scale-95 transition-transform hover:bg-border-subtle hover:text-text-primary">
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-24 pt-2">

          {/* Removed type toggle completely for expense-only scope */}
          <div className="flex flex-col items-center justify-center pt-6 pb-6 text-center">
            <span className="text-[14px] font-semibold text-text-secondary">Jumlah</span>
            <div className="mt-1 flex items-center justify-center gap-1 font-bold text-text-primary">
              <span className="text-[24px]">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountStr ? formatAmountIDR(rawAmount) : ""}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full min-w-[120px] max-w-[200px] bg-transparent text-center text-[40px] leading-none tracking-tight outline-none placeholder:text-border-subtle"
                autoFocus
              />
            </div>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className="group flex flex-col items-center gap-1.5 focus:outline-none"
                >
                  <div className={cn(
                    "flex h-[52px] w-[52px] items-center justify-center rounded-[16px] transition-all",
                    isSelected
                      ? "bg-danger text-white scale-105 shadow-md"
                      : "bg-bg-elevated border border-border-subtle text-text-tertiary active:scale-95 group-hover:border-brand group-hover:text-brand"
                  )}>
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <span className={cn("text-[11px] font-semibold transition-colors", isSelected ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary")}>
                    {cat.id}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tulis catatan (opsional)"
              className="w-full border-b-2 border-border-subtle bg-transparent py-3 text-[15px] font-medium text-text-primary transition-colors focus:border-brand focus:outline-none placeholder:text-text-tertiary"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {PAYMENTS.map((p) => (
              <button
                key={p}
                onClick={() => setPayment(p)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[12px] font-bold transition-all active:scale-95",
                  payment === p
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border-subtle bg-bg-elevated text-text-secondary hover:border-text-secondary"
                )}
              >
                {p}
              </button>
            ))}
          </div>

        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-border-subtle bg-bg-elevated/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-md">
          <button
            onClick={handleSave}
            disabled={rawAmount === 0 || !category}
            className="flex w-full items-center justify-center rounded-2xl bg-brand py-4 text-[16px] font-bold text-white shadow-lg shadow-brand/25 transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 hover:bg-brand-pressed"
          >
            Simpan Transaksi
          </button>
        </div>

      </div>
    </div>
  );
}
