import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatAmountIDR } from "@kemana/core/format";
import { buildCustomSplit, buildEqualSplit } from "@kemana/core/split";
import { parseQuickAdd } from "@kemana/core/parser";
import { CATEGORIES, PAYMENT_METHODS } from "@kemana/core/types";
import {
    formatCurrencyInputDisplay,
    getSplitOtherPeopleInput,
    normalizeDateInput,
    normalizeSplitPeopleWithLockedSelf,
    parseCurrencyInputToNumber,
    sanitizeCurrencyInput,
    splitDisplayText,
    warningShortText,
    toSplitPeopleInputWithLockedSelf
} from "@/lib/kemana-utils";
import { Users, CalendarDays, Utensils, Car, ShoppingBag, Receipt, Coffee, MoreHorizontal, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TransactionItem } from "../TransactionCard";
import {
    getDefaultParserInput,
    getInitialCustomDraft,
    getInitialPeopleText,
    normalizeInputText,
    toParserAmountToken,
    warningFingerprint,
    buildSplitPeopleText
} from "./helpers";

interface TransactionEditFormProps {
    item: TransactionItem;
    displayAmount: number;
    onSave: (updatedItem: TransactionItem) => void;
    onCancel: () => void;
    onDelete?: (id: string) => void;
    inferCategory?: (text: string) => string;
}

export default function TransactionEditForm({
    item,
    displayAmount,
    onSave,
    onCancel,
    onDelete,
    inferCategory
}: TransactionEditFormProps) {
    const [draftTitle, setDraftTitle] = useState(item.title);
    const [draftAmount, setDraftAmount] = useState(String(item.amount));
    const [draftNote, setDraftNote] = useState(item.note || "");
    const [draftDate, setDraftDate] = useState(() => normalizeDateInput(item.time) ?? new Date().toISOString().slice(0, 10));
    const [draftCategory, setDraftCategory] = useState(item.category);
    const [draftPaymentMethod, setDraftPaymentMethod] = useState(item.paymentMethod || "");
    const [splitEnabled, setSplitEnabled] = useState(Boolean(item.split?.shares?.length));
    const [splitMode, setSplitMode] = useState<"equal" | "custom">(item.split?.mode ?? "equal");
    const [splitPeopleInput, setSplitPeopleInput] = useState(getInitialPeopleText(item));
    const [splitOthersDraft, setSplitOthersDraft] = useState(getSplitOtherPeopleInput(getInitialPeopleText(item)));
    const [splitCustomDraft, setSplitCustomDraft] = useState<Record<string, string>>(
        getInitialCustomDraft(item)
    );
    const [draftRawInput, setDraftRawInput] = useState(item.rawInput || getDefaultParserInput(item));
    const [splitError, setSplitError] = useState<string | null>(null);
    const [formatFeedback, setFormatFeedback] = useState<string | null>(null);

    const parsedDraftAmount = useMemo(() => parseCurrencyInputToNumber(draftAmount), [draftAmount]);

    const splitPeople = useMemo(() => {
        return normalizeSplitPeopleWithLockedSelf(splitPeopleInput);
    }, [splitPeopleInput]);

    useEffect(() => {
        setSplitOthersDraft(getSplitOtherPeopleInput(splitPeopleInput));
    }, [splitPeopleInput]);

    const draftSplit = useMemo(() => {
        if (!splitEnabled || splitPeople.length < 1) {
            return undefined;
        }

        if (splitMode === "equal") {
            return {
                mode: "equal" as const,
                payer: item.split?.payer ?? "Kamu",
                shares: buildEqualSplit(parsedDraftAmount, splitPeople)
            };
        }

        const customShares = splitPeople.map((person) => ({
            person,
            amount: parseCurrencyInputToNumber(splitCustomDraft[person] || "0")
        }));
        const validated = buildCustomSplit(parsedDraftAmount, customShares);
        if (!validated) return undefined;

        return {
            mode: "custom" as const,
            payer: item.split?.payer ?? "Kamu",
            shares: validated
        };
    }, [parsedDraftAmount, splitCustomDraft, splitEnabled, splitMode, splitPeople]);

    const customDiff = useMemo(() => {
        if (!splitEnabled || splitMode !== "custom" || !draftSplit) {
            return 0;
        }
        const totalShares = draftSplit.shares.reduce((sum, share) => sum + share.amount, 0);
        return totalShares - parsedDraftAmount;
    }, [draftSplit, parsedDraftAmount, splitEnabled, splitMode]);

    const splitDirty = useMemo(() => {
        // ... (we'll simplify this)
        const currentMode = item.split?.mode ?? "equal";
        if (splitEnabled !== Boolean(item.split?.shares?.length)) return true;
        if (splitEnabled && splitMode !== currentMode) return true;
        // ...
        return false;
    }, [item.split, splitEnabled, splitMode]);

    const rawInputDirty = normalizeInputText(draftRawInput) !== normalizeInputText(item.rawInput || "");
    const normalizedRawInput = normalizeInputText(draftRawInput);
    const normalizedItemDate = normalizeDateInput(item.time) ?? new Date().toISOString().slice(0, 10);

    const parserPreview = useMemo(() => {
        if (normalizedRawInput.length === 0) return null;
        return parseQuickAdd(normalizedRawInput, new Date(), "inline_edit" as any);
    }, [normalizedRawInput]);

    const currentWarningsFingerprint = warningFingerprint(item.parseWarnings);
    const previewWarningsFingerprint = parserPreview?.ok ? warningFingerprint(parserPreview.warnings) : "";

    const amountsMatch = parserPreview?.ok && parserPreview.value.amount === parsedDraftAmount;
    const canApplyQuickFormat =
        parserPreview?.ok &&
        (normalizeInputText(parserPreview.value.text) !== normalizeInputText(`${draftTitle} ${draftNote}`) ||
            parserPreview.value.amount !== parsedDraftAmount ||
            previewWarningsFingerprint !== currentWarningsFingerprint);

    const isDirty =
        draftTitle.trim() !== item.title.trim() ||
        parsedDraftAmount !== item.amount ||
        draftNote !== (item.note || "") ||
        draftDate !== normalizedItemDate ||
        draftCategory !== item.category ||
        draftPaymentMethod !== (item.paymentMethod || "") ||
        splitDirty ||
        rawInputDirty;

    const handleApplyQuickFormat = () => {
        if (!parserPreview || !parserPreview.ok) {
            setFormatFeedback("Format belum dikenali. Lanjut edit manual saja.");
            return;
        }
        if (!canApplyQuickFormat) {
            setFormatFeedback("Isi sudah sesuai.");
            return;
        }

        const parsed = parserPreview.value;
        const parsedDisplay = splitDisplayText(parsed.text);
        setDraftTitle(parsedDisplay.title || draftTitle);
        setDraftNote(parsedDisplay.subtitle ?? "");
        setDraftAmount(String(parsed.amount));
        setDraftRawInput(parsed.rawInput);

        if (parsed.splitCount && parsed.splitCount > 1) {
            const nextPeopleInput = buildSplitPeopleText(parsed.splitCount);
            setSplitEnabled(true);
            setSplitMode("equal");
            setSplitPeopleInput(nextPeopleInput);
            setSplitOthersDraft(getSplitOtherPeopleInput(nextPeopleInput));
        } else {
            const nextPeopleInput = "Kamu, Teman";
            setSplitEnabled(false);
            setSplitMode("equal");
            setSplitPeopleInput(nextPeopleInput);
            setSplitOthersDraft(getSplitOtherPeopleInput(nextPeopleInput));
        }
        setSplitCustomDraft({});
        setSplitError(null);
        if (inferCategory) {
            setDraftCategory(inferCategory(parsed.text));
        }
        setFormatFeedback("Sudah dipakai. Tekan Simpan kalau sudah pas.");
    };

    const handleSave = () => {
        if (parsedDraftAmount <= 0) {
            setSplitError("Nominal harus lebih dari 0.");
            return;
        }
        if (splitEnabled && splitPeople.length < 2) {
            setSplitError("Split butuh minimal 2 orang.");
            return;
        }
        if (splitEnabled && splitMode === "custom" && customDiff !== 0) {
            setSplitError(
                customDiff < 0
                    ? `Nominal split kurang Rp${formatAmountIDR(Math.abs(customDiff))}`
                    : `Nominal split lebih Rp${formatAmountIDR(customDiff)}`
            );
            return;
        }

        let nextRawInput = item.rawInput;
        let nextWarnings = item.parseWarnings;
        if (rawInputDirty) {
            if (normalizedRawInput.length === 0) {
                nextRawInput = undefined;
                nextWarnings = undefined;
            } else if (parserPreview && parserPreview.ok) {
                nextRawInput = parserPreview.value.rawInput;
                nextWarnings = parserPreview.warnings;
            }
        }

        onSave({
            ...item,
            title: draftTitle.trim() || item.title,
            amount: parsedDraftAmount,
            note: draftNote.trim() || undefined,
            time: draftDate,
            category: draftCategory,
            paymentMethod: draftPaymentMethod || undefined,
            split: draftSplit,
            rawInput: nextRawInput,
            parseWarnings: nextWarnings
        });
    };

    const handleCancel = () => {
        onCancel();
    };

    const splitSummary = draftSplit?.shares.slice(0, 3) ?? [];

    return (
        <div className="animate-in slide-in-from-top-2 fade-in border-t border-border-subtle bg-bg-base/30 p-4 duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] gpu-accelerated">
            <div className="flex flex-col gap-4">
                {item.split?.shares?.length ? (
                    <div className="rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                            Info Split ({item.split.shares.length} orang)
                        </p>
                        <div className="mt-1.5 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] font-medium text-text-secondary">Kamu Bayar</span>
                                <span className="text-[12px] font-semibold text-text-primary">-Rp{formatAmountIDR(displayAmount)}</span>
                            </div>
                            {item.split.shares.some((s) => s.person.toLowerCase() !== "kamu") && (
                                <div className="mt-1 border-t border-border-subtle/50 pt-1">
                                    <span className="text-[11px] font-medium text-text-tertiary">Dibayarin untuk:</span>
                                    <div className="mt-0.5 flex flex-wrap gap-1">
                                        {item.split.shares
                                            .filter((s) => s.person.toLowerCase() !== "kamu")
                                            .slice(0, 3)
                                            .map((s, i) => (
                                                <span key={i} className="rounded-md bg-white/50 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary dark:bg-black/20">
                                                    {s.person}: Rp{formatAmountIDR(s.amount)}
                                                </span>
                                            ))}
                                        {item.split.shares.length > 4 && (
                                            <span className="rounded-md bg-white/50 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary dark:bg-black/20">
                                                +{item.split.shares.length - 4} lainnya
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

                {/* Edit Form */}
                <div className="flex flex-col gap-3 rounded-xl border border-brand-soft bg-brand-soft/20 p-3">
                    <div className="flex items-center justify-between border-b border-brand/10 pb-2">
                        <span className="text-[13px] font-semibold text-brand">Edit Catatan</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* Quick Format Parser */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary flex items-center justify-between">
                                <span>Edit Format</span>
                                {parserPreview?.ok && canApplyQuickFormat && (
                                    <span className="text-brand font-medium normal-case">Rp{formatAmountIDR(parserPreview.value.amount)}</span>
                                )}
                            </label>
                            <div className="flex gap-2 items-start">
                                <div className="flex-1 flex flex-col gap-1">
                                    <Input
                                        data-testid="inline-quick-format-input"
                                        value={draftRawInput}
                                        onChange={(e) => setDraftRawInput(e.target.value)}
                                        placeholder="Contoh: kopi 5x 50k atau mcd 3x 15k 3p"
                                        className="h-9 border-border-subtle bg-bg-base text-[13px]"
                                    />
                                    {formatFeedback && (
                                        <span className="text-[11px] font-medium text-brand">{formatFeedback}</span>
                                    )}
                                </div>
                                {canApplyQuickFormat && parserPreview?.ok ? (
                                    <Button
                                        data-testid="inline-quick-format-apply"
                                        onClick={handleApplyQuickFormat}
                                        className="h-9 shrink-0 rounded-xl bg-brand font-semibold text-white hover:bg-brand-pressed text-[12px] px-3 transition-colors"
                                    >
                                        Terapkan
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        {/* Title Input */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                                Judul
                            </label>
                            <Input
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                placeholder="Misal: Makan siang"
                                className="h-9 border-border-subtle bg-bg-base text-[13px]"
                            />
                        </div>

                        {/* Amount Input */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                                Jumlah (Rp)
                            </label>
                            <Input
                                inputMode="numeric"
                                value={formatCurrencyInputDisplay(draftAmount)}
                                onChange={(e) => setDraftAmount(sanitizeCurrencyInput(e.target.value))}
                                placeholder="0"
                                className="h-9 border-border-subtle bg-bg-base text-[13px] font-medium"
                            />
                        </div>

                        {/* Note Input */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                                Catatan
                            </label>
                            <Input
                                value={draftNote}
                                onChange={(e) => setDraftNote(e.target.value)}
                                placeholder="Tambah detail..."
                                className="h-9 border-border-subtle bg-bg-base text-[13px]"
                            />
                        </div>

                        {/* Date Input */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                                Tanggal
                            </label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={draftDate}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setDraftDate(e.target.value);
                                        }
                                    }}
                                    className="date-input-native h-9 border-border-subtle bg-bg-base pr-9 text-[13px]"
                                />
                                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                                Metode Pembayaran
                            </label>
                            <select
                                value={draftPaymentMethod}
                                onChange={(e) => setDraftPaymentMethod(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-border-subtle bg-bg-base px-3 py-1 text-[13px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
                                style={draftPaymentMethod === "" ? { color: '#9ca3af' } : undefined}
                            >
                                <option value="">Belum memilih</option>
                                {PAYMENT_METHODS.filter(method => method !== "Unknown").map((method) => (
                                    <option key={method} value={method}>
                                        {method.charAt(0).toUpperCase() + method.slice(1).replace("-", " ")}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Category */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2 mt-1">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                                Kategori
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setDraftCategory(cat)}
                                        className={cn(
                                            "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                                            draftCategory === cat
                                                ? "border-brand bg-brand-soft text-brand shadow-sm"
                                                : "border-border-subtle bg-bg-base text-text-secondary hover:bg-bg-subtle"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Split Bill Toggle Section */}
                        <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-subtle/50 p-3 sm:col-span-2 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-split-bg)] text-[var(--color-split)]">
                                        <Users className="h-4 w-4" />
                                    </div>
                                    <span className="text-[13px] font-semibold text-text-primary">Split Bill</span>
                                </div>
                                {splitEnabled ? (
                                    <button
                                        onClick={() => setSplitEnabled(false)}
                                        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-[var(--color-split)] transition-colors duration-200 ease-in-out focus:outline-none"
                                    >
                                        <span className="pointer-events-none inline-block h-4 w-4 translate-x-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setSplitEnabled(true); setSplitMode("equal"); }}
                                        className="rounded-lg bg-[var(--color-split-bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-split)] transition-colors hover:bg-[var(--color-split-hover)]"
                                    >
                                        Bagi rata
                                    </button>
                                )}
                            </div>

                            {splitEnabled && (
                                <div className="mt-1 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                                            Siapa aja yang ikut? (pisahkan dengan koma)
                                        </label>
                                        <div className="relative">
                                            <Input
                                                value={splitOthersDraft}
                                                onChange={(e) => {
                                                    setSplitOthersDraft(e.target.value);
                                                    const nextText = toSplitPeopleInputWithLockedSelf(e.target.value);
                                                    setSplitPeopleInput(nextText);
                                                }}
                                                placeholder="Contoh: Budi, Cici"
                                                className="h-9 border-border-subtle bg-bg-base pl-[60px] text-[13px] font-medium"
                                            />
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                                                <span className="text-[13px] font-medium text-text-tertiary">
                                                    Kamu,
                                                </span>
                                            </div>
                                        </div>
                                        <span className="hidden sm:block text-[11px] font-medium text-text-tertiary ml-1">
                                            Total: {splitPeople.length} orang
                                        </span>
                                    </div>

                                    {splitPeople.length >= 2 && (
                                        <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-base p-2">
                                            <div className="flex items-center gap-2 border-b border-border-subtle/50 pb-2">
                                                <button
                                                    onClick={() => setSplitMode("equal")}
                                                    className={cn(
                                                        "flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors",
                                                        splitMode === "equal"
                                                            ? "bg-[var(--color-split)] text-[var(--color-split-text-active)] shadow-sm"
                                                            : "bg-bg-subtle text-text-secondary hover:bg-[var(--color-split-bg)] hover:text-[var(--color-split)]"
                                                    )}
                                                >
                                                    Bagi Rata
                                                </button>
                                                <button
                                                    onClick={() => setSplitMode("custom")}
                                                    className={cn(
                                                        "flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors",
                                                        splitMode === "custom"
                                                            ? "bg-[var(--color-split)] text-[var(--color-split-text-active)] shadow-sm"
                                                            : "bg-bg-subtle text-text-secondary hover:bg-[var(--color-split-bg)] hover:text-[var(--color-split)]"
                                                    )}
                                                >
                                                    Atur Manual
                                                </button>
                                            </div>

                                            <div className="flex max-h-[160px] flex-col gap-2 overflow-y-auto px-1 py-1">
                                                {splitMode === "equal" ? (
                                                    <div className="flex items-center justify-between px-1 py-1">
                                                        <span className="text-[12px] font-medium text-text-secondary">
                                                            Masing-masing ({splitPeople.length}x)
                                                        </span>
                                                        <span className="text-[13px] font-bold text-text-primary">
                                                            Rp
                                                            {formatAmountIDR(
                                                                draftSplit?.shares[0]?.amount ??
                                                                parsedDraftAmount / splitPeople.length
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {splitPeople.map((person) => (
                                                            <div key={person} className="flex items-center gap-2">
                                                                <span className="w-24 truncate text-[12px] font-medium text-text-secondary">
                                                                    {person}
                                                                </span>
                                                                <div className="relative flex-1">
                                                                    <div className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                                                                        <span className="text-[12px] font-medium text-text-tertiary">
                                                                            Rp
                                                                        </span>
                                                                    </div>
                                                                    <Input
                                                                        inputMode="numeric"
                                                                        value={formatCurrencyInputDisplay(
                                                                            splitCustomDraft[person] || "0"
                                                                        )}
                                                                        onChange={(e) =>
                                                                            setSplitCustomDraft((prev) => ({
                                                                                ...prev,
                                                                                [person]: sanitizeCurrencyInput(
                                                                                    e.target.value
                                                                                )
                                                                            }))
                                                                        }
                                                                        className="h-8 border-border-subtle bg-bg-subtle pl-7 text-[13px] font-medium focus-visible:bg-bg-base"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {customDiff !== 0 && (
                                                            <div
                                                                className={cn(
                                                                    "mt-1 rounded-md px-2 py-1.5 text-[11px] font-medium",
                                                                    customDiff < 0
                                                                        ? "bg-warning-soft text-warning"
                                                                        : "bg-danger-soft text-danger"
                                                                )}
                                                            >
                                                                {customDiff < 0
                                                                    ? `Total masih kurang Rp${formatAmountIDR(
                                                                        Math.abs(customDiff)
                                                                    )}`
                                                                    : `Total kelebihan Rp${formatAmountIDR(customDiff)}`}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {splitError && (
                                <p className="animate-in fade-in flex items-center gap-1.5 px-1 py-0.5 text-[11px] font-medium text-danger">
                                    <span className="h-1 w-1 rounded-full bg-danger"></span>
                                    {splitError}
                                </p>
                            )}
                        </div>

                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle/60 pt-3">
                    {onCancel ? (
                        <div className="flex gap-2 ml-auto w-full justify-between">
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => onCancel()}
                                    className="h-10 min-w-[90px] rounded-xl border border-border-subtle bg-bg-base px-4 text-[13px] font-semibold text-text-secondary transition-colors hover:border-text-secondary/30 hover:text-text-primary"
                                >
                                    Batal
                                </Button>
                                {onDelete ? (
                                    <Button
                                        variant="ghost"
                                        onClick={() => onDelete(item.id)}
                                        className="h-10 min-w-[70px] rounded-xl border border-danger/30 bg-bg-base px-4 text-[13px] font-semibold text-danger transition-colors hover:border-danger hover:bg-danger/10"
                                    >
                                        Hapus
                                    </Button>
                                ) : null}
                            </div>
                            <Button
                                onClick={handleSave}
                                disabled={!isDirty || Boolean(splitError) || (splitEnabled && splitMode === "custom" && customDiff !== 0)}
                                className="h-10 min-w-[104px] rounded-xl bg-brand px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-pressed disabled:bg-bg-subtle disabled:text-text-tertiary disabled:shadow-none"
                            >
                                Simpan
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
