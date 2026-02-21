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
      title: "Belum ada catatan hari ini",
      subtitle: "Barusan bayar apa?"
    };
  }

  if (lastEntryTimestamp !== null && now - lastEntryTimestamp >= THREE_HOURS_MS) {
    return {
      kind: "gap",
      title: `Terakhir kamu catat jam ${formatHourMinute(lastEntryTimestamp)}`,
      subtitle: "Ada pengeluaran setelah itu?"
    };
  }
  if (lastAppOpenAt !== null && now - lastAppOpenAt >= SIX_HOURS_MS) {
    return {
      kind: "comeback",
      title: "Kamu sempat keluar tadi?"
    };
  }

  return null;
}
