import { PAYMENT_METHODS, type EntrySplit, type ParseWarning, type PaymentMethod } from "@kemana/core/types";
import {
    paymentMethodLabel,
    toSplitPeopleInputWithLockedSelf
} from "@/lib/kemana-utils";
import type { TransactionItem } from "../TransactionCard";

export function splitFingerprint(split?: EntrySplit): string {
    if (!split || !split.shares.length) {
        return "none";
    }

    return `${split.mode}|${split.payer}|${split.shares
        .map((share) => `${share.person}:${Math.round(share.amount)}`)
        .join("|")}`;
}

export function formatDateLabel(dateISO: string): string {
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

export function getInitialPeopleText(item: TransactionItem): string {
    if (item.split?.shares?.length) {
        return toSplitPeopleInputWithLockedSelf(item.split.shares.map((share) => share.person).join(", "));
    }
    return "Kamu, Teman";
}

export function getInitialCustomDraft(item: TransactionItem): Record<string, string> {
    const draft: Record<string, string> = {};
    for (const share of item.split?.shares ?? []) {
        draft[share.person] = String(Math.round(share.amount));
    }
    return draft;
}

export function getPaymentMethodText(value?: string): string {
    if (!value) {
        return "";
    }
    const normalized = PAYMENT_METHODS.includes(value as (typeof PAYMENT_METHODS)[number])
        ? (value as PaymentMethod)
        : undefined;
    return paymentMethodLabel(normalized);
}

export function normalizeInputText(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

export function hasQtyPattern(value: string): boolean {
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

export function toParserAmountToken(amount: number): string {
    const normalizedAmount = Math.max(0, Math.round(amount));
    if (normalizedAmount >= 1_000 && normalizedAmount % 1_000 === 0) {
        return `${normalizedAmount / 1_000}k`;
    }
    return String(normalizedAmount);
}

export function getDefaultParserInput(item: TransactionItem): string {
    const label = item.title.trim() || "pengeluaran";
    const amountToken = toParserAmountToken(item.amount);
    const splitCount = item.split?.shares?.length ?? 0;
    const splitToken = splitCount > 1 ? ` ${splitCount}p` : "";
    return normalizeInputText(`${label} ${amountToken}${splitToken}`);
}

export function buildSplitPeopleText(count: number): string {
    const normalizedCount = Math.max(2, Math.min(20, Math.round(count)));
    const people = ["Kamu", ...Array.from({ length: normalizedCount - 1 }, (_, index) => `Orang ${index + 2}`)];
    return people.join(", ");
}

export function warningFingerprint(warnings?: ParseWarning[]): string {
    return (warnings ?? []).map((warning) => `${warning.code}:${warning.message}`).join("|");
}

/**
 * Replace the amount token in a rawInput string with the new amount.
 * e.g. "jfdds 10k" + newAmount=30000 → "jfdds 30k"
 *      "makan 15000" + newAmount=25000 → "makan 25k"
 */
export function replaceAmountInRawInput(rawInput: string, oldAmount: number, newAmount: number): string {
    if (oldAmount === newAmount || !rawInput.trim()) return rawInput;

    const oldToken = toParserAmountToken(oldAmount);
    // Try to find and replace the old amount token in the rawInput
    // Match patterns: "10k", "10000", "10.000", "10rb", etc.
    const escapedToken = oldToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tokenRegex = new RegExp(`\\b${escapedToken}\\b`, "i");

    if (tokenRegex.test(rawInput)) {
        return rawInput.replace(tokenRegex, toParserAmountToken(newAmount));
    }

    // Also try matching the raw number form (e.g. "10000" or "10.000")
    const oldStr = String(oldAmount);
    const oldFormatted = oldAmount >= 1000
        ? oldStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
        : oldStr;

    if (rawInput.includes(oldStr)) {
        return rawInput.replace(oldStr, toParserAmountToken(newAmount));
    }
    if (rawInput.includes(oldFormatted)) {
        return rawInput.replace(oldFormatted, toParserAmountToken(newAmount));
    }

    // Fallback: rebuild rawInput from title + new amount
    const titlePart = rawInput.replace(/\s*\d+(?:[.,]\d+)?(?:k|rb|jt)?\s*(?:\d+p)?$/i, "").trim();
    return `${titlePart || rawInput.trim()} ${toParserAmountToken(newAmount)}`;
}
