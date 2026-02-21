import {
  CATEGORIES,
  CategoryRules,
  Entry,
  PAYMENT_METHODS
} from "../core/types";
import { syncLastEntryAt } from "./habits";
import { db } from "./db";
import { migrateFromLocalStorage } from "./migrate-localstorage";

const CURRENT_STORAGE_VERSION = "1";

type ImportMode = "merge" | "replace";

export interface StorageHealth {
  version: string;
  entriesCorrupted: boolean;
  rulesCorrupted: boolean;
  hasCorruption: boolean;
}

export interface BackupPayload {
  entries: Entry[];
  rules: CategoryRules;
  meta: {
    exportedAt: string;
    appVersion?: string;
    storageVersion: string;
  };
}

export interface ImportBackupResult {
  ok: boolean;
  message: string;
  entries: Entry[];
  rules: CategoryRules;
  importedEntries: number;
  ignoredEntries: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeEntry(raw: unknown): Entry | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = raw.id;
  const text = raw.text;
  const amount = raw.amount;
  const date = raw.date;
  const category = raw.category;
  const createdAt = raw.createdAt;
  const updatedAt = raw.updatedAt;

  if (
    typeof id !== "string" ||
    typeof text !== "string" ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    typeof date !== "string" ||
    typeof category !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  const normalizedCategory = CATEGORIES.includes(category as (typeof CATEGORIES)[number])
    ? (category as Entry["category"])
    : "Lainnya";

  const sourceValue = raw.source;
  const source: Entry["source"] =
    sourceValue === "quick_add" || sourceValue === "bulk_paste" || sourceValue === "scan_receipt"
      ? sourceValue
      : "quick_add";

  const paymentMethodValue = raw.paymentMethod;
  const paymentMethod =
    typeof paymentMethodValue === "string" &&
      PAYMENT_METHODS.includes(paymentMethodValue as (typeof PAYMENT_METHODS)[number])
      ? (paymentMethodValue as Entry["paymentMethod"])
      : undefined;

  return {
    id,
    text,
    amount,
    date,
    category: normalizedCategory,
    source,
    paymentMethod,
    parseWarnings: Array.isArray(raw.parseWarnings) ? (raw.parseWarnings as Entry["parseWarnings"]) : undefined,
    split: isRecord(raw.split) ? (raw.split as unknown as Entry["split"]) : undefined,
    createdAt,
    updatedAt
  };
}

function normalizeRule(raw: unknown): CategoryRules[number] | null {
  if (!isRecord(raw)) {
    return null;
  }

  const pattern = raw.pattern;
  const match = raw.match;
  const category = raw.category;
  if (
    typeof pattern !== "string" ||
    (match !== "contains" && match !== "equals") ||
    typeof category !== "string" ||
    !CATEGORIES.includes(category as (typeof CATEGORIES)[number])
  ) {
    return null;
  }

  return {
    pattern: pattern.trim().toLowerCase(),
    match,
    category: category as CategoryRules[number]["category"]
  };
}

function sortEntriesNewestFirst(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const aTime = Number.isFinite(Date.parse(a.createdAt))
      ? Date.parse(a.createdAt)
      : Number.isFinite(Date.parse(a.updatedAt))
        ? Date.parse(a.updatedAt)
        : Number.NEGATIVE_INFINITY;
    const bTime = Number.isFinite(Date.parse(b.createdAt))
      ? Date.parse(b.createdAt)
      : Number.isFinite(Date.parse(b.updatedAt))
        ? Date.parse(b.updatedAt)
        : Number.NEGATIVE_INFINITY;
    return bTime - aTime;
  });
}

export async function loadEntries(): Promise<Entry[]> {
  try {
    const rows = await db.entries.toArray();
    return sortEntriesNewestFirst(rows);
  } catch {
    return [];
  }
}

export async function saveEntries(entries: Entry[]): Promise<void> {
  try {
    await db.transaction("rw", db.entries, async () => {
      await db.entries.clear();
      await db.entries.bulkPut(entries);
    });
    // Fire and forget since we only use it for habit triggers
    syncLastEntryAt(entries).catch(() => { });
  } catch {
    // Ignore write failures to avoid crashing UI.
  }
}

export async function loadRules(): Promise<CategoryRules> {
  try {
    const rows = await db.rules.toArray();
    return rows;
  } catch {
    return [];
  }
}

export async function saveRules(rules: CategoryRules): Promise<void> {
  try {
    await db.transaction("rw", db.rules, async () => {
      await db.rules.clear();
      await db.rules.bulkPut(rules);
    });
  } catch {
    // Ignore write failures to avoid crashing UI.
  }
}

export function getStorageHealth(): StorageHealth {
  // IndexedDB structural bounds inherently prevent the raw JSON corruption issues of localStorage.
  // Health checks here are vastly simplified and mostly assume clean if reachable.
  return {
    version: CURRENT_STORAGE_VERSION,
    entriesCorrupted: false,
    rulesCorrupted: false,
    hasCorruption: false
  };
}

export function clearStorageHealthWarnings(): void {
  // No-op for Dexie. Retained for API backwards compatibility
}

export function createBackupPayload(
  entries: Entry[],
  rules: CategoryRules,
  appVersion?: string
): BackupPayload {
  return {
    entries,
    rules,
    meta: {
      exportedAt: new Date().toISOString(),
      appVersion,
      storageVersion: CURRENT_STORAGE_VERSION
    }
  };
}

export function downloadBackupFile(payload: BackupPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  const date = payload.meta.exportedAt.slice(0, 10);
  const filename = `kemana-backup-${date}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

function mergeEntriesById(currentEntries: Entry[], incomingEntries: Entry[]): Entry[] {
  const map = new Map<string, Entry>();
  for (const entry of currentEntries) {
    map.set(entry.id, entry);
  }
  for (const entry of incomingEntries) {
    map.set(entry.id, entry);
  }
  return sortEntriesNewestFirst(Array.from(map.values()));
}

function mergeRules(currentRules: CategoryRules, incomingRules: CategoryRules): CategoryRules {
  const merged = [...currentRules];
  for (const incoming of incomingRules) {
    const existingIndex = merged.findIndex(
      (rule) => rule.pattern === incoming.pattern && rule.match === incoming.match
    );
    if (existingIndex >= 0) {
      merged[existingIndex] = incoming;
    } else {
      merged.push(incoming);
    }
  }
  return merged;
}

export function importBackupFromText(params: {
  raw: string;
  currentEntries: Entry[];
  currentRules: CategoryRules;
  mode?: ImportMode;
}): ImportBackupResult {
  const { raw, currentEntries, currentRules, mode = "merge" } = params;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      message: "File backup tidak valid.",
      entries: currentEntries,
      rules: currentRules,
      importedEntries: 0,
      ignoredEntries: 0
    };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.entries) || !Array.isArray(parsed.rules)) {
    return {
      ok: false,
      message: "Format backup tidak sesuai.",
      entries: currentEntries,
      rules: currentRules,
      importedEntries: 0,
      ignoredEntries: 0
    };
  }

  const normalizedEntries: Entry[] = [];
  let ignoredEntries = 0;
  for (const item of parsed.entries) {
    const normalized = normalizeEntry(item);
    if (!normalized) {
      ignoredEntries += 1;
      continue;
    }
    normalizedEntries.push(normalized);
  }

  const normalizedRules: CategoryRules = [];
  for (const item of parsed.rules) {
    const normalized = normalizeRule(item);
    if (!normalized) {
      continue;
    }
    normalizedRules.push(normalized);
  }

  const entries =
    mode === "replace"
      ? sortEntriesNewestFirst(normalizedEntries)
      : mergeEntriesById(currentEntries, normalizedEntries);
  const rules = mode === "replace" ? normalizedRules : mergeRules(currentRules, normalizedRules);
  const message =
    mode === "replace"
      ? `Import selesai. ${normalizedEntries.length} transaksi dimuat.`
      : `Import selesai. ${normalizedEntries.length} transaksi diproses, ${ignoredEntries} diabaikan.`;

  return {
    ok: true,
    message,
    entries,
    rules,
    importedEntries: normalizedEntries.length,
    ignoredEntries
  };
}

export { getLocalDayKey } from "./day-key";
export {
  incrementRecoveryCount,
  readLastEntryAt,
  readNightCloseMarker,
  readRecoveryStats,
  writeNightCloseMarker
} from "./habits";
export { migrateFromLocalStorage } from "./migrate-localstorage";
