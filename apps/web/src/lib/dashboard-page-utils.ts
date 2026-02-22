import { formatAmountIDR } from "@kemana/core/format";
import type { Entry } from "@kemana/core/types";
import {
  type CustomDateRange,
  type DateFilterPreset,
  formatDayLabel,
  getEntryReportAmount,
  getCustomRangeDayCount,
  getFilterLabel,
  getFilteredEntries,
  offsetDate,
  normalizeCustomDateRange,
  parseDateKey,
  paymentMethodLabel,
  splitDisplayText,
  sumAmount,
  toDateKey
} from "./kemana-utils";

export interface InsightTopCategoryItem {
  category: Entry["category"];
  amount: number;
  count: number;
  percentage: number;
}

export interface InsightTopDimensionItem {
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface InsightLargestEntryItem {
  id: string;
  title: string;
  amount: number;
  category: Entry["category"];
  paymentMethod: string;
  dateLabel: string;
}

export type InsightDirection = "up" | "down" | "flat";

export interface InsightSevenDaySummary {
  periodLabel: string;
  comparisonLabel: string | null;
  windowDays: number | null;
  total: number;
  previousTotal: number;
  delta: number;
  direction: InsightDirection;
  deltaPct: number | null;
  averagePerDay: number;
  entryCount: number;
  activeDays: number;
  topCategories: InsightTopCategoryItem[];
  topCategory: InsightTopCategoryItem | null;
  topPayment: InsightTopDimensionItem | null;
  topWeekday: InsightTopDimensionItem | null;
  topTimeSlot: InsightTopDimensionItem | null;
  largestEntries: InsightLargestEntryItem[];
  hasData: boolean;
}

export interface InsightWhyCardItem {
  key: string;
  label: string;
  value: string;
  detail: string;
}

export interface InsightCoachCopy {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
}

export interface InsightTrendBadge {
  label: string;
  tone: "up" | "down" | "neutral";
}

export interface QuickFormatTemplate {
  id: "basic" | "qty" | "sum" | "split";
  sample: string;
  description: string;
}

export interface NotesVirtualizationPlan {
  shouldVirtualize: boolean;
  visibleCount: number;
  hasMore: boolean;
}

export function getInitialNotesRenderCount(
  totalEntries: number,
  threshold: number,
  chunkSize: number
): number {
  if (totalEntries <= threshold) {
    return totalEntries;
  }
  return Math.min(totalEntries, chunkSize);
}

export function getNextNotesRenderCount(
  currentCount: number,
  totalEntries: number,
  chunkSize: number
): number {
  return Math.min(totalEntries, currentCount + chunkSize);
}

export function deriveNotesVirtualizationPlan(params: {
  totalEntries: number;
  requestedRenderCount: number;
  threshold: number;
  chunkSize: number;
}): NotesVirtualizationPlan {
  const { totalEntries, requestedRenderCount, threshold, chunkSize } = params;
  const safeTotal = Math.max(0, totalEntries);
  const shouldVirtualize = safeTotal > threshold;

  if (!shouldVirtualize) {
    return {
      shouldVirtualize,
      visibleCount: safeTotal,
      hasMore: false
    };
  }

  const minimumWindow = Math.max(chunkSize, requestedRenderCount);
  const visibleCount = Math.min(safeTotal, minimumWindow);

  return {
    shouldVirtualize,
    visibleCount,
    hasMore: visibleCount < safeTotal
  };
}

export function getEntryActivityTimestamp(entry: Entry): number {
  const createdAt = Date.parse(entry.createdAt);
  if (Number.isFinite(createdAt)) {
    return createdAt;
  }

  const updatedAt = Date.parse(entry.updatedAt);
  if (Number.isFinite(updatedAt)) {
    return updatedAt;
  }

  const fallback = Date.parse(`${entry.date}T12:00:00`);
  return Number.isFinite(fallback) ? fallback : 0;
}

function getInsightTimeSlotLabel(hour: number): string {
  if (hour < 5) {
    return "Dini hari";
  }
  if (hour < 11) {
    return "Pagi";
  }
  if (hour < 15) {
    return "Siang";
  }
  if (hour < 19) {
    return "Sore";
  }
  return "Malam";
}

export function extractQuickFormatKeyword(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const tokens = trimmed
    .replace(/[,+]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  for (const token of tokens) {
    const normalized = token.replace(/^[\-–—]+|[\-–—]+$/g, "");
    if (!normalized) {
      continue;
    }

    if (/^\d+p$/i.test(normalized)) {
      continue;
    }
    if (/^\d+(?:[.,]\d+)?(?:k|rb|jt)?$/i.test(normalized)) {
      continue;
    }
    if (/^[x×]\d+$/i.test(normalized) || /^\d+[x×]$/i.test(normalized)) {
      continue;
    }
    if (/^\d+[x×]\d+(?:[.,]\d+)?(?:k|rb|jt)?$/i.test(normalized)) {
      continue;
    }

    if (/[a-zA-Z]/.test(normalized)) {
      return normalized.toLowerCase();
    }
  }

  return null;
}

export function deriveQuickFormatTemplates(params: {
  quickInput: string;
  fallbackBase?: string;
}): QuickFormatTemplate[] {
  const fallbackBase = params.fallbackBase ?? "makan";
  const keywordRaw = extractQuickFormatKeyword(params.quickInput) ?? fallbackBase;
  const keyword = keywordRaw.replace(/\s+/g, " ").trim().slice(0, 24) || "makan";
  const base = keyword.toLowerCase();

  const templates: QuickFormatTemplate[] = [
    {
      id: "basic",
      sample: `${base} 20k`,
      description: "Nominal cepat"
    },
    {
      id: "qty",
      sample: `${base} 3x 15k`,
      description: "Qty x nominal"
    },
    {
      id: "sum",
      sample: `${base} 20k + 15k`,
      description: "Jumlahkan item"
    },
    {
      id: "split",
      sample: `${base} 45k 3p`,
      description: "Split 3 orang"
    }
  ];

  const intent =
    /\d+\s*p$/i.test(params.quickInput) || /\bp\d+$/i.test(params.quickInput)
      ? "split"
      : /[+]/.test(params.quickInput)
        ? "sum"
        : /[x×]/i.test(params.quickInput)
          ? "qty"
          : "basic";

  return [...templates].sort((left, right) => {
    const leftPriority = left.id === intent ? 0 : 1;
    const rightPriority = right.id === intent ? 0 : 1;
    return leftPriority - rightPriority;
  });
}

function getInsightWindowMeta(
  preset: DateFilterPreset,
  customRange?: CustomDateRange | null,
  now: Date = new Date()
): {
  periodLabel: string;
  comparisonLabel: string | null;
  windowDays: number | null;
  resolvedCustomRange: CustomDateRange | null;
} {
  if (preset === "today") {
    return {
      periodLabel: getFilterLabel(preset, customRange, now),
      comparisonLabel: "hari sebelumnya",
      windowDays: 1,
      resolvedCustomRange: null
    };
  }

  if (preset === "7d") {
    return {
      periodLabel: getFilterLabel(preset, customRange, now),
      comparisonLabel: "pekan lalu",
      windowDays: 7,
      resolvedCustomRange: null
    };
  }

  if (preset === "30d") {
    return {
      periodLabel: getFilterLabel(preset, customRange, now),
      comparisonLabel: "30 hari sebelumnya",
      windowDays: 30,
      resolvedCustomRange: null
    };
  }

  if (preset === "custom") {
    const resolvedCustomRange = normalizeCustomDateRange(customRange, now);
    const windowDays = getCustomRangeDayCount(resolvedCustomRange);

    return {
      periodLabel: getFilterLabel(preset, resolvedCustomRange, now),
      comparisonLabel: `${windowDays} hari sebelumnya`,
      windowDays,
      resolvedCustomRange
    };
  }

  return {
    periodLabel: getFilterLabel(preset, customRange, now),
    comparisonLabel: null,
    windowDays: null,
    resolvedCustomRange: null
  };
}

function shiftCustomRange(range: CustomDateRange, days: number): CustomDateRange {
  const startDate = parseDateKey(range.start);
  const endDate = parseDateKey(range.end);
  if (!startDate || !endDate) {
    return range;
  }

  return {
    start: toDateKey(offsetDate(startDate, days)),
    end: toDateKey(offsetDate(endDate, days))
  };
}

export function deriveInsightSummary(
  entries: Entry[],
  preset: DateFilterPreset,
  now: Date = new Date(),
  customRange?: CustomDateRange | null
): InsightSevenDaySummary {
  const { periodLabel, comparisonLabel, windowDays, resolvedCustomRange } = getInsightWindowMeta(
    preset,
    customRange,
    now
  );
  const weekdayFormatter = new Intl.DateTimeFormat("id-ID", { weekday: "long" });
  const currentEntries = getFilteredEntries(entries, preset, now, resolvedCustomRange);
  const previousEntries =
    windowDays === null
      ? []
      : preset === "custom" && resolvedCustomRange
        ? getFilteredEntries(entries, "custom", now, shiftCustomRange(resolvedCustomRange, -windowDays))
        : getFilteredEntries(entries, preset, offsetDate(now, -windowDays), resolvedCustomRange);

  const total = sumAmount(currentEntries);
  const previousTotal = sumAmount(previousEntries);
  const delta = total - previousTotal;
  const direction: InsightDirection = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const deltaPct = previousTotal > 0 ? Math.round((Math.abs(delta) / previousTotal) * 100) : null;

  const categoryTotals = new Map<Entry["category"], { amount: number; count: number }>();
  const paymentTotals = new Map<string, { amount: number; count: number }>();
  const weekdayTotals = new Map<string, { amount: number; count: number }>();
  const timeSlotTotals = new Map<string, { amount: number; count: number }>();

  for (const entry of currentEntries) {
    const reportAmount = getEntryReportAmount(entry);

    const categoryItem = categoryTotals.get(entry.category) ?? { amount: 0, count: 0 };
    categoryItem.amount += reportAmount;
    categoryItem.count += 1;
    categoryTotals.set(entry.category, categoryItem);

    const methodLabel = paymentMethodLabel(entry.paymentMethod);
    const paymentItem = paymentTotals.get(methodLabel) ?? { amount: 0, count: 0 };
    paymentItem.amount += reportAmount;
    paymentItem.count += 1;
    paymentTotals.set(methodLabel, paymentItem);

    const dayDate = new Date(`${entry.date}T00:00:00`);
    if (!Number.isNaN(dayDate.getTime())) {
      const dayLabelRaw = weekdayFormatter.format(dayDate);
      const dayLabel = dayLabelRaw.charAt(0).toUpperCase() + dayLabelRaw.slice(1);
      const weekdayItem = weekdayTotals.get(dayLabel) ?? { amount: 0, count: 0 };
      weekdayItem.amount += reportAmount;
      weekdayItem.count += 1;
      weekdayTotals.set(dayLabel, weekdayItem);
    }

    const activityTimestamp = getEntryActivityTimestamp(entry);
    if (activityTimestamp > 0) {
      const hour = new Date(activityTimestamp).getHours();
      const slotLabel = getInsightTimeSlotLabel(hour);
      const slotItem = timeSlotTotals.get(slotLabel) ?? { amount: 0, count: 0 };
      slotItem.amount += reportAmount;
      slotItem.count += 1;
      timeSlotTotals.set(slotLabel, slotItem);
    }
  }

  const totalSafe = Math.max(total, 1);
  const categoryBreakdown: InsightTopCategoryItem[] = [...categoryTotals.entries()]
    .sort((left, right) => right[1].amount - left[1].amount)
    .map(([category, value]) => ({
      category,
      amount: value.amount,
      count: value.count,
      percentage: Math.max(1, Math.round((value.amount / totalSafe) * 100))
    }));
  const paymentBreakdown: InsightTopDimensionItem[] = [...paymentTotals.entries()]
    .sort((left, right) => right[1].amount - left[1].amount)
    .map(([label, value]) => ({
      label,
      amount: value.amount,
      count: value.count,
      percentage: Math.max(1, Math.round((value.amount / totalSafe) * 100))
    }));
  const weekdayBreakdown: InsightTopDimensionItem[] = [...weekdayTotals.entries()]
    .sort((left, right) =>
      right[1].amount === left[1].amount ? right[1].count - left[1].count : right[1].amount - left[1].amount
    )
    .map(([label, value]) => ({
      label,
      amount: value.amount,
      count: value.count,
      percentage: Math.max(1, Math.round((value.amount / totalSafe) * 100))
    }));
  const timeSlotBreakdown: InsightTopDimensionItem[] = [...timeSlotTotals.entries()]
    .sort((left, right) =>
      right[1].amount === left[1].amount ? right[1].count - left[1].count : right[1].amount - left[1].amount
    )
    .map(([label, value]) => ({
      label,
      amount: value.amount,
      count: value.count,
      percentage: Math.max(1, Math.round((value.amount / totalSafe) * 100))
    }));

  const topPayment = paymentBreakdown.find((item) => item.label !== "Belum pilih") ?? paymentBreakdown[0] ?? null;

  const largestEntries: InsightLargestEntryItem[] = [...currentEntries]
    .sort((left, right) => {
      const diff = getEntryReportAmount(right) - getEntryReportAmount(left);
      if (diff !== 0) {
        return diff;
      }
      return getEntryActivityTimestamp(right) - getEntryActivityTimestamp(left);
    })
    .slice(0, 3)
    .map((entry) => {
      const display = splitDisplayText(entry.text);
      return {
        id: entry.id,
        title: display.title || entry.category,
        amount: getEntryReportAmount(entry),
        category: entry.category,
        paymentMethod: paymentMethodLabel(entry.paymentMethod),
        dateLabel: formatDayLabel(entry.date, now)
      };
    });

  const activeDays = new Set(currentEntries.map((entry) => entry.date)).size;
  const averageDivisor = windowDays ?? Math.max(1, activeDays);

  return {
    periodLabel,
    comparisonLabel,
    windowDays,
    total,
    previousTotal,
    delta,
    direction,
    deltaPct,
    averagePerDay: Math.round(total / Math.max(1, averageDivisor)),
    entryCount: currentEntries.length,
    activeDays,
    topCategories: categoryBreakdown.slice(0, 4),
    topCategory: categoryBreakdown[0] ?? null,
    topPayment,
    topWeekday: weekdayBreakdown[0] ?? null,
    topTimeSlot: timeSlotBreakdown[0] ?? null,
    largestEntries,
    hasData: currentEntries.length > 0
  };
}

export function deriveInsightSevenDay(entries: Entry[], now: Date = new Date()): InsightSevenDaySummary {
  return deriveInsightSummary(entries, "7d", now);
}

export function deriveInsightWhyCards(insight: InsightSevenDaySummary): InsightWhyCardItem[] {
  const rows: InsightWhyCardItem[] = [];

  if (insight.topCategory) {
    rows.push({
      key: "category",
      label: "Kategori terbesar",
      value: `${insight.topCategory.category} (${insight.topCategory.percentage}%)`,
      detail: `Rp${formatAmountIDR(insight.topCategory.amount)} dari ${insight.topCategory.count} catatan`
    });
  }

  if (insight.topPayment) {
    rows.push({
      key: "payment",
      label: "Metode bayar dominan",
      value: `${insight.topPayment.label} (${insight.topPayment.percentage}%)`,
      detail: `Rp${formatAmountIDR(insight.topPayment.amount)}`
    });
  }

  if (insight.topTimeSlot) {
    rows.push({
      key: "time",
      label: "Waktu paling aktif",
      value: `${insight.topTimeSlot.label} (${insight.topTimeSlot.percentage}%)`,
      detail: `${insight.topTimeSlot.count} catatan`
    });
  }

  if (insight.topWeekday) {
    rows.push({
      key: "weekday",
      label: "Hari paling boros",
      value: `${insight.topWeekday.label} (${insight.topWeekday.percentage}%)`,
      detail: `Rp${formatAmountIDR(insight.topWeekday.amount)}`
    });
  }

  return rows.slice(0, 3);
}

export function deriveInsightCoachCopy(insight: InsightSevenDaySummary): InsightCoachCopy {
  const periodLabelLower = insight.periodLabel.toLowerCase();

  if (!insight.hasData) {
    const title =
      insight.periodLabel === "Hari ini"
        ? "Belum ada catatan hari ini"
        : `Belum ada catatan ${periodLabelLower}`;

    return {
      title,
      subtitle: "Mulai catat lagi supaya insight bisa kasih pola yang lebih akurat.",
      primaryLabel: "Mulai catat",
      secondaryLabel: "Lihat catatan"
    };
  }

  if (insight.direction === "up" && insight.topCategory) {
    const compareLabel = insight.comparisonLabel ?? "periode sebelumnya";
    return {
      title: `Pengeluaran naik dibanding ${compareLabel}`,
      subtitle: `${insight.topCategory.category} jadi pendorong utama. Coba pantau nominal per transaksi biar lebih terkontrol.`,
      primaryLabel: "Catat sekarang",
      secondaryLabel: "Lihat detail catatan"
    };
  }

  if (insight.direction === "down") {
    return {
      title: "Pengeluaranmu lagi lebih ringan",
      subtitle: "Pola ini bagus. Tetap catat rutin biar kamu tau kebiasaan hematmu datang dari mana.",
      primaryLabel: "Catat lagi",
      secondaryLabel: "Lihat detail catatan"
    };
  }

  return {
    title: "Pola pengeluaranmu mulai kebaca",
    subtitle: "Teruskan catat singkat tiap transaksi supaya saran makin personal.",
    primaryLabel: "Catat cepat",
    secondaryLabel: "Lihat detail catatan"
  };
}

export function deriveInsightTrendBadge(insight: InsightSevenDaySummary): InsightTrendBadge {
  if (!insight.hasData) {
    return {
      label: "Belum ada data",
      tone: "neutral"
    };
  }

  if (!insight.comparisonLabel) {
    return {
      label: "Rentang data penuh",
      tone: "neutral"
    };
  }

  if (insight.previousTotal <= 0 || insight.deltaPct === null) {
    return {
      label: "Belum ada pembanding",
      tone: "neutral"
    };
  }

  if (insight.direction === "up") {
    return {
      label: `+${insight.deltaPct}% vs ${insight.comparisonLabel}`,
      tone: "up"
    };
  }

  if (insight.direction === "down") {
    return {
      label: `-${insight.deltaPct}% vs ${insight.comparisonLabel}`,
      tone: "down"
    };
  }

  return {
    label: `Stabil vs ${insight.comparisonLabel}`,
    tone: "neutral"
  };
}
