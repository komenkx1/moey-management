import type { Entry } from "@kemana/core/types";
import type { CustomDateRange, DateFilterPreset } from "./base";
import {
  getCustomRangeDayCount,
  getEntryReportAmount,
  getFilteredEntries,
  normalizeCustomDateRange,
  offsetDate,
  parseDateKey,
  sumAmount,
  toDateKey
} from "./base";
export type TrendGranularity = "hour" | "day" | "week" | "month";

export function getTrendGranularity(
  preset: DateFilterPreset,
  customRange?: CustomDateRange | null,
  now = new Date()
): TrendGranularity {
  if (preset === "today") return "hour";
  if (preset === "7d") return "day";
  if (preset === "30d") return "week";
  if (preset === "all") return "month";

  const rangeDays = getCustomRangeDayCount(normalizeCustomDateRange(customRange, now));
  if (rangeDays <= 2) return "hour";
  if (rangeDays <= 14) return "day";
  if (rangeDays <= 45) return "week";
  return "month";
}

export function getTrendTitle(
  preset: DateFilterPreset,
  granularity: TrendGranularity,
  customRange?: CustomDateRange | null,
  now = new Date()
): string {
  if (preset === "today") return "Ritme pengeluaran hari ini";
  if (preset === "7d") return "Ritme 7 hari terakhir";
  if (preset === "30d") return "Ritme 30 hari terakhir";
  if (preset === "all") return "Ritme semua periode";

  const rangeDays = getCustomRangeDayCount(normalizeCustomDateRange(customRange, now));
  if (granularity === "hour" || granularity === "day") {
    return `Ritme ${rangeDays} hari`;
  }
  if (granularity === "week") {
    return "Ritme per pekan";
  }
  return "Ritme pengeluaran";
}

export function getTrendSubtitle(granularity: TrendGranularity): string {
  switch (granularity) {
    case "hour":
      return "Biar kelihatan jam paling sering keluar uang.";
    case "day":
      return "Lihat pola hari ke hari.";
    case "week":
      return "Lihat naik-turun dari pekan ke pekan.";
    case "month":
      return "Lihat arah pengeluaran tiap bulan.";
  }
}

export interface TrendBucket {
  label: string;
  total: number;
}

export function generateTrendSeries(
  entries: Entry[],
  preset: DateFilterPreset,
  customRange?: CustomDateRange | null,
  now = new Date()
): TrendBucket[] {
  const scopedEntries = getFilteredEntries(entries, preset, now, customRange);
  const granularity = getTrendGranularity(preset, customRange, now);
  const buckets: TrendBucket[] = [];

  let startDate: Date;
  let endDate: Date;

  if (preset === "today") {
    startDate = now;
    endDate = now;
  } else if (preset === "7d") {
    startDate = offsetDate(now, -6);
    endDate = now;
  } else if (preset === "30d") {
    startDate = offsetDate(now, -29);
    endDate = now;
  } else if (preset === "custom") {
    const range = normalizeCustomDateRange(customRange, now);
    startDate = parseDateKey(range.start) || now;
    endDate = parseDateKey(range.end) || now;
  } else {
    if (scopedEntries.length === 0) {
      startDate = now;
      endDate = now;
    } else {
      const sortedKeys = [...new Set(scopedEntries.map((e) => e.date))].sort();
      startDate = parseDateKey(sortedKeys[0]) || now;
      endDate = parseDateKey(sortedKeys[sortedKeys.length - 1]) || now;
    }
  }

  if (granularity === "hour") {
    const periodLabels = ["Pagi", "Siang", "Sore", "Malam"];
    const bucketTotals = [0, 0, 0, 0];

    for (const entry of scopedEntries) {
      const createdTs = Date.parse(entry.createdAt);
      const updatedTs = Date.parse(entry.updatedAt);
      const dateObj = Number.isFinite(createdTs)
        ? new Date(createdTs)
        : Number.isFinite(updatedTs)
          ? new Date(updatedTs)
          : new Date(`${entry.date}T12:00:00`);
      let hour = dateObj.getHours();
      if (isNaN(hour)) hour = 12;

      // Klasifikasi pakai jam lokal device.
      // 00:00-04:59 => Malam, 05:00-10:59 => Pagi, 11:00-14:59 => Siang, 15:00-18:59 => Sore, 19:00-23:59 => Malam
      let index = 3; // Malam
      if (hour >= 5 && hour < 11) index = 0; // Pagi
      else if (hour >= 11 && hour < 15) index = 1; // Siang
      else if (hour >= 15 && hour < 19) index = 2; // Sore

      bucketTotals[index] += getEntryReportAmount(entry);
    }

    for (let i = 0; i < 4; i++) {
      buckets.push({ label: periodLabels[i], total: bucketTotals[i] });
    }
  } else if (granularity === "day") {
    const numDays = Math.min(
      14,
      getCustomRangeDayCount({ start: toDateKey(startDate), end: toDateKey(endDate) })
    );
    for (let i = numDays - 1; i >= 0; i--) {
      const d = offsetDate(endDate, -i);
      const dKey = toDateKey(d);

      const bucketEntries = scopedEntries.filter((e) => e.date === dKey);

      let label = "";
      if (dKey === toDateKey(now)) {
        label = "Hari ini";
      } else {
        label = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);
      }

      buckets.push({ label, total: sumAmount(bucketEntries) });
    }
  } else if (granularity === "week") {
    const rangeDays = getCustomRangeDayCount({ start: toDateKey(startDate), end: toDateKey(endDate) });
    const numWeeks = Math.max(1, Math.ceil(rangeDays / 7));
    const maxWeeks = Math.min(10, numWeeks);

    for (let i = maxWeeks - 1; i >= 0; i--) {
      const endOffset = -i * 7;
      const startOffset = endOffset - 6;
      const dStart = offsetDate(endDate, startOffset);
      const dEnd = offsetDate(endDate, endOffset);

      const startKey = toDateKey(dStart);
      const endKey = toDateKey(dEnd);

      const bucketEntries = scopedEntries.filter((e) => e.date >= startKey && e.date <= endKey);

      let label = "";
      if (i === 0) {
        label = "Pekan ini";
      } else if (i === 1) {
        label = "Pekan lalu";
      } else {
        label = `${i + 1} pekan lalu`;
      }

      buckets.push({ label, total: sumAmount(bucketEntries) });
    }
  } else if (granularity === "month") {
    const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
    const endMonth = endDate.getFullYear() * 12 + endDate.getMonth();
    const numMonths = Math.max(1, endMonth - startMonth + 1);
    const maxMonths = Math.min(12, numMonths);

    for (let i = maxMonths - 1; i >= 0; i--) {
      const targetMonthIndex = endMonth - i;
      const targetYear = Math.floor(targetMonthIndex / 12);
      const targetMonth = targetMonthIndex % 12;

      const bucketEntries = scopedEntries.filter((e) => {
        const d = parseDateKey(e.date);
        return d && d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });

      const label = new Intl.DateTimeFormat("id-ID", { month: "short" }).format(
        new Date(targetYear, targetMonth, 1)
      );

      buckets.push({ label, total: sumAmount(bucketEntries) });
    }
  }

  return buckets;
}
