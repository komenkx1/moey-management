import { EntrySource, ParseQuickAddResult, ParseWarning } from "./types";

const SPLIT_TOKEN_REGEX = /^(\d+)p$/i;
const AMOUNT_TOKEN_REGEX = /^(\d+(?:[.,]\d+)?)(k|rb|jt)?$/i;
const MAX_SPLIT_COUNT = 20;

interface SplitTokenParseSuccess {
  ok: true;
  splitCount?: number;
  splitTokenIndex: number;
  warnings: ParseWarning[];
}

interface SplitTokenParseError {
  ok: false;
  reason: string;
}

type SplitTokenParseResult = SplitTokenParseSuccess | SplitTokenParseError;

interface AmountTokenParseResult {
  amount: number;
  warnings: ParseWarning[];
  consumedIndices: number[];
  qtySuffixIndex?: number;
}

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

function parsePlainIntegerToken(rawToken: string): number | null {
  const token = rawToken.trim();
  if (!/^\d+$/.test(token)) {
    return null;
  }
  const value = Number.parseInt(token, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseStandaloneQtyToken(rawToken: string): number | null {
  const token = rawToken.trim().toLowerCase();
  if (!token || token === "+") {
    return null;
  }

  const suffixMatch = token.match(/^(\d+)\s*[x×]$/i);
  if (suffixMatch) {
    const qty = Number.parseInt(suffixMatch[1], 10);
    return Number.isFinite(qty) && qty > 0 ? qty : null;
  }

  const prefixMatch = token.match(/^[x×]\s*(\d+)$/i);
  if (prefixMatch) {
    const qty = Number.parseInt(prefixMatch[1], 10);
    return Number.isFinite(qty) && qty > 0 ? qty : null;
  }

  return null;
}

function parseAmountTokenWithQuantity(
  tokens: string[],
  index: number,
  searchLimit: number
): AmountTokenParseResult | null {
  const rawToken = tokens[index];
  const operatorTokenRegex = /^[x×]$/i;

  // Guard: token angka yang diikuti operator x/× + amount adalah qty, bukan nominal.
  const plainInteger = parsePlainIntegerToken(rawToken);
  if (plainInteger !== null && index + 1 < searchLimit) {
    const nextToken = tokens[index + 1].trim();

    if (
      operatorTokenRegex.test(nextToken) &&
      index + 2 < searchLimit &&
      parseAmountToken(tokens[index + 2])
    ) {
      return null;
    }

    const nextXPrefixedAmount = nextToken.match(/^[x×]\s*(.+)$/i);
    if (nextXPrefixedAmount && parseAmountToken(nextXPrefixedAmount[1])) {
      return null;
    }
  }

  // Guard: token operator tunggal tidak boleh dianggap nominal.
  if (operatorTokenRegex.test(rawToken.trim())) {
    return null;
  }

  const qtyBeforeCombined = rawToken.match(/^(\d+)\s*[x×]\s*(.+)$/i);
  if (qtyBeforeCombined) {
    const qty = Number.parseInt(qtyBeforeCombined[1], 10);
    const parsedAmount = parseAmountToken(qtyBeforeCombined[2]);
    if (parsedAmount && Number.isFinite(qty) && qty > 0) {
      return {
        amount: parsedAmount.amount * qty,
        warnings: parsedAmount.warnings,
        consumedIndices: [index]
      };
    }
  }

  const qtyAfterCombined = rawToken.match(/^(.+)\s*[x×]\s*(\d+)$/i);
  if (qtyAfterCombined) {
    const qty = Number.parseInt(qtyAfterCombined[2], 10);
    const parsedAmount = parseAmountToken(qtyAfterCombined[1]);
    if (parsedAmount && Number.isFinite(qty) && qty > 0) {
      return {
        amount: parsedAmount.amount * qty,
        warnings: parsedAmount.warnings,
        consumedIndices: [index]
      };
    }
  }

  const xPrefixedAmount = rawToken.match(/^[x×]\s*(.+)$/i);
  if (xPrefixedAmount) {
    const parsedAmount = parseAmountToken(xPrefixedAmount[1]);
    const qtyBefore = index - 1 >= 0 ? parsePlainIntegerToken(tokens[index - 1]) : null;
    if (parsedAmount && qtyBefore !== null) {
      return {
        amount: parsedAmount.amount * qtyBefore,
        warnings: parsedAmount.warnings,
        consumedIndices: [index],
        qtySuffixIndex: index - 1
      };
    }
  }

  const parsedAmount = parseAmountToken(rawToken);
  if (!parsedAmount) {
    return null;
  }

  let quantity = 1;

  if (index - 1 >= 0) {
    const previousQty = parseStandaloneQtyToken(tokens[index - 1]);
    if (previousQty !== null) {
      quantity = previousQty;
    } else if (
      index - 2 >= 0 &&
      operatorTokenRegex.test(tokens[index - 1].trim())
    ) {
      const previousPlainQty = parsePlainIntegerToken(tokens[index - 2]);
      if (previousPlainQty !== null) {
        quantity = previousPlainQty;
      }
    }
  }

  if (quantity === 1 && index + 1 < searchLimit) {
    const nextQty = parseStandaloneQtyToken(tokens[index + 1]);
    if (nextQty !== null) {
      quantity = nextQty;
    } else if (
      index + 2 < searchLimit &&
      operatorTokenRegex.test(tokens[index + 1].trim())
    ) {
      const nextPlainQty = parsePlainIntegerToken(tokens[index + 2]);
      if (nextPlainQty !== null) {
        quantity = nextPlainQty;
      }
    }
  }

  return {
    amount: parsedAmount.amount * quantity,
    warnings: parsedAmount.warnings,
    consumedIndices: [index]
  };
}

function parseSplitToken(tokens: string[]): SplitTokenParseResult {
  let splitCount: number | undefined;
  let splitTokenIndex = -1;
  const warnings: ParseWarning[] = [];

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
      warnings.push({
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

  return {
    ok: true,
    splitCount,
    splitTokenIndex,
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

  const normalizedForAdditionDetection = normalized.replace(/(k|rb|jt)\b/gi, "");
  const hasStandalonePlusOperator = /\s\+\s/.test(normalized);
  const hasPlusAdjacentToNumber = /(?:\d\s*\+|\+\s*\d)/.test(normalizedForAdditionDetection);
  const hasAdditionOperator = hasStandalonePlusOperator || hasPlusAdjacentToNumber;
  const tokens = hasAdditionOperator
    ? normalized.replace(/\+/g, " + ").trim().split(/\s+/).filter((token) => token.length > 0)
    : normalized.split(/\s+/);

  const splitTokenResult = parseSplitToken(tokens);
  if (!splitTokenResult.ok) {
    return { ok: false, reason: splitTokenResult.reason };
  }

  const { splitCount, splitTokenIndex } = splitTokenResult;

  if (hasAdditionOperator) {
    const additionWarnings: ParseWarning[] = [];
    const excludedIndices = new Set<number>();
    const qtySuffixIndices = new Set<number>();
    let amountParts = 0;
    let summedAmount = 0;
    const searchLimit = splitTokenIndex === -1 ? tokens.length : splitTokenIndex;

    for (let index = 0; index < searchLimit; index += 1) {
      if (tokens[index] === "+") {
        continue;
      }

      const parsed = parseAmountTokenWithQuantity(tokens, index, searchLimit);
      if (parsed) {
        for (const consumedIndex of parsed.consumedIndices) {
          excludedIndices.add(consumedIndex);
        }
        if (typeof parsed.qtySuffixIndex === "number") {
          qtySuffixIndices.add(parsed.qtySuffixIndex);
        }
        amountParts += 1;
        summedAmount += parsed.amount;
        additionWarnings.push(...parsed.warnings);
      }
    }

    if (amountParts >= 2) {
      if (summedAmount <= 0) {
        return { ok: false, reason: "Nominal harus lebih dari 0." };
      }

      const textParts: string[] = [];

      for (let index = 0; index < searchLimit; index += 1) {
        if (index === splitTokenIndex || excludedIndices.has(index)) {
          continue;
        }

        let token = tokens[index];
        if (qtySuffixIndices.has(index) && !/[x×]$/i.test(token)) {
          token = `${token}x`;
        }
        if (token !== "+") {
          textParts.push(token);
          continue;
        }

        let hasTextBefore = false;
        for (let probe = index - 1; probe >= 0; probe -= 1) {
          if (probe === splitTokenIndex || tokens[probe] === "+" || excludedIndices.has(probe)) {
            continue;
          }
          hasTextBefore = true;
          break;
        }

        let hasTextAfter = false;
        for (let probe = index + 1; probe < searchLimit; probe += 1) {
          if (probe === splitTokenIndex || tokens[probe] === "+" || excludedIndices.has(probe)) {
            continue;
          }
          hasTextAfter = true;
          break;
        }

        if (!hasTextBefore || !hasTextAfter) {
          continue;
        }

        textParts.push(",");
      }

      const text =
        textParts
          .join(" ")
          .replace(/\s+,/g, ",")
          .replace(/,\s+/g, ", ")
          .replace(/,\s*,+/g, ", ")
          .replace(/\b(\d+)\s+[x×]\b/gi, "$1x")
          .replace(/\b[x×]\s+(\d+)\b/gi, "x$1")
          .trim() || "Pengeluaran";
      const warnings: ParseWarning[] = [
        ...splitTokenResult.warnings,
        ...additionWarnings,
        {
          code: "AMOUNT_SUMMED",
          message: "Nominal dijumlahkan otomatis",
          meta: {
            parts: amountParts,
            total: summedAmount
          }
        }
      ];

      return {
        ok: true,
        value: {
          rawInput: normalized,
          text,
          amount: summedAmount,
          splitCount,
          date: toISODate(now),
          source
        },
        warnings: warnings.length > 0 ? warnings : undefined
      };
    }
  }

  const searchLimit = splitTokenIndex === -1 ? tokens.length : splitTokenIndex;
  let amountIndices: number[] = [];
  let qtySuffixIndices: number[] = [];
  let amountValue: number | null = null;
  let amountWarnings: ParseWarning[] = [];

  for (let index = searchLimit - 1; index >= 0; index -= 1) {
    const parsed = parseAmountTokenWithQuantity(tokens, index, searchLimit);
    if (parsed !== null) {
      amountValue = parsed.amount;
      amountIndices = parsed.consumedIndices;
      qtySuffixIndices = typeof parsed.qtySuffixIndex === "number" ? [parsed.qtySuffixIndex] : [];
      amountWarnings = parsed.warnings;
      break;
    }
  }

  if (amountIndices.length === 0 || amountValue === null) {
    return { ok: false, reason: "Nominal tidak ditemukan." };
  }

  if (amountValue <= 0) {
    return { ok: false, reason: "Nominal harus lebih dari 0." };
  }

  const amountIndexSet = new Set(amountIndices);
  const qtySuffixSet = new Set(qtySuffixIndices);
  const textTokens = tokens
    .map((token, index) => {
      if (amountIndexSet.has(index) || index === splitTokenIndex) {
        return null;
      }
      if (qtySuffixSet.has(index) && !/[x×]$/i.test(token)) {
        return `${token}x`;
      }
      return token;
    })
    .filter((token): token is string => token !== null);
  const text =
    textTokens
      .join(" ")
      .replace(/\b(\d+)\s+[x×]\b/gi, "$1x")
      .replace(/\b[x×]\s+(\d+)\b/gi, "x$1")
      .trim() || "Pengeluaran";

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
      splitTokenResult.warnings.length + amountWarnings.length > 0
        ? [...splitTokenResult.warnings, ...amountWarnings]
        : undefined
  };
}
