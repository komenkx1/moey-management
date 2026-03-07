export const CATEGORIES = [
  "Makan",
  "Transport",
  "Belanja",
  "Tagihan",
  "Hiburan",
  "Lainnya"
] as const;

export type Category = (typeof CATEGORIES)[number];
export const PAYMENT_METHODS = [
  "Unknown",
  "Cash",
  "QRIS",
  "Debit",
  "Credit",
  "Transfer"
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type SplitMode = "equal" | "custom";
export type EntrySource = "quick_add" | "bulk_paste" | "scan_receipt";
export type ParseWarningCode =
  | "ASSUMED_THOUSANDS"
  | "AMOUNT_TOKEN_CLEANED"
  | "SPLIT_COUNT_IGNORED"
  | "AMOUNT_SUMMED";
export type RuleMatch = "contains" | "equals";

export interface SplitShare {
  person: string;
  amount: number;
}

export interface EntrySplit {
  mode: SplitMode;
  payer: string;
  shares: SplitShare[];
}

export interface Entry {
  id: string;
  owner_id?: string;
  text: string;
  amount: number;
  rawInput?: string;
  date: string;
  category: Category;
  paymentMethod?: PaymentMethod;
  source: EntrySource;
  parseWarnings?: ParseWarning[];
  createdAt: string;
  updatedAt: string;
  split?: EntrySplit;
}

export interface ParsedEntryDraft {
  text: string;
  amount: number;
  date: string;
  splitCount?: number;
  source: EntrySource;
  rawInput: string;
}

export interface ParseWarning {
  code: ParseWarningCode;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ParseResult {
  ok: true;
  value: ParsedEntryDraft;
  warnings?: ParseWarning[];
}

export interface ParseError {
  ok: false;
  reason: string;
}

export type ParseQuickAddResult = ParseResult | ParseError;

export interface CategoryRule {
  owner_id?: string;
  pattern: string;
  match: RuleMatch;
  category: Category;
}

export type CategoryRules = CategoryRule[];
