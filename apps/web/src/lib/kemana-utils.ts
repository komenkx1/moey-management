import { formatAmountCompact, formatAmountIDR } from "@kemana/core/format";
import { buildEqualSplit } from "@kemana/core/split";
import type {
  Category,
  Entry,
  EntrySplit,
  ParseQuickAddResult,
  ParseWarning,
  PaymentMethod
} from "@kemana/core/types";

export type DateFilterPreset = "today" | "7d" | "30d" | "all" | "custom";

export interface CustomDateRange {
  start: string;
  end: string;
}

export const FILTER_OPTIONS: Array<{ value: DateFilterPreset; label: string }> = [
  { value: "today", label: "Hari ini" },
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "all", label: "Semua" },
  { value: "custom", label: "Custom" }
];

export interface TopCategorySummary {
  category: Category;
  totalAmount: number;
}

export interface CategoryBreakdown {
  category: Category;
  totalAmount: number;
  percentage: number;
}

export interface SpendingStatus {
  label: string;
  tone: "hemat" | "aman" | "normal" | "lumayan" | "boros";
}

export interface SmartEmptyState {
  title: string;
  subtitle: string;
}

export interface TodaySummaryStats {
  periodLabel: string;
  totalAmount: number;
  entryCount: number;
  topCategory: TopCategorySummary | null;
  topCategories: CategoryBreakdown[];
  sevenDayAverage: number;
  compareText: string;
  status: SpendingStatus;
  emptyState: SmartEmptyState | null;
}

export interface ItemLine {
  label: string;
  qty?: number;
  amount?: number;
  amountRaw?: string;
  raw: string;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function offsetDate(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

export function parseDateKey(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function normalizeDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (parseDateKey(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return toDateKey(parsed);
}

export function getDefaultCustomDateRange(now: Date = new Date()): CustomDateRange {
  return {
    start: toDateKey(offsetDate(now, -6)),
    end: toDateKey(now)
  };
}

export function normalizeCustomDateRange(
  range: CustomDateRange | null | undefined,
  now: Date = new Date()
): CustomDateRange {
  const fallback = getDefaultCustomDateRange(now);
  if (!range) {
    return fallback;
  }

  const start = normalizeDateInput(range.start);
  const end = normalizeDateInput(range.end);
  if (!start || !end) {
    return fallback;
  }

  if (start <= end) {
    return { start, end };
  }

  return { start: end, end: start };
}

export function getCustomRangeDayCount(range: CustomDateRange): number {
  const startDate = parseDateKey(range.start);
  const endDate = parseDateKey(range.end);
  if (!startDate || !endDate) {
    return 1;
  }
  const diffDays = Math.floor((toDayStartTimestamp(endDate) - toDayStartTimestamp(startDate)) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

export function getEntryReportAmount(entry: Entry): number {
  if (!entry.split || !entry.split.shares.length) {
    return entry.amount;
  }

  const ownShare = entry.split.shares.find(
    (share) => share.person.trim().toLowerCase() === "kamu"
  );
  if (!ownShare || !Number.isFinite(ownShare.amount)) {
    return entry.amount;
  }

  return Math.max(0, Math.round(ownShare.amount));
}

export function sumAmount(items: Entry[]): number {
  return items.reduce((sum, entry) => sum + getEntryReportAmount(entry), 0);
}

export function toDayStartTimestamp(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatDayLabel(dateISO: string, now: Date = new Date()): string {
  const todayKey = toDateKey(now);
  if (dateISO === todayKey) {
    return "Hari ini";
  }

  const yesterdayKey = toDateKey(offsetDate(now, -1));
  if (dateISO === yesterdayKey) {
    return "Kemarin";
  }

  const parsed = parseDateKey(dateISO);
  if (!parsed) {
    return dateISO;
  }

  const diffDays = Math.floor((toDayStartTimestamp(now) - toDayStartTimestamp(parsed)) / 86_400_000);

  if (diffDays >= 0 && diffDays <= 6) {
    const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(parsed);
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short"
  };
  if (parsed.getFullYear() !== now.getFullYear()) {
    formatOptions.year = "numeric";
  }
  const label = new Intl.DateTimeFormat("id-ID", formatOptions).format(parsed);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function groupEntriesByDate(entries: Entry[]): { dates: string[]; groups: Record<string, Entry[]> } {
  const groups: Record<string, Array<{ entry: Entry; index: number }>> = {};

  for (const [index, entry] of entries.entries()) {
    if (!groups[entry.date]) {
      groups[entry.date] = [];
    }
    groups[entry.date].push({ entry, index });
  }

  const sortedGroups: Record<string, Entry[]> = {};
  for (const [dateISO, items] of Object.entries(groups)) {
    sortedGroups[dateISO] = [...items]
      .sort((a, b) => {
        const aCreated = Date.parse(a.entry.createdAt);
        const bCreated = Date.parse(b.entry.createdAt);

        if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
          return bCreated - aCreated;
        }

        const aUpdated = Date.parse(a.entry.updatedAt);
        const bUpdated = Date.parse(b.entry.updatedAt);
        if (Number.isFinite(aUpdated) && Number.isFinite(bUpdated) && aUpdated !== bUpdated) {
          return bUpdated - aUpdated;
        }

        return a.index - b.index;
      })
      .map((item) => item.entry);
  }

  const dates = Object.keys(sortedGroups).sort((a, b) => b.localeCompare(a));
  return { dates, groups: sortedGroups };
}

export function getFilteredEntries(
  entries: Entry[],
  preset: DateFilterPreset,
  now: Date = new Date(),
  customRange?: CustomDateRange | null
): Entry[] {
  const todayKey = toDateKey(now);
  if (preset === "all") {
    return entries;
  }

  if (preset === "custom") {
    const range = normalizeCustomDateRange(customRange, now);
    return entries.filter((entry) => entry.date >= range.start && entry.date <= range.end);
  }

  if (preset === "today") {
    return entries.filter((entry) => entry.date === todayKey);
  }

  const days = preset === "7d" ? 7 : 30;
  const startKey = toDateKey(offsetDate(now, -(days - 1)));
  return entries.filter((entry) => entry.date >= startKey && entry.date <= todayKey);
}

export function includesDateInFilter(
  dateISO: string,
  preset: DateFilterPreset,
  now: Date = new Date(),
  customRange?: CustomDateRange | null
): boolean {
  const todayKey = toDateKey(now);
  if (preset === "all") {
    return true;
  }
  if (preset === "custom") {
    const range = normalizeCustomDateRange(customRange, now);
    return dateISO >= range.start && dateISO <= range.end;
  }
  if (preset === "today") {
    return dateISO === todayKey;
  }

  const days = preset === "7d" ? 7 : 30;
  const startKey = toDateKey(offsetDate(now, -(days - 1)));
  return dateISO >= startKey && dateISO <= todayKey;
}

export function getBestFilterForDate(
  dateISO: string,
  now: Date = new Date()
): DateFilterPreset {
  const parsed = parseDateKey(dateISO);
  if (!parsed) {
    return "all";
  }

  const diffDays = Math.floor(
    (toDayStartTimestamp(now) - toDayStartTimestamp(parsed)) / 86_400_000
  );

  if (diffDays === 0) {
    return "today";
  }
  if (diffDays >= 0 && diffDays <= 6) {
    return "7d";
  }
  if (diffDays >= 0 && diffDays <= 29) {
    return "30d";
  }
  return "all";
}

function formatRangeDate(dateISO: string, now: Date): string {
  const parsed = parseDateKey(dateISO);
  if (!parsed) {
    return dateISO;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    ...(parsed.getFullYear() === now.getFullYear() ? {} : { year: "numeric" })
  }).format(parsed);
}

export function getFilterLabel(
  preset: DateFilterPreset,
  customRange?: CustomDateRange | null,
  now: Date = new Date()
): string {
  switch (preset) {
    case "today":
      return "Hari ini";
    case "7d":
      return "7 hari terakhir";
    case "30d":
      return "30 hari terakhir";
    case "custom": {
      const range = normalizeCustomDateRange(customRange, now);
      return `${formatRangeDate(range.start, now)} - ${formatRangeDate(range.end, now)}`;
    }
    default:
      return "Semua data";
  }
}

export function getSpendingStatus(params: {
  todayTotal: number;
  sevenDayAverage: number;
  trackedDays: number;
}): SpendingStatus {
  const { todayTotal, sevenDayAverage, trackedDays } = params;

  if (todayTotal === 0) {
    return { label: "Hemat 🎉", tone: "hemat" };
  }

  // Data masih sangat sedikit: kasih observasi, bukan judgement.
  if (trackedDays < 3) {
    return { label: "Lagi ngumpulin pola dulu", tone: "normal" };
  }

  // Data belum stabil: tetap supportif.
  if (trackedDays < 7) {
    return { label: "Masih belajar pola pengeluaranmu", tone: "normal" };
  }

  if (sevenDayAverage <= 0) {
    return { label: "Normal 🙂", tone: "normal" };
  }

  // Sudah bisa dibandingkan, tapi belum cukup lama untuk label keras.
  if (trackedDays < 21) {
    if (todayTotal < sevenDayAverage * 0.6) {
      return { label: "Lebih ringan dari biasanya", tone: "aman" };
    }
    if (todayTotal < sevenDayAverage * 1.2) {
      return { label: "Masih di kisaran biasa", tone: "normal" };
    }
    if (todayTotal < sevenDayAverage * 1.8) {
      return { label: "Hari ini agak banyak", tone: "lumayan" };
    }
    return { label: "Lebih besar dari biasanya hari ini", tone: "lumayan" };
  }

  if (todayTotal < sevenDayAverage * 0.6) {
    return { label: "Aman 👍", tone: "aman" };
  }
  if (todayTotal < sevenDayAverage * 1.2) {
    return { label: "Normal 🙂", tone: "normal" };
  }
  if (todayTotal < sevenDayAverage * 1.8) {
    return { label: "Lumayan 💸", tone: "lumayan" };
  }
  return { label: "Boros 😬", tone: "boros" };
}

export function getTopCategory(entries: Entry[]): TopCategorySummary | null {
  if (entries.length === 0) {
    return null;
  }

  const perCategory = new Map<Category, number>();
  for (const entry of entries) {
    perCategory.set(
      entry.category,
      (perCategory.get(entry.category) ?? 0) + getEntryReportAmount(entry)
    );
  }

  let top: TopCategorySummary | null = null;
  for (const [category, totalAmount] of perCategory.entries()) {
    if (!top || totalAmount > top.totalAmount) {
      top = { category, totalAmount };
    }
  }

  return top;
}

export function getTopCategoryBreakdown(entries: Entry[]): CategoryBreakdown[] {
  const totalAmount = entries.reduce((sum, entry) => sum + getEntryReportAmount(entry), 0);
  if (entries.length === 0 || totalAmount <= 0) {
    return [];
  }

  const perCategory = new Map<Category, number>();
  for (const entry of entries) {
    perCategory.set(
      entry.category,
      (perCategory.get(entry.category) ?? 0) + getEntryReportAmount(entry)
    );
  }

  return Array.from(perCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([category, amount]) => ({
      category,
      totalAmount: amount,
      percentage: Math.max(1, Math.round((amount / totalAmount) * 100))
    }));
}

export function getSmartEmptyState(entries: Entry[], now: Date = new Date()): SmartEmptyState {
  if (entries.length === 0) {
    return {
      title: "Catat pengeluaran pertamamu",
      subtitle: "Biar tau uangmu kemana"
    };
  }

  const yesterdayKey = toDateKey(offsetDate(now, -1));
  const hasYesterdayEntry = entries.some((entry) => entry.date === yesterdayKey);
  if (hasYesterdayEntry) {
    return {
      title: "Hari ini kamu nggak keluar uang 🎉",
      subtitle: "Dompet istirahat hari ini"
    };
  }

  const last7Keys = Array.from({ length: 7 }, (_, index) => toDateKey(offsetDate(now, -(index + 1))));
  const last7KeySet = new Set(last7Keys);
  const activeDays = new Set(
    entries
      .filter((entry) => last7KeySet.has(entry.date))
      .map((entry) => entry.date)
  );

  if (activeDays.size >= 4) {
    return {
      title: "Belum ada catatan hari ini",
      subtitle: "Ada yang kelupaan?"
    };
  }

  if (entries.length <= 2) {
    return {
      title: "Catat pengeluaran pertamamu",
      subtitle: "Biar tau uangmu kemana"
    };
  }

  return {
    title: "Belum ada catatan hari ini",
    subtitle: "Ada yang kelupaan?"
  };
}

export function getSummaryStats(params: {
  allEntries: Entry[];
  filteredEntries: Entry[];
  preset: DateFilterPreset;
  customRange?: CustomDateRange | null;
  now?: Date;
}): TodaySummaryStats {
  const { allEntries, filteredEntries, preset, customRange, now = new Date() } = params;
  const totalAmount = filteredEntries.reduce(
    (sum, entry) => sum + getEntryReportAmount(entry),
    0
  );
  const trackedDays = new Set(allEntries.map((entry) => entry.date)).size;
  const last7Keys = Array.from({ length: 7 }, (_, index) => toDateKey(offsetDate(now, -(index + 1))));
  const dailyTotals = new Map<string, number>();
  for (const entry of allEntries) {
    dailyTotals.set(
      entry.date,
      (dailyTotals.get(entry.date) ?? 0) + getEntryReportAmount(entry)
    );
  }
  const sevenDayTotal = last7Keys.reduce((sum, dateKey) => sum + (dailyTotals.get(dateKey) ?? 0), 0);
  const sevenDayAverage = sevenDayTotal / 7;
  const topCategory = getTopCategory(filteredEntries);
  const topCategories = getTopCategoryBreakdown(filteredEntries);

  if (preset === "today") {
    const status = getSpendingStatus({
      todayTotal: totalAmount,
      sevenDayAverage,
      trackedDays
    });
    const emptyState = filteredEntries.length === 0 ? getSmartEmptyState(allEntries, now) : null;
    const compareText =
      trackedDays < 3
        ? `Baru ${trackedDays} hari data, insight masih awal.`
        : trackedDays < 7
          ? `Masih belajar dari ${trackedDays} hari catatan.`
          : `Rata-rata 7 hari: Rp${formatAmountIDR(Math.round(sevenDayAverage))}`;

    return {
      periodLabel: getFilterLabel(preset, customRange, now),
      totalAmount,
      entryCount: filteredEntries.length,
      topCategory,
      topCategories,
      sevenDayAverage,
      compareText,
      status,
      emptyState
    };
  }

  const status: SpendingStatus =
    totalAmount === 0
      ? { label: "Hemat 🎉", tone: "hemat" }
      : { label: "Normal 🙂", tone: "normal" };
  const emptyState =
    filteredEntries.length === 0
      ? {
          title:
            preset === "custom"
              ? "Belum ada catatan di rentang custom"
              : `Belum ada catatan di ${getFilterLabel(preset, customRange, now).toLowerCase()}`,
          subtitle: "Coba ubah rentang tanggal."
        }
      : null;
  const normalizedCustomRange = normalizeCustomDateRange(customRange, now);
  const dayCount =
    preset === "7d"
      ? 7
      : preset === "30d"
        ? 30
        : preset === "custom"
          ? getCustomRangeDayCount(normalizedCustomRange)
        : Math.max(1, new Set(filteredEntries.map((entry) => entry.date)).size);
  const averageForRange = totalAmount / dayCount;

  return {
    periodLabel: getFilterLabel(preset, customRange, now),
    totalAmount,
    entryCount: filteredEntries.length,
    topCategory,
    topCategories,
    sevenDayAverage,
    compareText:
      preset === "all"
        ? `Rata-rata per hari aktif: Rp${formatAmountIDR(Math.round(averageForRange))}`
        : `Rata-rata ${dayCount} hari: Rp${formatAmountIDR(Math.round(averageForRange))}`,
    status,
    emptyState
  };
}

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

  if (hasMerchantFormat || endsWithMerchantDash) {
    return ["Format merchant: Gacoan - mie 25k + es 10k"];
  }

  if (!hasDigit) {
    return ["Format cepat: kopi 18 atau dinner 120 3p"];
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
