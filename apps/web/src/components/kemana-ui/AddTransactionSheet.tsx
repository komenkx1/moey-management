import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { buildCustomSplit, buildEqualSplit } from "@kemana/core/split";
import type { EntrySplit } from "@kemana/core/types";
import { formatAmountIDR } from "@kemana/core/format";
import {
  getSplitOtherPeopleInput,
  normalizeSplitPeopleWithLockedSelf,
  toSplitPeopleInputWithLockedSelf
} from "@/lib/kemana-utils";
import { Coffee, Utensils, Car, ShoppingBag, Receipt, MoreHorizontal, X, Users } from "lucide-react";
import { useBottomSheetDrag } from "./use-bottom-sheet-drag";

type TxType = "expense";

export interface AddTransactionSubmitPayload {
  type: TxType;
  amount: number;
  unitAmount?: number;
  quantity?: number;
  category: string;
  title?: string;
  note: string;
  payment?: string;
  date: string;
  split?: EntrySplit;
  rawInput?: string;
}

interface AddTransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddTransactionSubmitPayload) => void;
  prefill?: Partial<AddTransactionSubmitPayload>;
}

const CATEGORIES = [
  { id: "Makan", icon: Utensils },
  { id: "Transport", icon: Car },
  { id: "Belanja", icon: ShoppingBag },
  { id: "Tagihan", icon: Receipt },
  { id: "Hiburan", icon: Coffee },
  { id: "Lainnya", icon: MoreHorizontal }
] as const;

const PAYMENTS = [
  { value: "Cash", label: "Tunai" },
  { value: "QRIS", label: "QRIS" },
  { value: "Debit", label: "Debit" },
  { value: "Transfer", label: "Transfer" }
] as const;

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function toParserAmountToken(amount: number): string {
  const normalizedAmount = Math.max(0, Math.round(amount));
  if (normalizedAmount >= 1_000 && normalizedAmount % 1_000 === 0) {
    return `${normalizedAmount / 1_000}k`;
  }
  return String(normalizedAmount);
}

export default function AddTransactionSheet({ isOpen, onClose, onSave, prefill }: AddTransactionSheetProps) {
  const [type, setType] = useState<TxType>("expense");
  const [amountStr, setAmountStr] = useState("");
  const [qtyStr, setQtyStr] = useState("1");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState("");
  const [date, setDate] = useState(getTodayISO());
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [splitPeopleInput, setSplitPeopleInput] = useState("Kamu, Teman");
  const [splitOthersDraft, setSplitOthersDraft] = useState("Teman");
  const [splitCustomDraft, setSplitCustomDraft] = useState<Record<string, string>>({});

  const { dragY, dragHandleProps } = useBottomSheetDrag({
    isOpen,
    onClose,
    closeThreshold: 110
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setType(prefill?.type ?? "expense");
    setAmountStr(prefill?.amount ? String(Math.round(prefill.amount)) : "");
    setQtyStr(String(Math.max(1, Math.round(prefill?.quantity ?? 1))));
    setCategory(prefill?.category ?? "");
    setTitle(prefill?.title ?? prefill?.note ?? "");
    setNote(prefill?.note ?? "");
    setPayment(prefill?.payment ?? "");
    setDate(prefill?.date ?? getTodayISO());
    setSplitEnabled(Boolean(prefill?.split?.shares?.length));
    setSplitMode(prefill?.split?.mode ?? "equal");
    const initialSplitPeopleInput = toSplitPeopleInputWithLockedSelf(
      prefill?.split?.shares?.map((share) => share.person).join(", ") || "Kamu, Teman"
    );
    setSplitPeopleInput(initialSplitPeopleInput);
    setSplitOthersDraft(getSplitOtherPeopleInput(initialSplitPeopleInput));
    setSplitCustomDraft(
      prefill?.split?.shares?.reduce<Record<string, string>>((acc, share) => {
        acc[share.person] = String(Math.round(share.amount));
        return acc;
      }, {}) ?? {}
    );
  }, [isOpen, prefill]);

  const unitAmount = useMemo(
    () => Number.parseInt(amountStr.replace(/\D/g, ""), 10) || 0,
    [amountStr]
  );
  const quantity = useMemo(
    () => Math.max(1, Number.parseInt(qtyStr.replace(/\D/g, ""), 10) || 1),
    [qtyStr]
  );
  const totalAmount = useMemo(() => unitAmount * quantity, [quantity, unitAmount]);
  const splitPeople = useMemo(
    () => normalizeSplitPeopleWithLockedSelf(splitPeopleInput),
    [splitPeopleInput]
  );
  const splitCustomShares = useMemo(
    () =>
      splitPeople.map((person) => ({
        person,
        amount: Number.parseInt((splitCustomDraft[person] ?? "").replace(/\D/g, ""), 10) || 0
      })),
    [splitCustomDraft, splitPeople]
  );
  const splitCustomTotal = useMemo(
    () => splitCustomShares.reduce((sum, share) => sum + share.amount, 0),
    [splitCustomShares]
  );
  const splitCustomDiff = splitCustomTotal - totalAmount;

  useEffect(() => {
    setSplitCustomDraft((prev) => {
      const next: Record<string, string> = {};
      for (const person of splitPeople) {
        next[person] = prev[person] ?? "";
      }

      const changed =
        Object.keys(next).length !== Object.keys(prev).length ||
        Object.entries(next).some(([person, amount]) => prev[person] !== amount);

      return changed ? next : prev;
    });
  }, [splitPeople]);

  const splitDraft = useMemo(() => {
    if (!splitEnabled || splitPeople.length < 2 || totalAmount <= 0) {
      return undefined;
    }

    if (splitMode === "custom") {
      const validated = buildCustomSplit(totalAmount, splitCustomShares);
      if (!validated) {
        return undefined;
      }

      return {
        mode: "custom",
        payer: "Kamu",
        shares: validated
      } satisfies EntrySplit;
    }

    return {
      mode: "equal",
      payer: "Kamu",
      shares: buildEqualSplit(totalAmount, splitPeople)
    } satisfies EntrySplit;
  }, [splitCustomShares, splitEnabled, splitMode, splitPeople, totalAmount]);

  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const sanitized = event.target.value.replace(/\D/g, "");
    setAmountStr(sanitized);
  };

  const handleQtyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const sanitized = event.target.value.replace(/\D/g, "");
    setQtyStr(sanitized.length ? sanitized : "1");
  };

  const handleSave = () => {
    if (!category || totalAmount <= 0) {
      return;
    }

    if (splitEnabled && splitPeople.length < 2) {
      return;
    }

    if (splitEnabled && splitMode === "custom" && splitCustomDiff !== 0) {
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedNote = note.trim();
    const textTitle = normalizedTitle || category;
    const rawInputLabel = normalizedTitle || normalizedNote || category;
    const splitCount = splitEnabled ? splitPeople.length : 0;
    const splitToken = splitCount > 1 ? ` ${splitCount}p` : "";
    const rawInput =
      rawInputLabel.length > 0
        ? `${rawInputLabel} ${quantity > 1 ? `${quantity}x ` : ""}${toParserAmountToken(unitAmount)}${splitToken}`.trim()
        : undefined;

    onSave({
      type,
      amount: totalAmount,
      unitAmount,
      quantity,
      category,
      title: normalizedTitle || undefined,
      note: normalizedNote,
      payment: payment || undefined,
      date,
      split: splitDraft,
      rawInput
    });
    onClose();
  };

  const isCustomSplitInvalid = splitEnabled && splitMode === "custom" && splitCustomDiff !== 0;

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
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[24px] bg-bg-base shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:mx-auto sm:max-w-md",
          isOpen && dragY === 0 ? "translate-y-0" : "translate-y-full"
        )}
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
      >
        <div
          className="w-full shrink-0 cursor-grab touch-none pb-2 active:cursor-grabbing"
          {...dragHandleProps}
        >
          <div className="mx-auto mt-3 flex h-1.5 w-12 shrink-0 items-center justify-center rounded-full bg-border-subtle" />
        </div>

        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
          <div className="flex flex-col">
            <h2 className="text-[20px] font-bold text-text-primary">Catat pengeluaran</h2>
            {prefill ? (
              <span className="mt-0.5 text-[12px] font-medium text-text-tertiary">Isi otomatis dari saran pintar</span>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-bg-subtle p-2 text-text-secondary transition-transform hover:bg-border-subtle hover:text-text-primary active:scale-95"
            aria-label="Tutup lembar catatan"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-28 pt-1">
          <div className="flex flex-col items-center justify-center pb-5 pt-5 text-center">
            <span className="text-[13px] font-semibold text-text-secondary">
              {quantity > 1 ? "Nominal per item" : "Jumlah"}
            </span>
            <div className="mt-1 flex items-center justify-center gap-1 font-bold text-text-primary">
              <span className="text-[24px]">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountStr ? formatAmountIDR(unitAmount) : ""}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full min-w-[120px] max-w-[220px] bg-transparent text-center text-[40px] leading-none tracking-tight outline-none placeholder:text-border-subtle"
                autoFocus
              />
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1.5">
              <span className="text-[11px] font-semibold text-text-tertiary">Qty</span>
              <input
                type="text"
                inputMode="numeric"
                value={qtyStr}
                onChange={handleQtyChange}
                aria-label="Jumlah item"
                className="w-11 bg-transparent text-center text-[13px] font-semibold text-text-primary outline-none"
              />
              <span className="text-[11px] font-medium text-text-tertiary">item</span>
            </div>
            {quantity > 1 ? (
              <p className="mt-2 text-[12px] font-medium text-text-secondary">
                Total Rp{formatAmountIDR(totalAmount)} ({quantity} x Rp{formatAmountIDR(unitAmount)})
              </p>
            ) : null}
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
                  <div
                    className={cn(
                      "flex h-[52px] w-[52px] items-center justify-center rounded-[16px] transition-all",
                      isSelected
                        ? "scale-105 bg-brand text-white shadow-md"
                        : "border border-border-subtle bg-bg-elevated text-text-tertiary group-hover:border-brand group-hover:text-brand active:scale-95"
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.4} />
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-semibold transition-colors",
                      isSelected ? "text-text-primary" : "text-text-tertiary group-hover:text-text-secondary"
                    )}
                  >
                    {cat.id}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-7 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3.5">
            <div className="text-[12px] font-semibold text-text-secondary">Nama catatan</div>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Misal: makan siang"
              className="mt-2 w-full bg-transparent text-[15px] font-semibold text-text-primary outline-none placeholder:text-text-tertiary"
            />
            <div className="mt-3 border-t border-border-subtle" />
            <div className="text-[12px] font-semibold text-text-secondary">Catatan</div>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Tulis detail singkat (opsional)"
              className="mt-2 w-full bg-transparent text-[15px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-border-subtle bg-bg-elevated p-4">
            <div className="text-[12px] font-semibold text-text-secondary">Metode bayar</div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PAYMENTS.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPayment(method.value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-[12px] font-semibold transition-all active:scale-95",
                    payment === method.value
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border-subtle bg-bg-base text-text-secondary hover:border-text-secondary"
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border-subtle bg-bg-elevated p-4">
            <label className="text-[12px] font-semibold text-text-secondary">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-border-subtle bg-bg-base px-3 text-[15px] text-text-primary outline-none focus:border-brand"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-border-subtle bg-bg-elevated p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-text-secondary" />
                <span className="text-[12px] font-semibold text-text-secondary">Split transaksi</span>
              </div>
              <span className="text-[11px] font-medium text-text-tertiary">
                {splitEnabled ? `${splitPeople.length} orang` : "Opsional"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSplitEnabled(false)}
                className={cn(
                  "h-9 rounded-xl border px-3 text-[12px] font-semibold transition-colors",
                  !splitEnabled
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border-subtle bg-bg-base text-text-secondary"
                )}
              >
                Tanpa split
              </button>
              <button
                type="button"
                onClick={() => {
                  setSplitEnabled(true);
                  setSplitMode("equal");
                }}
                className={cn(
                  "h-9 rounded-xl border px-3 text-[12px] font-semibold transition-colors",
                  splitEnabled && splitMode === "equal"
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border-subtle bg-bg-base text-text-secondary"
                )}
              >
                Bagi rata
              </button>
              <button
                type="button"
                onClick={() => {
                  setSplitEnabled(true);
                  setSplitMode("custom");
                }}
                className={cn(
                  "h-9 rounded-xl border px-3 text-[12px] font-semibold transition-colors",
                  splitEnabled && splitMode === "custom"
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border-subtle bg-bg-base text-text-secondary"
                )}
              >
                Custom
              </button>
            </div>
            {splitEnabled ? (
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full border border-border-subtle bg-bg-subtle px-2.5 py-1 text-[11px] font-semibold text-text-primary">
                    Kamu
                  </span>
                  <span className="text-[11px] font-medium text-text-tertiary">Dikunci otomatis</span>
                </div>
                <p className="text-[11px] font-medium text-text-tertiary">
                  Tambah orang pakai koma. Contoh: Budi, Cici, Deni.
                </p>
                <input
                  type="text"
                  value={splitOthersDraft}
                  onChange={(event) => {
                    const rawOthers = event.target.value;
                    setSplitOthersDraft(rawOthers);
                    setSplitPeopleInput(toSplitPeopleInputWithLockedSelf(rawOthers));
                  }}
                  onBlur={() => {
                    setSplitOthersDraft(getSplitOtherPeopleInput(splitPeopleInput));
                  }}
                  placeholder="Contoh: Budi, Cici"
                  className="h-10 w-full rounded-xl border border-border-subtle bg-bg-base px-3 text-[14px] text-text-primary outline-none focus:border-brand"
                />
                {splitMode === "custom" ? (
                  <div className="grid gap-2">
                    {splitPeople.map((person) => (
                      <div key={person} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2">
                        <span
                          title={person}
                          className="truncate text-[12px] font-medium text-text-secondary"
                        >
                          {person}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={splitCustomDraft[person] ?? ""}
                          onChange={(event) =>
                            setSplitCustomDraft((prev) => ({
                              ...prev,
                              [person]: event.target.value.replace(/\D/g, "")
                            }))
                          }
                          placeholder="0"
                          className="h-9 w-full rounded-xl border border-border-subtle bg-bg-base px-3 text-[13px] text-text-primary outline-none focus:border-brand"
                        />
                      </div>
                    ))}
                    <span
                      className={cn(
                        "text-[12px] font-medium",
                        splitCustomDiff === 0 ? "text-success" : "text-warning"
                      )}
                    >
                      {splitCustomDiff === 0
                        ? "Nominal split sudah pas."
                        : splitCustomDiff < 0
                          ? `Masih kurang Rp${formatAmountIDR(Math.abs(splitCustomDiff))}`
                          : `Kelebihan Rp${formatAmountIDR(splitCustomDiff)}`}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-border-subtle bg-bg-elevated/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-md">
          <button
            onClick={handleSave}
            disabled={
              totalAmount === 0 ||
              !category ||
              (splitEnabled && splitPeople.length < 2) ||
              isCustomSplitInvalid
            }
            className="flex w-full items-center justify-center rounded-2xl bg-brand py-4 text-[16px] font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-pressed active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
          >
            Simpan catatan
          </button>
        </div>
      </div>
    </div>
  );
}
