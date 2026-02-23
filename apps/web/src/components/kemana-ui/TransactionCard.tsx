import { useEffect, useMemo, useState, memo, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatAmountIDR } from "@kemana/core/format";
import { buildCustomSplit, buildEqualSplit } from "@kemana/core/split";
import { parseQuickAdd } from "@kemana/core/parser";
import { CATEGORIES, PAYMENT_METHODS, type EntrySplit, type ParseWarning, type PaymentMethod } from "@kemana/core/types";
import {
    getSplitOtherPeopleInput,
    normalizeSplitPeopleWithLockedSelf,
    paymentMethodLabel,
    splitDisplayText,
    toSplitPeopleInputWithLockedSelf,
    warningShortText
} from "@/lib/kemana-utils";
import { Coffee, Utensils, Car, ShoppingBag, Receipt, MoreHorizontal, Trash2, Users } from "lucide-react";
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
    split?: EntrySplit;
    rawInput?: string;
    parseWarnings?: ParseWarning[];
}

interface TransactionCardProps {
    item: TransactionItem;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onSave?: (updatedItem: TransactionItem) => void;
    onDelete?: (id: string) => void;
    inferCategory?: (text: string) => string;
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

function parseCurrencyInput(value: string): number {
    const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

function splitFingerprint(split?: EntrySplit): string {
    if (!split || !split.shares.length) {
        return "none";
    }

    return `${split.mode}|${split.payer}|${split.shares
        .map((share) => `${share.person}:${Math.round(share.amount)}`)
        .join("|")}`;
}

function formatDateLabel(dateISO: string): string {
    const parsed = new Date(dateISO);
    if (Number.isNaN(parsed.getTime())) {
        return dateISO;
    }
    return parsed.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function getInitialPeopleText(item: TransactionItem): string {
    if (item.split?.shares?.length) {
        return toSplitPeopleInputWithLockedSelf(item.split.shares.map((share) => share.person).join(", "));
    }
    return "Kamu, Teman";
}

function getInitialCustomDraft(item: TransactionItem): Record<string, string> {
    const draft: Record<string, string> = {};
    for (const share of item.split?.shares ?? []) {
        draft[share.person] = String(Math.round(share.amount));
    }
    return draft;
}

function getPaymentMethodText(value?: string): string {
    if (!value) {
        return "";
    }
    const normalized = PAYMENT_METHODS.includes(value as (typeof PAYMENT_METHODS)[number])
        ? (value as PaymentMethod)
        : undefined;
    return paymentMethodLabel(normalized);
}

function normalizeInputText(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function hasQtyPattern(value: string): boolean {
    const normalized = normalizeInputText(value).toLowerCase();
    if (!normalized) {
        return false;
    }

    return (
        /\b\d+\s*[x×]\s*\d+(?:[.,]\d+)?(?:k|rb|jt)?\b/.test(normalized) ||
        /\b[x×]\s*\d+\b/.test(normalized) ||
        /\b\d+\s*[x×]\b/.test(normalized)
    );
}

function toParserAmountToken(amount: number): string {
    const normalizedAmount = Math.max(0, Math.round(amount));
    if (normalizedAmount >= 1_000 && normalizedAmount % 1_000 === 0) {
        return `${normalizedAmount / 1_000}k`;
    }
    return String(normalizedAmount);
}

function getDefaultParserInput(item: TransactionItem): string {
    const label = item.title.trim() || "pengeluaran";
    const amountToken = toParserAmountToken(item.amount);
    const splitCount = item.split?.shares?.length ?? 0;
    const splitToken = splitCount > 1 ? ` ${splitCount}p` : "";
    return normalizeInputText(`${label} ${amountToken}${splitToken}`);
}

function buildSplitPeopleText(count: number): string {
    const normalizedCount = Math.max(2, Math.min(20, Math.round(count)));
    const people = ["Kamu", ...Array.from({ length: normalizedCount - 1 }, (_, index) => `Orang ${index + 2}`)];
    return people.join(", ");
}

function warningFingerprint(warnings?: ParseWarning[]): string {
    return (warnings ?? []).map((warning) => `${warning.code}:${warning.message}`).join("|");
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

        // Jika tidak ada "kamu" di share, tapi kita yang bayar, mungkin kita bayarin orang lain full
        if (item.split.payer.toLowerCase() === "kamu") {
            // Kita keluarkan uang sebesar amount (sebagai pengeluaran kita sementara/ditalangin)
            return item.amount;
        }

        return 0; // Bukan kita yang bayar, dan kita tidak ada di daftar split
    }, [item.amount, item.split]);

    const [draftTitle, setDraftTitle] = useState(item.title);
    const [draftAmount, setDraftAmount] = useState(String(item.amount));
    const [draftNote, setDraftNote] = useState(item.note || "");
    const [draftDate, setDraftDate] = useState(item.time);
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

    const itemSplitFingerprint = useMemo(() => splitFingerprint(item.split), [item.split]);

    useEffect(() => {
        setDraftTitle(item.title);
        setDraftAmount(String(item.amount));
        setDraftNote(item.note || "");
        setDraftDate(item.time);
        setDraftCategory(item.category);
        setDraftPaymentMethod(item.paymentMethod || "");
        setSplitEnabled(Boolean(item.split?.shares?.length));
        setSplitMode(item.split?.mode ?? "equal");
        const initialSplitPeopleInput = getInitialPeopleText(item);
        setSplitPeopleInput(initialSplitPeopleInput);
        setSplitOthersDraft(getSplitOtherPeopleInput(initialSplitPeopleInput));
        setSplitCustomDraft(getInitialCustomDraft(item));
        setDraftRawInput(item.rawInput || getDefaultParserInput(item));
        setSplitError(null);
        setFormatFeedback(null);
    }, [
        item.id,
        item.title,
        item.amount,
        item.note,
        item.time,
        item.category,
        item.paymentMethod,
        item.rawInput,
        itemSplitFingerprint
    ]);

    const parsedDraftAmount = useMemo(() => parseCurrencyInput(draftAmount), [draftAmount]);
    const splitPeople = useMemo(
        () => normalizeSplitPeopleWithLockedSelf(splitPeopleInput),
        [splitPeopleInput]
    );

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

    const customShares = useMemo(
        () =>
            splitPeople.map((person) => ({
                person,
                amount: parseCurrencyInput(splitCustomDraft[person] ?? "")
            })),
        [splitCustomDraft, splitPeople]
    );
    const customTotal = useMemo(
        () => customShares.reduce((sum, share) => sum + share.amount, 0),
        [customShares]
    );
    const customDiff = customTotal - parsedDraftAmount;
    const normalizedRawInput = useMemo(() => normalizeInputText(draftRawInput), [draftRawInput]);
    const parserPreview = useMemo(() => {
        if (!isExpanded || normalizedRawInput.length === 0) {
            return null;
        }
        const parseDate = Number.isNaN(new Date(draftDate).getTime()) ? new Date() : new Date(draftDate);
        return parseQuickAdd(normalizedRawInput, parseDate, "quick_add");
    }, [draftDate, isExpanded, normalizedRawInput]);
    const parserPreviewDisplay = useMemo(() => {
        if (!parserPreview || !parserPreview.ok) {
            return null;
        }
        return splitDisplayText(parserPreview.value.text);
    }, [parserPreview]);
    const showQuickFormatEditor = useMemo(
        () => hasQtyPattern(item.rawInput || "") || hasQtyPattern(draftRawInput) || hasQtyPattern(item.title),
        [draftRawInput, item.rawInput, item.title]
    );
    const canApplyQuickFormat = useMemo(() => {
        if (!parserPreview || !parserPreview.ok) {
            return false;
        }

        const parsed = parserPreview.value;
        const parsedDisplay = parserPreviewDisplay ?? splitDisplayText(parsed.text);
        const nextTitle = (parsedDisplay.title || draftTitle).trim();
        const nextNote = parsedDisplay.subtitle ?? "";
        const nextAmount = parsed.amount;
        const nextRawInput = parsed.rawInput;
        const nextSplitEnabled = Boolean(parsed.splitCount && parsed.splitCount > 1);
        const nextSplitPeopleInput = nextSplitEnabled
            ? buildSplitPeopleText(parsed.splitCount ?? 2)
            : "Kamu, Teman";
        const nextCategory = inferCategory ? inferCategory(parsed.text) : draftCategory;

        return (
            nextTitle !== draftTitle ||
            nextNote !== draftNote ||
            nextAmount !== parsedDraftAmount ||
            nextRawInput !== normalizedRawInput ||
            nextSplitEnabled !== splitEnabled ||
            splitMode !== "equal" ||
            nextSplitPeopleInput !== splitPeopleInput ||
            nextCategory !== draftCategory ||
            Object.keys(splitCustomDraft).length > 0 ||
            Boolean(splitError)
        );
    }, [
        draftCategory,
        draftNote,
        draftTitle,
        inferCategory,
        normalizedRawInput,
        parsedDraftAmount,
        parserPreview,
        parserPreviewDisplay,
        splitEnabled,
        splitError,
        splitMode,
        splitPeopleInput,
        splitCustomDraft
    ]);
    const rawInputDirty =
        normalizedRawInput !== normalizeInputText(item.rawInput || getDefaultParserInput(item)) &&
        (normalizedRawInput.length === 0 || Boolean(parserPreview && parserPreview.ok));

    const draftSplit = useMemo<EntrySplit | undefined>(() => {
        if (!splitEnabled || parsedDraftAmount <= 0 || splitPeople.length < 2) {
            return undefined;
        }

        if (splitMode === "equal") {
            return {
                mode: "equal",
                payer: item.split?.payer ?? "Kamu",
                shares: buildEqualSplit(parsedDraftAmount, splitPeople)
            };
        }

        const validated = buildCustomSplit(parsedDraftAmount, customShares);
        if (!validated) {
            return undefined;
        }
        return {
            mode: "custom",
            payer: item.split?.payer ?? "Kamu",
            shares: validated
        };
    }, [customShares, item.split?.payer, parsedDraftAmount, splitEnabled, splitMode, splitPeople]);

    const splitDirty =
        splitEnabled !== Boolean(item.split?.shares?.length) ||
        splitMode !== (item.split?.mode ?? "equal") ||
        splitPeopleInput.trim() !== getInitialPeopleText(item) ||
        splitFingerprint(draftSplit) !== itemSplitFingerprint;

    const hasChanges =
        draftTitle.trim() !== item.title.trim() ||
        parsedDraftAmount !== item.amount ||
        draftNote !== (item.note || "") ||
        draftDate !== item.time ||
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
        if (!onSave) {
            return;
        }

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
        onToggleExpand();
    };

    const handleCancel = () => {
        setDraftTitle(item.title);
        setDraftAmount(String(item.amount));
        setDraftNote(item.note || "");
        setDraftDate(item.time);
        setDraftCategory(item.category);
        setDraftPaymentMethod(item.paymentMethod || "");
        setSplitEnabled(Boolean(item.split?.shares?.length));
        setSplitMode(item.split?.mode ?? "equal");
        const initialSplitPeopleInput = getInitialPeopleText(item);
        setSplitPeopleInput(initialSplitPeopleInput);
        setSplitOthersDraft(getSplitOtherPeopleInput(initialSplitPeopleInput));
        setSplitCustomDraft(getInitialCustomDraft(item));
        setDraftRawInput(item.rawInput || getDefaultParserInput(item));
        setSplitError(null);
        setFormatFeedback(null);
        onToggleExpand();
    };

    const splitSummary = draftSplit?.shares.slice(0, 3) ?? [];

    return (
        <div
            className={cn(
                "group flex flex-col overflow-hidden rounded-2xl bg-bg-elevated transition-all",
                isExpanded
                    ? "my-1 scale-[1.005] ring-1 ring-border-subtle shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                    : "hover:bg-bg-subtle active:scale-[0.99]",
                className
            )}
        >
            <button
                onClick={onToggleExpand}
                className="flex w-full items-center gap-3 p-4 text-left focus:outline-none"
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
                    ) : item.note && !isExpanded ? (
                        <span className="mt-0.5 max-w-[100px] truncate text-[12px] font-medium text-text-tertiary">
                            {item.note}
                        </span>
                    ) : null}
                </div>
            </button>

            {isExpanded ? (
                <div className="animate-in slide-in-from-top-2 fade-in border-t border-border-subtle bg-bg-base/30 p-4 duration-200">
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
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-medium text-text-secondary">Total tagihan</span>
                                        <span className="text-[12px] font-semibold text-text-primary">-Rp{formatAmountIDR(item.amount)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="grid gap-1.5">
                            <label className="px-1 text-[12px] font-semibold text-text-secondary">Nama catatan</label>
                            <Input
                                value={draftTitle}
                                onChange={(event) => setDraftTitle(event.target.value)}
                                placeholder="Misal: Makan siang"
                                className="h-11 rounded-xl bg-bg-elevated text-[15px] font-semibold"
                            />
                        </div>

                        {showQuickFormatEditor ? (
                            <div className="grid gap-1.5">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[12px] font-semibold text-text-secondary">Perbaiki jumlah cepat</label>
                                    <span className="text-[11px] font-medium text-text-tertiary">Opsional</span>
                                </div>
                                <Input
                                    value={draftRawInput}
                                    onChange={(event) => {
                                        setDraftRawInput(event.target.value);
                                        setFormatFeedback(null);
                                    }}
                                    placeholder="Contoh: kopi 5x 50k atau mcd 3x 15k 3p"
                                    className="h-10 rounded-xl bg-bg-elevated text-[14px] font-medium"
                                    data-testid="inline-quick-format-input"
                                />
                                <p className="px-1 text-[11px] font-medium text-text-tertiary">
                                    Kalau jumlah item keliru, ubah di sini. Contoh: 3x jadi 5x.
                                </p>
                                {parserPreview && parserPreview.ok ? (
                                    <div className="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2">
                                        <p className="text-[12px] font-semibold text-text-primary">
                                            {(parserPreviewDisplay?.title || parserPreview.value.text).trim()} • Rp{formatAmountIDR(parserPreview.value.amount)}
                                        </p>
                                        <p className="mt-0.5 text-[11px] font-medium text-text-secondary">
                                            {parserPreviewDisplay?.subtitle || "Tanpa detail tambahan"}
                                            {parserPreview.value.splitCount ? ` • ${parserPreview.value.splitCount} orang` : ""}
                                        </p>
                                        {parserPreview.warnings?.length ? (
                                            <p className="mt-1 text-[11px] font-medium text-text-tertiary">
                                                {warningShortText(parserPreview.warnings[0])}
                                            </p>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={handleApplyQuickFormat}
                                            disabled={!canApplyQuickFormat}
                                            className={cn(
                                                "mt-2 h-8 rounded-lg px-3 text-[12px] font-semibold transition-colors",
                                                canApplyQuickFormat
                                                    ? "bg-brand text-white hover:bg-brand-pressed"
                                                    : "bg-bg-subtle text-text-tertiary"
                                            )}
                                            data-testid="inline-quick-format-apply"
                                        >
                                            {canApplyQuickFormat ? "Pakai hasil ini" : "Sudah sesuai"}
                                        </button>
                                        <p className="mt-1 text-[11px] font-medium text-text-tertiary">
                                            Belum tersimpan. Tekan Simpan kalau sudah pas.
                                        </p>
                                    </div>
                                ) : normalizedRawInput.length > 0 ? (
                                    <p className="px-1 text-[12px] font-medium text-danger">
                                        Format belum kebaca. Coba tulis seperti 3x 15k, atau edit manual.
                                    </p>
                                ) : (
                                    <p className="px-1 text-[12px] font-medium text-text-tertiary">
                                        Contoh: mcd 3x 15k atau dinner 120 3p.
                                    </p>
                                )}
                                {formatFeedback ? (
                                    <p className="px-1 text-[12px] font-medium text-success">{formatFeedback}</p>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="grid gap-1.5">
                            <label className="px-1 text-[12px] font-semibold text-text-secondary">Jumlah</label>
                            <Input
                                type="number"
                                value={draftAmount}
                                onChange={(event) => setDraftAmount(event.target.value)}
                                className="h-11 rounded-xl bg-bg-elevated text-[16px] font-semibold tracking-wide"
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <label className="px-1 text-[12px] font-semibold text-text-secondary">Catatan</label>
                            <Input
                                value={draftNote}
                                onChange={(event) => setDraftNote(event.target.value)}
                                placeholder="Tambah detail..."
                                className="h-11 rounded-xl bg-bg-elevated text-[15px]"
                            />
                        </div>

                        <div className="mt-0.5 grid grid-cols-2 gap-3">
                            <div className="grid gap-1.5">
                                <label className="px-1 text-[12px] font-semibold text-text-secondary">Kategori</label>
                                <select
                                    value={draftCategory}
                                    onChange={(event) => setDraftCategory(event.target.value)}
                                    className="h-11 appearance-none rounded-xl border border-border-subtle bg-bg-elevated px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand/50"
                                >
                                    {CATEGORIES.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid gap-1.5">
                                <label className="px-1 text-[12px] font-semibold text-text-secondary">Metode bayar</label>
                                <select
                                    value={draftPaymentMethod}
                                    onChange={(event) => setDraftPaymentMethod(event.target.value)}
                                    className="h-11 appearance-none rounded-xl border border-border-subtle bg-bg-elevated px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand/50"
                                >
                                    <option value="">Pilih...</option>
                                    {PAYMENT_METHODS.filter((method) => method !== "Unknown").map((method) => (
                                        <option key={method} value={method}>
                                            {paymentMethodLabel(method)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-1.5">
                            <label className="px-1 text-[12px] font-semibold text-text-secondary">Tanggal</label>
                            <Input
                                type="date"
                                value={draftDate}
                                onChange={(event) => setDraftDate(event.target.value)}
                                className="h-11 rounded-xl bg-bg-elevated text-[15px]"
                            />
                        </div>

                        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle/80 bg-bg-elevated p-3.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Users className="h-[18px] w-[18px] text-text-secondary" />
                                    <span className="text-[12px] font-semibold text-text-secondary">Split transaksi</span>
                                </div>
                                <span
                                    className={cn(
                                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                        splitEnabled
                                            ? "bg-brand-soft text-brand"
                                            : "bg-bg-subtle text-text-tertiary"
                                    )}
                                >
                                    {splitEnabled ? `${splitPeople.length || 0} orang` : "Opsional"}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    type="button"
                                    variant={!splitEnabled ? "default" : "outline"}
                                    className={cn(
                                        "h-9 rounded-xl border-border-subtle text-[12px] font-semibold",
                                        !splitEnabled ? "bg-brand text-white hover:bg-brand-pressed" : ""
                                    )}
                                    onClick={() => {
                                        setSplitEnabled(false);
                                        setSplitError(null);
                                    }}
                                >
                                    Tanpa split
                                </Button>
                                <Button
                                    type="button"
                                    variant={splitEnabled && splitMode === "equal" ? "default" : "outline"}
                                    className={cn(
                                        "h-9 rounded-xl border-border-subtle text-[12px] font-semibold",
                                        splitEnabled && splitMode === "equal" ? "bg-brand text-white hover:bg-brand-pressed" : ""
                                    )}
                                    onClick={() => {
                                        setSplitEnabled(true);
                                        setSplitMode("equal");
                                        setSplitError(null);
                                    }}
                                >
                                    Bagi rata
                                </Button>
                                <Button
                                    type="button"
                                    variant={splitEnabled && splitMode === "custom" ? "default" : "outline"}
                                    className={cn(
                                        "h-9 rounded-xl border-border-subtle text-[12px] font-semibold",
                                        splitEnabled && splitMode === "custom" ? "bg-brand text-white hover:bg-brand-pressed" : ""
                                    )}
                                    onClick={() => {
                                        setSplitEnabled(true);
                                        setSplitMode("custom");
                                        setSplitError(null);
                                    }}
                                >
                                    Custom
                                </Button>
                            </div>

                            {splitEnabled ? (
                                <div className="grid gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex rounded-full border border-border-subtle bg-bg-subtle px-2.5 py-1 text-[11px] font-semibold text-text-primary">
                                            Kamu
                                        </span>
                                        <span className="text-[11px] font-medium text-text-tertiary">Dikunci otomatis</span>
                                    </div>
                                    <p className="text-[11px] font-medium text-text-tertiary">
                                        Tambah orang pakai koma. Contoh: Budi, Cici, Deni.
                                    </p>
                                    <Input
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
                                        className="h-10 rounded-xl bg-bg-base text-[14px]"
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
                                                    <Input
                                                        type="number"
                                                        value={splitCustomDraft[person] ?? ""}
                                                        onChange={(event) =>
                                                            setSplitCustomDraft((prev) => ({
                                                                ...prev,
                                                                [person]: event.target.value
                                                            }))
                                                        }
                                                        placeholder="0"
                                                        className="h-9 rounded-xl bg-bg-base text-[13px]"
                                                    />
                                                </div>
                                            ))}
                                            <span
                                                className={cn(
                                                    "text-[12px] font-medium",
                                                    customDiff === 0 ? "text-success" : "text-warning"
                                                )}
                                            >
                                                {customDiff === 0
                                                    ? "Nominal split sudah pas."
                                                    : customDiff < 0
                                                        ? `Masih kurang Rp${formatAmountIDR(Math.abs(customDiff))}`
                                                        : `Kelebihan Rp${formatAmountIDR(customDiff)}`}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {splitSummary.map((share) => (
                                                <span
                                                    key={share.person}
                                                    className="rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                                                >
                                                    {share.person} Rp{formatAmountIDR(share.amount)}
                                                </span>
                                            ))}
                                            {(draftSplit?.shares.length ?? 0) > splitSummary.length ? (
                                                <span className="rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 text-[11px] font-medium text-text-tertiary">
                                                    +{(draftSplit?.shares.length ?? 0) - splitSummary.length} orang
                                                </span>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {hasChanges ? (
                            <span className="px-1 text-[12px] font-medium text-warning">Perubahan belum disimpan</span>
                        ) : null}

                        {splitError ? (
                            <span className="px-1 text-[12px] font-medium text-danger">{splitError}</span>
                        ) : null}

                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle/60 pt-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onDelete?.(item.id)}
                                className="h-9 rounded-lg px-2 text-[12px] font-semibold text-danger/90 transition-colors hover:bg-danger-soft/45 hover:text-danger"
                            >
                                <Trash2 className="h-4 w-4" />
                                Hapus
                            </Button>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleCancel}
                                    className="h-10 min-w-[90px] rounded-xl border border-border-subtle bg-bg-base px-4 text-[13px] font-semibold text-text-secondary transition-colors hover:border-text-secondary/30 hover:text-text-primary"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSave}
                                    className="h-10 min-w-[104px] rounded-xl bg-brand px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-pressed"
                                >
                                    Simpan
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
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

// Ready for virtualization integration (react-window) by keeping row props stable and memoized.
export const TransactionCard = memo(TransactionCardComponent, isTransactionCardPropsEqual);
