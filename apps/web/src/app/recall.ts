import type { Entry } from "@kemana/core/types";
import { getLocalDayKey } from "@kemana/storage";

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export type SmartRecallKind = "gap" | "first_today" | "comeback";

export interface SmartRecallPrompt {
  kind: SmartRecallKind;
  title: string;
  subtitle?: string;
}

function formatHourMinute(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(timestamp));
}
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffMs = now - timestamp;

  // Less than 1 hour: show minutes
  if (diffMs < 60 * 60 * 1000) {
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes} menit lalu`;
  }

  // Less than 24 hours: show hours
  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diffMs / 3600000);
    return `${hours} jam lalu`;
  }

  // Less than 48 hours: show "kemarin"
  if (diffMs < 48 * 60 * 60 * 1000) {
    return "kemarin";
  }

  // 48 hours or more: show days
  const days = Math.floor(diffMs / 86400000);
  return `${days} hari lalu`;
}

export function getLastEntryTimestamp(entries: Entry[]): number | null {
  let latest: number | null = null;

  for (const entry of entries) {
    const timestamp = Date.parse(entry.createdAt);
    if (!Number.isFinite(timestamp)) {
      continue;
    }

    if (latest === null || timestamp > latest) {
      latest = timestamp;
    }
  }

  return latest;
}

export function getSmartRecallPrompt(params: {
  entries: Entry[];
  lastAppOpenAt: number | null;
  now?: number;
}): SmartRecallPrompt | null {
  const { entries, lastAppOpenAt, now = Date.now() } = params;
  const nowDate = new Date(now);
  const lastEntryTimestamp = getLastEntryTimestamp(entries);

  if (entries.length === 0) {
    return null;
  }

  const todayKey = getLocalDayKey(nowDate);
  const hasTodayEntry = entries.some((entry) => entry.date === todayKey);

  if (!hasTodayEntry && nowDate.getHours() >= 12) {
    return {
      kind: "first_today",
      title: "Belum ada catatan hari ini - Ada transaksi yang belum dicatat?",
      subtitle: "Barusan bayar apa?"
    };
  }

  if (lastEntryTimestamp !== null && now - lastEntryTimestamp >= THREE_HOURS_MS) {
    return {
      kind: "gap",
      title: `Terakhir mencatat ${formatRelativeTime(lastEntryTimestamp, now)} - Ingat ada pengeluaran setelah itu?`,
      subtitle: undefined
    };
  }
  if (lastAppOpenAt !== null && now - lastAppOpenAt >= SIX_HOURS_MS) {
    return {
      kind: "comeback",
      title: "Kamu sempat keluar tadi? - Ada pengeluaran yang belum dicatat?",
      subtitle: undefined
    };
  }

  return null;
}
