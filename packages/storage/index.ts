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
const MAX_IMPORT_ENTRIES = 10_000;
const MAX_IMPORTED_TEXT_LENGTH = 500;
const MAX_IMPORTED_RAW_INPUT_LENGTH = 1_000;
const MAX_IMPORTED_AMOUNT = 1_000_000_000_000;
const MAX_IMPORTED_SPLIT_SHARES = 12;
const MAX_IMPORTED_SHARE_NAME_LENGTH = 60;
const IMPORTED_ENTRY_ID_PATTERN = /^[A-Za-z0-9:_-]{1,80}$/;

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

function sanitizeImportedString(value: string, maxLength: number): string {
  const cleaned = value.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function normalizeImportedEntryId(value: string): string | null {
  const trimmed = value.trim();
  if (!IMPORTED_ENTRY_ID_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function normalizeImportedSplit(raw: unknown): Entry["split"] | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const mode = raw.mode;
  const payer = typeof raw.payer === "string" ? sanitizeImportedString(raw.payer, MAX_IMPORTED_SHARE_NAME_LENGTH) : "Kamu";
  const rawShares = raw.shares;

  if ((mode !== "equal" && mode !== "custom") || !Array.isArray(rawShares)) {
    return undefined;
  }

  const shares = rawShares
    .filter((share): share is Record<string, unknown> => isRecord(share))
    .map((share) => {
      const person = typeof share.person === "string"
        ? sanitizeImportedString(share.person, MAX_IMPORTED_SHARE_NAME_LENGTH)
        : "";
      const amount = typeof share.amount === "number" ? share.amount : Number.NaN;
      if (!person || !Number.isFinite(amount) || amount <= 0 || amount > MAX_IMPORTED_AMOUNT) {
        return null;
      }
      return { person, amount: Math.round(amount) };
    })
    .filter((share): share is NonNullable<typeof share> => Boolean(share));

  if (shares.length < 2 || shares.length > MAX_IMPORTED_SPLIT_SHARES) {
    return undefined;
  }

  return {
    mode,
    payer: payer || "Kamu",
    shares
  };
}

export function normalizeEntry(raw: unknown): Entry | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = raw.id;
  const text = raw.text;
  const amount = raw.amount;
  const rawInput = raw.rawInput;
  const date = raw.date;
  const category = raw.category;
  const createdAt = raw.createdAt;
  const updatedAt = raw.updatedAt;

  if (
    typeof id !== "string" ||
    typeof text !== "string" ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > MAX_IMPORTED_AMOUNT ||
    typeof date !== "string" ||
    typeof category !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  if (!isValidDateKey(date) || !Number.isFinite(Date.parse(createdAt)) || !Number.isFinite(Date.parse(updatedAt))) {
    return null;
  }

  const normalizedId = normalizeImportedEntryId(id);
  if (!normalizedId) {
    return null;
  }

  const normalizedCategory = CATEGORIES.includes(category as (typeof CATEGORIES)[number])
    ? (category as Entry["category"])
    : "Lainnya";
  const normalizedText = sanitizeImportedString(text, MAX_IMPORTED_TEXT_LENGTH);
  if (!normalizedText) {
    return null;
  }

  const sourceValue = raw.source;
  const source: Entry["source"] =
    sourceValue === "quick_add" || sourceValue === "bulk_paste" || sourceValue === "scan_receipt"
      ? sourceValue
      : "quick_add";

  const paymentMethodValue = raw.paymentMethod;
  const normalizedPaymentMethodRaw =
    typeof paymentMethodValue === "string" ? paymentMethodValue.trim() : "";
  const paymentMethodAlias =
    normalizedPaymentMethodRaw.toLowerCase() === "lainnya" ||
      normalizedPaymentMethodRaw.toLowerCase() === "belum pilih"
      ? "Unknown"
      : normalizedPaymentMethodRaw;
  const paymentMethod =
    PAYMENT_METHODS.includes(paymentMethodAlias as (typeof PAYMENT_METHODS)[number])
      ? (paymentMethodAlias as Entry["paymentMethod"])
      : undefined;

  return {
    id: normalizedId,
    text: normalizedText,
    amount,
    rawInput:
      typeof rawInput === "string"
        ? sanitizeImportedString(rawInput, MAX_IMPORTED_RAW_INPUT_LENGTH) || undefined
        : undefined,
    date,
    category: normalizedCategory,
    source,
    paymentMethod,
    parseWarnings: Array.isArray(raw.parseWarnings) ? (raw.parseWarnings as Entry["parseWarnings"]) : undefined,
    split: normalizeImportedSplit(raw.split),
    createdAt,
    updatedAt
  };
}

export function normalizeRule(raw: unknown): CategoryRules[number] | null {
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
      // Get all current IDs in DB
      const currentIds = new Set(await db.entries.toCollection().primaryKeys());
      const incomingIds = new Set(entries.map(e => e.id));
      
      // Find IDs that are in DB but not in the incoming entries (these were deleted)
      const idsToDelete = Array.from(currentIds).filter(id => !incomingIds.has(id));
      
      // Delete removed entries
      if (idsToDelete.length > 0) {
        await db.entries.bulkDelete(idsToDelete);
      }
      
      // Add/Update existing entries
      await db.entries.bulkPut(entries);
    });
    // Fire and forget since we only use it for habit triggers
    syncLastEntryAt(entries).catch(() => { });
  } catch {
    // Ignore write failures to avoid crashing UI.
  }
}

/**
 * Wipes out local database explicitly during hard logouts to prevent data leaks.
 */
export async function clearLocalDatabase(): Promise<void> {
  try {
    await db.transaction("rw", db.entries, db.rules, db.syncQueue, async () => {
      await db.entries.clear();
      await db.rules.clear();
      await db.syncQueue.clear();
    });
    console.log("🧹 Local database wiped clean for privacy.");
  } catch (err) {
    console.error("Failed to clear local database:", err);
    throw err;
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
  const content = JSON.stringify(payload, null, 2);
  const blobLike =
    typeof File === "function"
      ? new File([content], filename, {
        type: "application/json;charset=utf-8;"
      })
      : new Blob([content], { type: "application/json;charset=utf-8;" });
  const url = window.URL.createObjectURL(blobLike);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.setAttribute("download", filename);
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }, 1200);
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

  if (parsed.entries.length > MAX_IMPORT_ENTRIES) {
    return {
      ok: false,
      message: `File backup terlalu besar. Maksimal ${MAX_IMPORT_ENTRIES.toLocaleString("id-ID")} transaksi.`,
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
export { db } from "./db";
export { migrateLocalDataToAccount, initialSyncOnLogin, getLastSyncTime, setLastSyncTime, clearLastSyncTime } from "./sync";
export type { MigrationResult } from "./sync";
export { SyncWorker, enqueueSyncOperation, enqueueSyncOperationBatch, generateSyncId } from "./sync-worker";
export type { SyncQueueItem } from "./db";
