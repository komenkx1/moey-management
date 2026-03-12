import { formatAmountCompact } from "@kemana/core/format";
import { buildEqualSplit } from "@kemana/core/split";
import type { EntrySplit, ParseQuickAddResult, ParseWarning, PaymentMethod } from "@kemana/core/types";
import type { ItemLine } from "./base";
export function paymentMethodLabel(value: PaymentMethod | undefined): string {
  switch (value) {
    case "Cash":
      return "Tunai";
    case "QRIS":
      return "QRIS";
    case "Debit":
      return "Debit";
    case "Credit":
      return "Kredit";
    case "Transfer":
      return "Transfer";
    default:
      return "Belum pilih";
  }
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function detectQtyTokens(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return false;
  }

  return (
    /\b\d+\s*[x×]\s*\d+\b/i.test(normalized) ||
    /\b[a-zA-Z][\w-]*(?:\s+[a-zA-Z][\w-]*)*\s+[x×]\s*\d+\b/i.test(normalized) ||
    /\b\d+\s*[x×]\s*[a-zA-Z][\w-]*/i.test(normalized)
  );
}

export function warningShortText(warning: ParseWarning): string {
  switch (warning.code) {
    case "ASSUMED_THOUSANDS":
      return "Nominal diasumsikan ribuan";
    case "AMOUNT_TOKEN_CLEANED":
      return "Format nominal dibersihkan otomatis";
    case "SPLIT_COUNT_IGNORED":
      return "Split 1p diabaikan";
    case "AMOUNT_SUMMED":
      return "Nominal dijumlahkan otomatis";
    default:
      return warning.message;
  }
}

export function warningDetail(warning: ParseWarning): string {
  switch (warning.code) {
    case "ASSUMED_THOUSANDS":
      return "Nominal diasumsikan ribuan.";
    case "AMOUNT_TOKEN_CLEANED":
      return "Token nominal dibersihkan otomatis.";
    case "SPLIT_COUNT_IGNORED":
      return "Split 1p diabaikan karena tidak perlu pembagian.";
    case "AMOUNT_SUMMED":
      return "Nominal dijumlahkan otomatis.";
    default:
      return warning.message;
  }
}

export function extractSummedAmountMeta(
  warnings?: ParseWarning[]
): { parts: number; total: number } | null {
  const sumWarning = warnings?.find((warning) => warning.code === "AMOUNT_SUMMED");
  if (!sumWarning?.meta) {
    return null;
  }

  const parts = Number(sumWarning.meta.parts);
  const total = Number(sumWarning.meta.total);
  if (!Number.isFinite(parts) || !Number.isFinite(total) || parts < 2 || total <= 0) {
    return null;
  }

  return { parts, total };
}

export function splitDisplayText(text: string): { title: string; subtitle?: string } {
  const delimiters = [" - ", " — "];
  let matchedDelimiter: string | null = null;
  let delimiterIndex = -1;

  for (const delimiter of delimiters) {
    const index = text.indexOf(delimiter);
    if (index > 0 && (delimiterIndex === -1 || index < delimiterIndex)) {
      delimiterIndex = index;
      matchedDelimiter = delimiter;
    }
  }

  if (!matchedDelimiter || delimiterIndex < 0) {
    return { title: text };
  }

  const title = text.slice(0, delimiterIndex).trim();
  const subtitle = text.slice(delimiterIndex + matchedDelimiter.length).trim();

  if (!title || !subtitle) {
    return { title: text };
  }

  return { title, subtitle };
}

export function splitSubtitleItems(subtitle: string): string[] | null {
  if (!/[,;•]|\s\+\s/.test(subtitle)) {
    return null;
  }

  const items = subtitle
    .split(/[,;•]|\s\+\s/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : null;
}

export function parseDisplayAmountToken(token: string): number | undefined {
  const lowered = token.trim().toLowerCase();
  if (!lowered) {
    return undefined;
  }

  const cleaned = lowered
    .replace(/^rp\s*/i, "")
    .replace(/[^a-z0-9.,]/g, "")
    .replace(/[.,]+$/g, "");

  const match = cleaned.match(/^(\d+(?:[.,]\d+)?)(k|rb|jt)?$/i);
  if (!match) {
    return undefined;
  }

  const numericPart = match[1];
  const suffix = match[2]?.toLowerCase();

  if (suffix) {
    const parsedFloat = Number.parseFloat(numericPart.replace(",", "."));
    if (!Number.isFinite(parsedFloat)) {
      return undefined;
    }
    const multiplier = suffix === "jt" ? 1_000_000 : 1_000;
    return Math.round(parsedFloat * multiplier);
  }

  const parsedInt = Number.parseInt(numericPart.replace(/[.,]/g, ""), 10);
  if (!Number.isFinite(parsedInt)) {
    return undefined;
  }

  if (parsedInt >= 1 && parsedInt <= 999) {
    return parsedInt * 1_000;
  }

  return parsedInt;
}

export function parseItemBreakdownFromSubtitle(subtitle: string): ItemLine[] | null {
  if (!/[,;•]|\s\+\s/.test(subtitle)) {
    return null;
  }

  const rawItems = subtitle
    .split(/[,;•]|\s\+\s/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 0);

  if (rawItems.length < 2) {
    return null;
  }

  const amountTokenRegex =
    /(?:rp\s*)?\d+(?:[.,]\d+)?(?:k|rb|jt)?|\d+(?:[.,]\d+)?(?:k|rb|jt)?/gi;

  const lines = rawItems.map((raw) => {
    const rawItem = raw.replace(/\s+/g, " ").trim();
    const qtySuffixMatch = rawItem.match(/[x×]\s*(\d+)\b/i);
    const qtyPrefixMatch = rawItem.match(/\b(\d+)\s*[x×](?=\s*\d|\s*[a-zA-Z])/i);
    const qtyValue = qtySuffixMatch?.[1] ?? qtyPrefixMatch?.[1];
    const qty = qtyValue ? Number.parseInt(qtyValue, 10) : undefined;

    const amountMatches = Array.from(rawItem.matchAll(amountTokenRegex));
    const lastAmountToken = amountMatches[amountMatches.length - 1]?.[0]?.trim();
    const amount = lastAmountToken ? parseDisplayAmountToken(lastAmountToken) : undefined;

    let label = rawItem;
    label = label.replace(/\b\d+\s*[x×](?=\s*\d|\s*[a-zA-Z]|\s|$)/gi, " ");
    label = label.replace(/(?:^|\s)[x×]\s*\d+\b/gi, " ");
    if (lastAmountToken) {
      label = label.replace(new RegExp(escapeRegExp(lastAmountToken), "ig"), " ");
    }
    label = label.replace(/\s+/g, " ").trim();
    if (!label) {
      label = rawItem;
    }

    return {
      raw: rawItem,
      label,
      qty: Number.isFinite(qty) && qty && qty > 0 ? qty : undefined,
      amount,
      amountRaw: lastAmountToken
    };
  });

  const validCount = lines.filter(
    (item) => item.label.length > 0 || item.qty !== undefined || item.amount !== undefined
  ).length;

  return validCount >= 2 ? lines : null;
}

export function formatItemPillText(item: ItemLine): string {
  const label = item.label || item.raw;
  const qtyPart = item.qty ? ` ×${item.qty}` : "";
  if (item.amount !== undefined) {
    return `${label}${qtyPart} • Rp${formatAmountCompact(item.amount)}`;
  }
  return `${label}${qtyPart}`.trim();
}

export function getInputHints(
  input: string,
  preview: ParseQuickAddResult | null
): string[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  const hasDigit = /\d/.test(trimmed);
  const hasMerchantFormat = /\s[-—]\s/.test(trimmed);
  const endsWithMerchantDash = /[-—]\s*$/.test(trimmed);
  const hasSumPattern =
    /\d\s*\+\s*\d/.test(trimmed) ||
    (preview?.ok ? extractSummedAmountMeta(preview.warnings) !== null : false);
  const hasQtyPattern = detectQtyTokens(trimmed);

  if (hasQtyPattern) {
    return ["Qty opsional: mie x2 25k atau Aqua 2x 5k"];
  }

  if (hasSumPattern) {
    return ["Jumlahkan pakai + : 25 + 10 + 5"];
  }

  if (preview?.ok && preview.value.date !== undefined) {
    const todayKey = new Date();
    const isBackdated = preview.value.date !== `${todayKey.getFullYear()}-${`${todayKey.getMonth() + 1}`.padStart(2, "0")}-${`${todayKey.getDate()}`.padStart(2, "0")}`;
    if (isBackdated) {
      return ['Catatan ini akan masuk ke tanggal yang kamu pilih, bukan waktu saat input.'];
    }
  }

  if (hasMerchantFormat || endsWithMerchantDash) {
    return ["Format merchant: Gacoan - mie 25k + es 10k"];
  }

  if (!hasDigit) {
    return ['Format cepat: kopi 18, dinner 120 3p, atau tambah "kemarin" di belakang.'];
  }

  return [];
}

export function makeInitialSplit(amount: number, splitCount?: number): EntrySplit | undefined {
  if (!splitCount || splitCount <= 1) {
    return undefined;
  }

  const people = ["Kamu", ...Array.from({ length: splitCount - 1 }, (_, index) => `Orang ${index + 2}`)];
  return {
    mode: "equal",
    payer: "Kamu",
    shares: buildEqualSplit(amount, people)
  };
}

function splitPeopleInputTokens(input: string): string[] {
  return input
    .split(",")
    .map((person) => person.trim())
    .filter(Boolean);
}

export function normalizeSplitPeopleWithLockedSelf(
  input: string,
  selfPerson: string = "Kamu"
): string[] {
  const normalizedSelf = selfPerson.trim() || "Kamu";
  const selfKey = normalizedSelf.toLowerCase();
  const seen = new Set<string>();
  const people: string[] = [];

  for (const token of splitPeopleInputTokens(input)) {
    const key = token.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    people.push(key === selfKey ? normalizedSelf : token);
  }

  if (!seen.has(selfKey)) {
    people.unshift(normalizedSelf);
  }

  return people;
}

export function toSplitPeopleInputWithLockedSelf(
  input: string,
  selfPerson: string = "Kamu"
): string {
  return normalizeSplitPeopleWithLockedSelf(input, selfPerson).join(", ");
}

export function getSplitOtherPeopleInput(
  input: string,
  selfPerson: string = "Kamu"
): string {
  const selfKey = selfPerson.trim().toLowerCase() || "kamu";
  return normalizeSplitPeopleWithLockedSelf(input, selfPerson)
    .filter((person) => person.toLowerCase() !== selfKey)
    .join(", ");
}
