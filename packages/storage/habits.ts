import type { Entry } from "../core/types";
import { getLocalDayKey } from "./day-key";

const RECOVERY_COUNT_KEY = "kemana.recoveryCount";
const LAST_RECOVERY_AT_KEY = "kemana.lastRecoveryAt";
const LAST_ENTRY_AT_KEY = "kemana.lastEntryAt";
const NIGHT_CLOSE_CLOSED_AT_KEY = "kemana.nightCloseClosedAt";
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface RecoveryStats {
  recoveryCount: number;
  lastRecoveryAt: number | null;
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseStoredNumber(raw: string | null): number | null {
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

function writeLastEntryAt(value: number | null): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(LAST_ENTRY_AT_KEY);
      return;
    }

    window.localStorage.setItem(LAST_ENTRY_AT_KEY, String(value));
  } catch {
    // Ignore write failures.
  }
}

export function syncLastEntryAt(entries: Entry[]): number | null {
  const latest = getLastEntryTimestamp(entries);
  writeLastEntryAt(latest);
  return latest;
}

export function readLastEntryAt(): number | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    return parseStoredNumber(window.localStorage.getItem(LAST_ENTRY_AT_KEY));
  } catch {
    return null;
  }
}

export function readRecoveryStats(): RecoveryStats {
  if (!canUseLocalStorage()) {
    return {
      recoveryCount: 0,
      lastRecoveryAt: null
    };
  }

  try {
    const storedCount = parseStoredNumber(window.localStorage.getItem(RECOVERY_COUNT_KEY)) ?? 0;
    const storedLastRecoveryAt = parseStoredNumber(window.localStorage.getItem(LAST_RECOVERY_AT_KEY));
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

export function incrementRecoveryCount(now: number = Date.now()): RecoveryStats {
  const current = readRecoveryStats();
  const nextCount = current.recoveryCount + 1;

  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(RECOVERY_COUNT_KEY, String(nextCount));
      window.localStorage.setItem(LAST_RECOVERY_AT_KEY, String(now));
    } catch {
      // Ignore write failures.
    }
  }

  return {
    recoveryCount: nextCount,
    lastRecoveryAt: now
  };
}

export function readNightCloseMarker(): string | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const marker = window.localStorage.getItem(NIGHT_CLOSE_CLOSED_AT_KEY);
    if (!marker || !DAY_KEY_PATTERN.test(marker)) {
      return null;
    }
    return marker;
  } catch {
    return null;
  }
}

export function writeNightCloseMarker(dayKey: string = getLocalDayKey()): string {
  const normalizedDayKey = DAY_KEY_PATTERN.test(dayKey) ? dayKey : getLocalDayKey();

  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(NIGHT_CLOSE_CLOSED_AT_KEY, normalizedDayKey);
    } catch {
      // Ignore write failures.
    }
  }

  return normalizedDayKey;
}
