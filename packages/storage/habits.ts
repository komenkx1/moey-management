import type { Entry } from "../core/types";
import { getLocalDayKey } from "./day-key";
import { db } from "./db";

const RECOVERY_COUNT_KEY = "kemana.recoveryCount";
const LAST_RECOVERY_AT_KEY = "kemana.lastRecoveryAt";
const LAST_ENTRY_AT_KEY = "kemana.lastEntryAt";
const NIGHT_CLOSE_CLOSED_AT_KEY = "kemana.nightCloseClosedAt";
const DAY_KEY_PATTERN = /^\\d{4}-\\d{2}-\\d{2}$/;

export interface RecoveryStats {
  recoveryCount: number;
  lastRecoveryAt: number | null;
}

function parseStoredNumber(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getLastEntryTimestamp(entries: Entry[]): number | null {
  let latest: number | null = null;

  for (const entry of entries) {
    const createdAt = Date.parse(entry.createdAt);
    const timestamp = Number.isFinite(createdAt) ? createdAt : null;

    if (timestamp === null) {
      continue;
    }

    if (latest === null || timestamp > latest) {
      latest = timestamp;
    }
  }

  return latest;
}

async function writeLastEntryAt(value: number | null): Promise<void> {
  try {
    if (value === null) {
      await db.meta.delete(LAST_ENTRY_AT_KEY);
      return;
    }

    await db.meta.put({ key: LAST_ENTRY_AT_KEY, value: String(value) });
  } catch {
    // Ignore write failures.
  }
}

export async function syncLastEntryAt(entries: Entry[]): Promise<number | null> {
  const latest = getLastEntryTimestamp(entries);
  await writeLastEntryAt(latest);
  return latest;
}

export async function readLastEntryAt(): Promise<number | null> {
  try {
    const row = await db.meta.get(LAST_ENTRY_AT_KEY);
    return parseStoredNumber(row?.value);
  } catch {
    return null;
  }
}

export async function readRecoveryStats(): Promise<RecoveryStats> {
  try {
    const countRow = await db.meta.get(RECOVERY_COUNT_KEY);
    const lastAtRow = await db.meta.get(LAST_RECOVERY_AT_KEY);

    const storedCount = parseStoredNumber(countRow?.value) ?? 0;
    const storedLastRecoveryAt = parseStoredNumber(lastAtRow?.value);

    return {
      recoveryCount: Math.max(0, storedCount),
      lastRecoveryAt: storedLastRecoveryAt
    };
  } catch {
    return {
      recoveryCount: 0,
      lastRecoveryAt: null
    };
  }
}

export async function incrementRecoveryCount(now: number = Date.now()): Promise<RecoveryStats> {
  const current = await readRecoveryStats();
  const nextCount = current.recoveryCount + 1;

  try {
    await db.meta.bulkPut([
      { key: RECOVERY_COUNT_KEY, value: String(nextCount) },
      { key: LAST_RECOVERY_AT_KEY, value: String(now) }
    ]);
  } catch {
    // Ignore write failures.
  }

  return {
    recoveryCount: nextCount,
    lastRecoveryAt: now
  };
}

export async function readNightCloseMarker(): Promise<string | null> {
  try {
    const row = await db.meta.get(NIGHT_CLOSE_CLOSED_AT_KEY);
    const marker = row?.value;
    if (!marker || !DAY_KEY_PATTERN.test(marker)) {
      return null;
    }
    return marker;
  } catch {
    return null;
  }
}

export async function writeNightCloseMarker(dayKey: string = getLocalDayKey()): Promise<string> {
  const normalizedDayKey = DAY_KEY_PATTERN.test(dayKey) ? dayKey : getLocalDayKey();

  try {
    await db.meta.put({ key: NIGHT_CLOSE_CLOSED_AT_KEY, value: normalizedDayKey });
  } catch {
    // Ignore write failures.
  }

  return normalizedDayKey;
}
