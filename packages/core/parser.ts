import { EntrySource, ParseQuickAddResult, ParseWarning } from "./types";

const SPLIT_TOKEN_REGEX = /^(\d+)p$/i;
const AMOUNT_TOKEN_REGEX = /^(\d+(?:[.,]\d+)?)(k|rb|jt)?$/i;
const MAX_SPLIT_COUNT = 20;

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cleanAmountToken(rawToken: string): string {
  let cleaned = rawToken.trim().toLowerCase();
  cleaned = cleaned.replace(/^rp\s*/i, "");
  cleaned = cleaned.replace(/[^a-z0-9.,]/g, "");
  cleaned = cleaned.replace(/[.,]+$/g, "");
  return cleaned;
}

function parseAmountToken(rawToken: string): { amount: number; warnings: ParseWarning[] } | null {
  const warnings: ParseWarning[] = [];
  const loweredToken = rawToken.trim().toLowerCase();
  const cleanedToken = cleanAmountToken(rawToken);

  if (!cleanedToken) {
    return null;
  }

  if (cleanedToken !== loweredToken) {
    warnings.push({
      code: "AMOUNT_TOKEN_CLEANED",
      message: `Token nominal dibersihkan: "${rawToken}" -> "${cleanedToken}".`
    });
  }

  const match = cleanedToken.match(AMOUNT_TOKEN_REGEX);
  if (!match) {
    return null;
  }

  const numericPart = match[1].replace(",", ".");
  const suffix = match[2];
  const parsedFloat = Number.parseFloat(numericPart);

  if (!Number.isFinite(parsedFloat)) {
    return null;
  }

  if (suffix) {
    const multiplier = suffix === "jt" ? 1_000_000 : 1_000;
    return {
      amount: Math.round(parsedFloat * multiplier),
      warnings
    };
  }

  const normalizedInteger = Number.parseInt(match[1].replace(/[.,]/g, ""), 10);
  if (!Number.isFinite(normalizedInteger)) {
    return null;
  }

  if (normalizedInteger >= 1 && normalizedInteger <= 999) {
    warnings.push({
      code: "ASSUMED_THOUSANDS",
      message: "Nominal diasumsikan ribuan",
      meta: {
        interpretedAmount: normalizedInteger * 1_000
      }
    });

    return {
      amount: normalizedInteger * 1_000,
      warnings
    };
  }

  return {
    amount: normalizedInteger,
    warnings
  };
}

export function parseQuickAdd(
  input: string,
  now: Date = new Date(),
  source: EntrySource = "quick_add"
): ParseQuickAddResult {
  const normalized = input.trim();
  if (!normalized) {
    return { ok: false, reason: "Input kosong." };
  }

  const tokens = normalized.split(/\s+/);
  let splitCount: number | undefined;
  let splitTokenIndex = -1;
  const parserWarnings: ParseWarning[] = [];
  const lastToken = tokens[tokens.length - 1];
  const splitMatch = lastToken.match(SPLIT_TOKEN_REGEX);

  if (splitMatch) {
    const parsedSplitCount = Number.parseInt(splitMatch[1], 10);
    splitTokenIndex = tokens.length - 1;

    if (!Number.isFinite(parsedSplitCount) || parsedSplitCount <= 0) {
      return { ok: false, reason: "Jumlah orang split tidak valid." };
    }

    if (parsedSplitCount > MAX_SPLIT_COUNT) {
      return { ok: false, reason: "Split kebanyakan." };
    }

    if (parsedSplitCount === 1) {
      splitCount = undefined;
      parserWarnings.push({
        code: "SPLIT_COUNT_IGNORED",
        message: "Split 1p diabaikan",
        meta: {
          splitCount: parsedSplitCount
        }
      });
    } else {
      splitCount = parsedSplitCount;
    }
  }

  const searchLimit = splitTokenIndex === -1 ? tokens.length : splitTokenIndex;
  let amountIndex = -1;
  let amountValue: number | null = null;
  let amountWarnings: ParseWarning[] = [];

  for (let index = searchLimit - 1; index >= 0; index -= 1) {
    const parsed = parseAmountToken(tokens[index]);
    if (parsed !== null) {
      amountValue = parsed.amount;
      amountIndex = index;
      amountWarnings = parsed.warnings;
      break;
    }
  }

  if (amountIndex === -1 || amountValue === null) {
    return { ok: false, reason: "Nominal tidak ditemukan." };
  }

  if (amountValue <= 0) {
    return { ok: false, reason: "Nominal harus lebih dari 0." };
  }

  const textTokens = tokens.filter((_, index) => index !== amountIndex && index !== splitTokenIndex);
  const text = textTokens.join(" ").trim() || "Pengeluaran";

  return {
    ok: true,
    value: {
      rawInput: normalized,
      text,
      amount: amountValue,
      splitCount,
      date: toISODate(now),
      source
    },
    warnings:
      parserWarnings.length + amountWarnings.length > 0
        ? [...parserWarnings, ...amountWarnings]
        : undefined
  };
}
