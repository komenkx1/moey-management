import { formatAmountIDR } from "@kemana/core/format";
import type { Entry } from "@kemana/core/types";
import { splitDisplayText } from "@/lib/kemana-utils";
import { getEntryActivityTimestamp } from "./notes";

export interface AdaptiveRecallItem {
  id: string;
  category: Entry["category"];
  title: string;
  amount: number;
}

export interface LatestEntryInsight {
  title: string;
  amount: number;
}

export function deriveQuickHistorySuggestions(entries: Entry[], quickInput: string): string[] {
  const query = quickInput.trim().toLowerCase();
  if (query.length < 2 || /\d/.test(query)) {
    return [];
  }

  const buckets = new Map<string, { title: string; count: number; lastAt: number }>();

  for (const entry of entries) {
    const title = splitDisplayText(entry.text).title.trim();
    if (!title) {
      continue;
    }

    const titleKey = title.toLowerCase();
    if (!titleKey.includes(query)) {
      continue;
    }

    const createdAt = Date.parse(entry.createdAt);
    const updatedAt = Date.parse(entry.updatedAt);
    const recency = Number.isFinite(createdAt)
      ? createdAt
      : Number.isFinite(updatedAt)
        ? updatedAt
        : Date.parse(`${entry.date}T12:00:00`);

    const current = buckets.get(titleKey);
    if (!current) {
      buckets.set(titleKey, {
        title,
        count: 1,
        lastAt: Number.isFinite(recency) ? recency : 0
      });
      continue;
    }

    current.count += 1;
    current.lastAt = Math.max(current.lastAt, Number.isFinite(recency) ? recency : 0);
  }

  return [...buckets.values()]
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return right.lastAt - left.lastAt;
    })
    .slice(0, 4)
    .map((item) => item.title);
}

export function deriveAdaptiveRecallItems(entries: Entry[], nowMs: number = Date.now()): AdaptiveRecallItem[] {
  if (!entries.length) {
    return [];
  }

  const buckets = new Map<
    string,
    {
      key: string;
      category: Entry["category"];
      title: string;
      amountTotal: number;
      count: number;
      score: number;
    }
  >();

  for (const entry of entries) {
    const display = splitDisplayText(entry.text);
    const title = display.title || entry.category;
    const key = `${entry.category}:${title.toLowerCase()}`;
    const createdAt = Number.isFinite(Date.parse(entry.createdAt))
      ? Date.parse(entry.createdAt)
      : Date.parse(`${entry.date}T12:00:00`);
    const ageDays = Number.isFinite(createdAt) ? Math.max(0, (nowMs - createdAt) / 86_400_000) : 99;
    const recencyBoost = Math.max(0, 20 - ageDays) * 0.08;
    const scoreBoost = 1 + recencyBoost;

    const current = buckets.get(key);
    if (!current) {
      buckets.set(key, {
        key,
        category: entry.category,
        title,
        amountTotal: entry.amount,
        count: 1,
        score: scoreBoost
      });
      continue;
    }

    current.amountTotal += entry.amount;
    current.count += 1;
    current.score += scoreBoost;
  }

  return [...buckets.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map((bucket) => ({
      id: `recall-${bucket.key}`,
      category: bucket.category,
      title: bucket.title,
      amount: Math.max(1, Math.round(bucket.amountTotal / bucket.count))
    }));
}

export function deriveAdaptiveHint(item: Pick<AdaptiveRecallItem, "title" | "amount"> | null): string {
  if (!item) {
    return "Belum ada pola. Catat beberapa pengeluaran untuk mulai saran pintar.";
  }

  return `${item.title} sekitar Rp${formatAmountIDR(item.amount)}.`;
}

export function deriveLatestEntryInsight(entries: Entry[]): LatestEntryInsight | null {
  if (!entries.length) {
    return null;
  }

  let latest: Entry | null = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    const timestamp = getEntryActivityTimestamp(entry);
    if (!latest || timestamp > latestTimestamp) {
      latest = entry;
      latestTimestamp = timestamp;
    }
  }

  if (!latest) {
    return null;
  }

  const display = splitDisplayText(latest.text);
  return {
    title: display.title,
    amount: latest.amount
  };
}

export function getQuickInputPlaceholder(params: {
  hasSmartRecallPrompt: boolean;
  recallInputPrimed: boolean;
  now?: Date;
}): string {
  void params;
  return "misal : nasgor 24k kemarin";
}
