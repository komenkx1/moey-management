import type { Entry } from "@kemana/core/types";

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
