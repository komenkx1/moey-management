"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleHelp,
  CreditCard,
  Flame,
  PieChart,
  Settings,
  Sun,
  Moon,
  WandSparkles,
  Clock3
} from "lucide-react";
import { cn } from "@/lib/utils";
import ScreenContainer from "@/components/kemana-ui/ScreenContainer";
import TopAppBar from "@/components/kemana-ui/TopAppBar";
import BottomTabBar from "@/components/kemana-ui/BottomTabBar";
import FabAddButton from "@/components/kemana-ui/FabAddButton";
import DateRangeFilter from "@/components/kemana-ui/DateRangeFilter";
import SummaryHeroCard from "@/components/kemana-ui/SummaryHeroCard";
import QuickRecallChips, { type QuickRecallItem } from "@/components/kemana-ui/QuickRecallChips";
import ContextBanner from "@/components/kemana-ui/ContextBanner";
import { TransactionCard, type TransactionItem } from "@/components/kemana-ui/TransactionCard";
import AddTransactionSheet, {
  type AddTransactionSubmitPayload
} from "@/components/kemana-ui/AddTransactionSheet";
import BulkInputSheet, { type BulkPreviewLine } from "@/components/kemana-ui/BulkInputSheet";
import DataToolsSheet from "@/components/kemana-ui/DataToolsSheet";
import NightCloseReviewSheet from "@/components/kemana-ui/NightCloseReviewSheet";
import NameOnboardingSheet from "@/components/kemana-ui/NameOnboardingSheet";
import LastEntryGapIndicator from "@/app/LastEntryGapIndicator";
import { formatAmountCompact, formatAmountIDR } from "@kemana/core/format";
import { parseQuickAdd } from "@kemana/core/parser";
import { inferCategory, updateCategoryRule } from "@kemana/core/rules";
import { CATEGORIES, PAYMENT_METHODS, type Category } from "@kemana/core/types";
import type { Entry, ParseQuickAddResult } from "@kemana/core/types";
import { useKemanaStore } from "@/store/use-kemana-store";
import {
  clearStorageHealthWarnings,
  createBackupPayload,
  downloadBackupFile,
  getStorageHealth,
  importBackupFromText,
  incrementRecoveryCount,
  loadEntries,
  loadRules,
  migrateFromLocalStorage,
  readNightCloseMarker,
  saveEntries,
  saveRules,
  writeNightCloseMarker
} from "@kemana/storage";
import {
  type CustomDateRange,
  type DateFilterPreset,
  extractSummedAmountMeta,
  formatDayLabel,
  getBestFilterForDate,
  getDefaultCustomDateRange,
  getFilteredEntries,
  getInputHints,
  getSummaryStats,
  groupEntriesByDate,
  includesDateInFilter,
  makeInitialSplit,
  normalizeDateInput,
  normalizeCustomDateRange,
  offsetDate,
  parseItemBreakdownFromSubtitle,
  splitDisplayText,
  splitSubtitleItems,
  sumAmount,
  toDateKey,
  warningShortText
} from "@/lib/kemana-utils";
import {
  deriveNotesVirtualizationPlan,
  deriveInsightCoachCopy,
  deriveInsightSummary,
  deriveInsightTrendBadge,
  deriveInsightWhyCards,
  deriveQuickFormatTemplates,
  getEntryActivityTimestamp,
  getInitialNotesRenderCount,
  getNextNotesRenderCount
} from "@/lib/dashboard-page-utils";
import {
  getAverageLast7Days,
  getNightCloseCopy,
  getTopCategory as getNightCloseTopCategory,
  getTodayISO,
  getTodayStats,
  shouldShowNightClose
} from "./night-close";
import { getLastEntryTimestamp, getSmartRecallPrompt } from "./recall";
import { recordQuickAddAck, scheduleBackgroundTask } from "@/lib/perf";
import { toast } from "sonner";

interface ParsedBulkLine extends BulkPreviewLine {
  parsed?: Extract<ParseQuickAddResult, { ok: true }>;
}

interface MovedToastPayload {
  entryId: string;
  targetDate: string;
  label: string;
  movedOutOfFilter: boolean;
}

interface UndoToastPayload {
  entry: Entry;
  index: number;
}

const LAST_OPEN_AT_KEY = "kemana.lastOpenAt";
const RECALL_DISMISSED_SESSION_KEY = "kemana.dismissedRecallUntil";
const MOVED_TOAST_ID = "kemana.moved";
const UNDO_TOAST_ID = "kemana.undo";
const USER_NAME_KEY = "kemana.userName";
const THEME_MODE_KEY = "kemana.themeMode";
const NOTES_VIRTUALIZE_THRESHOLD = 1000;
const NOTES_RENDER_CHUNK = 220;

type ThemeMode = "light" | "dark";

function resolveThemeModeFromStorage(root: HTMLElement): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_MODE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // Ignore storage read errors and fallback to DOM/system preference.
  }

  if (root.classList.contains("dark")) {
    return "dark";
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

function persistThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    // Ignore storage write errors to keep theme toggle usable.
  }
}

function createEntryId(): string {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function toParserAmountToken(amount: number): string {
  const normalizedAmount = Math.max(0, Math.round(amount));
  if (normalizedAmount >= 1_000 && normalizedAmount % 1_000 === 0) {
    return `${normalizedAmount / 1_000}k`;
  }
  return String(normalizedAmount);
}

function escapeCsvCell(value: string): string {
  if (!/[",\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function triggerDownloadFromText(params: { content: string; mimeType: string; filename: string }): void {
  if (typeof window === "undefined") {
    return;
  }

  const { content, mimeType, filename } = params;
  const blobLike =
    typeof File === "function"
      ? new File([content], filename, { type: mimeType })
      : new Blob([content], { type: mimeType });
  const objectUrl = window.URL.createObjectURL(blobLike);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.setAttribute("download", filename);
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, 1200);
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

function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (inQuotes) {
      if (char === '"') {
        const nextChar = raw[index + 1];
        if (nextChar === '"') {
          currentCell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function parsePaymentMethodFromCsv(value: string): Entry["paymentMethod"] | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const mapping: Record<string, Entry["paymentMethod"]> = {
    unknown: "Unknown",
    "belum pilih": "Unknown",
    lainnya: "Unknown",
    cash: "Cash",
    tunai: "Cash",
    qris: "QRIS",
    debit: "Debit",
    kredit: "Credit",
    credit: "Credit",
    transfer: "Transfer"
  };

  if (mapping[normalized]) {
    return mapping[normalized];
  }

  if (PAYMENT_METHODS.includes(value.trim() as (typeof PAYMENT_METHODS)[number])) {
    return value.trim() as Entry["paymentMethod"];
  }

  return undefined;
}

function parseSplitFromCsv(modeRaw: string, detailRaw: string): Entry["split"] | undefined {
  const mode = modeRaw.trim().toLowerCase();
  if (mode !== "equal" && mode !== "custom") {
    return undefined;
  }

  const shares = detailRaw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.lastIndexOf(":");
      if (separator <= 0) {
        return null;
      }
      const person = part.slice(0, separator).trim();
      const amount = Number.parseInt(part.slice(separator + 1).replace(/[^\d]/g, ""), 10);
      if (!person || !Number.isFinite(amount) || amount < 0) {
        return null;
      }
      return { person, amount };
    })
    .filter((share): share is { person: string; amount: number } => Boolean(share));

  if (shares.length < 2) {
    return undefined;
  }

  return {
    mode,
    payer: "Kamu",
    shares
  };
}

function importEntriesFromCsv(params: {
  raw: string;
  currentEntries: Entry[];
  mode: "merge" | "replace";
}): {
  ok: boolean;
  message: string;
  entries: Entry[];
  importedEntries: number;
  ignoredEntries: number;
} {
  const { raw, currentEntries, mode } = params;
  const rows = parseCsvRows(raw);
  if (rows.length < 2) {
    return {
      ok: false,
      message: "CSV kosong atau format tidak sesuai.",
      entries: currentEntries,
      importedEntries: 0,
      ignoredEntries: 0
    };
  }

  const headerRow = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  const headerIndex = new Map<string, number>();
  headerRow.forEach((header, index) => {
    if (!headerIndex.has(header)) {
      headerIndex.set(header, index);
    }
  });

  const getCell = (row: string[], keys: string[]): string => {
    for (const key of keys) {
      const index = headerIndex.get(key);
      if (typeof index === "number" && index < row.length) {
        return row[index] ?? "";
      }
    }
    return "";
  };

  if (!headerIndex.has("nominal")) {
    return {
      ok: false,
      message: "CSV tidak memiliki kolom nominal.",
      entries: currentEntries,
      importedEntries: 0,
      ignoredEntries: 0
    };
  }

  const nowIso = new Date().toISOString();
  const parsedEntries: Entry[] = [];
  let ignoredEntries = 0;

  for (const row of rows.slice(1)) {
    if (!row.some((cell) => cell.trim().length > 0)) {
      continue;
    }

    const dateRaw = getCell(row, ["tanggal", "date"]).trim();
    const normalizedDate = normalizeDateInput(dateRaw);
    const amountRaw = getCell(row, ["nominal", "amount"]).trim();
    const parsedAmount = Number.parseInt(amountRaw.replace(/[^\d]/g, ""), 10);
    const categoryRaw = getCell(row, ["kategori", "category"]).trim();
    const noteRaw = getCell(row, ["catatan", "note", "text"]).trim();
    const paymentRaw = getCell(row, ["metode_bayar", "payment_method"]).trim();
    const splitModeRaw = getCell(row, ["split_mode"]).trim();
    const splitDetailRaw = getCell(row, ["split_rincian", "split_detail"]).trim();
    const rawInputRaw = getCell(row, ["raw_input"]).trim();

    if (!normalizedDate || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      ignoredEntries += 1;
      continue;
    }

    const matchedCategory = CATEGORIES.find((category) => category.toLowerCase() === categoryRaw.toLowerCase());
    const normalizedCategory = matchedCategory ?? "Lainnya";
    const split = parseSplitFromCsv(splitModeRaw, splitDetailRaw);
    const fallbackText = noteRaw || normalizedCategory;
    const splitCount = split?.shares.length ?? 0;
    const splitToken = splitCount > 1 ? ` ${splitCount}p` : "";
    const fallbackRawInput = `${fallbackText} ${toParserAmountToken(parsedAmount)}${splitToken}`.trim();
    const idRaw = getCell(row, ["id"]).trim();

    parsedEntries.push({
      id: idRaw || createEntryId(),
      text: fallbackText,
      amount: parsedAmount,
      rawInput: rawInputRaw || fallbackRawInput,
      date: normalizedDate,
      category: normalizedCategory,
      paymentMethod: parsePaymentMethodFromCsv(paymentRaw),
      source: "quick_add",
      split,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }

  if (!parsedEntries.length) {
    return {
      ok: false,
      message: "Tidak ada baris transaksi valid di CSV.",
      entries: currentEntries,
      importedEntries: 0,
      ignoredEntries
    };
  }

  const entries =
    mode === "replace"
      ? sortEntriesNewestFirst(parsedEntries)
      : mergeEntriesById(currentEntries, parsedEntries);

  const messageBase =
    mode === "replace"
      ? `Import CSV selesai. ${parsedEntries.length} transaksi dimuat.`
      : `Import CSV selesai. ${parsedEntries.length} transaksi ditambahkan.`;

  return {
    ok: true,
    message: ignoredEntries > 0 ? `${messageBase} ${ignoredEntries} baris dilewati.` : messageBase,
    entries,
    importedEntries: parsedEntries.length,
    ignoredEntries
  };
}

function downloadCsv(entries: Entry[]): void {
  const headers = [
    "id",
    "tanggal",
    "kategori",
    "metode_bayar",
    "nominal",
    "catatan",
    "split_mode",
    "split_rincian",
    "raw_input"
  ];

  const rows = entries.map((entry) => {
    const splitMode = entry.split?.mode ?? "";
    const splitDetail =
      entry.split?.shares.map((share) => `${share.person}:${Math.round(share.amount)}`).join(" | ") ?? "";
    const title = splitDisplayText(entry.text).title;
    const subtitle = splitDisplayText(entry.text).subtitle ?? "";
    const note = subtitle ? `${title} - ${subtitle}` : title;

    return [
      entry.id,
      entry.date,
      entry.category,
      entry.paymentMethod ?? "",
      String(Math.round(entry.amount)),
      note,
      splitMode,
      splitDetail,
      entry.rawInput ?? ""
    ];
  });

  const headerLine = "\uFEFF" + headers.map((header) => escapeCsvCell(header)).join(",");
  const rowLines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","));
  const content = [headerLine, ...rowLines].join("\n");

  const date = new Date().toISOString().slice(0, 10);
  triggerDownloadFromText({
    content,
    mimeType: "text/csv;charset=utf-8;",
    filename: `kemana-export-${date}.csv`
  });
}

function toTransactionItem(entry: Entry): TransactionItem {
  const display = splitDisplayText(entry.text);
  return {
    id: entry.id,
    title: display.title,
    note: display.subtitle || undefined,
    amount: entry.amount,
    type: "expense",
    category: entry.category,
    paymentMethod: entry.paymentMethod,
    time: entry.date,
    split: entry.split,
    rawInput: entry.rawInput,
    parseWarnings: entry.parseWarnings
  };
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("home");
  const entries = useKemanaStore((state) => state.entries);
  const setEntries = useKemanaStore((state) => state.setEntries);
  const rules = useKemanaStore((state) => state.rules);
  const setRules = useKemanaStore((state) => state.setRules);
  const isStorageReady = useKemanaStore((state) => state.isStorageReady);
  const setIsStorageReady = useKemanaStore((state) => state.setIsStorageReady);
  const storageWarning = useKemanaStore((state) => state.storageWarning);
  const setStorageWarning = useKemanaStore((state) => state.setStorageWarning);
  const backupMessage = useKemanaStore((state) => state.backupMessage);
  const setBackupMessage = useKemanaStore((state) => state.setBackupMessage);

  const replaceOnImport = useKemanaStore((state) => state.replaceOnImport);
  const setReplaceOnImport = useKemanaStore((state) => state.setReplaceOnImport);
  const dateFilter = useKemanaStore((state) => state.dateFilter);
  const setDateFilter = useKemanaStore((state) => state.setDateFilter);
  const pendingScrollToId = useKemanaStore((state) => state.pendingScrollToId);
  const setPendingScrollToId = useKemanaStore((state) => state.setPendingScrollToId);
  const highlightEntryId = useKemanaStore((state) => state.highlightEntryId);
  const setHighlightEntryId = useKemanaStore((state) => state.setHighlightEntryId);

  const quickInput = useKemanaStore((state) => state.quickInput);
  const setQuickInput = useKemanaStore((state) => state.setQuickInput);
  const debouncedQuickInput = useKemanaStore((state) => state.debouncedQuickInput);
  const setDebouncedQuickInput = useKemanaStore((state) => state.setDebouncedQuickInput);
  const quickError = useKemanaStore((state) => state.quickError);
  const setQuickError = useKemanaStore((state) => state.setQuickError);
  const showQuickWarningDetails = useKemanaStore((state) => state.showQuickWarningDetails);
  const setShowQuickWarningDetails = useKemanaStore((state) => state.setShowQuickWarningDetails);
  const recallInputPrimed = useKemanaStore((state) => state.recallInputPrimed);
  const setRecallInputPrimed = useKemanaStore((state) => state.setRecallInputPrimed);

  const lastAppOpenAt = useKemanaStore((state) => state.lastAppOpenAt);
  const setLastAppOpenAt = useKemanaStore((state) => state.setLastAppOpenAt);
  const recallDismissedInSession = useKemanaStore((state) => state.recallDismissedInSession);
  const setRecallDismissedInSession = useKemanaStore((state) => state.setRecallDismissedInSession);
  const isRecallSessionReady = useKemanaStore((state) => state.isRecallSessionReady);
  const setIsRecallSessionReady = useKemanaStore((state) => state.setIsRecallSessionReady);

  const nightCloseClosedAt = useKemanaStore((state) => state.nightCloseClosedAt);
  const setNightCloseClosedAt = useKemanaStore((state) => state.setNightCloseClosedAt);
  const isNightCloseReady = useKemanaStore((state) => state.isNightCloseReady);
  const setIsNightCloseReady = useKemanaStore((state) => state.setIsNightCloseReady);
  const nightClosePanelOpen = useKemanaStore((state) => state.nightClosePanelOpen);
  const setNightClosePanelOpen = useKemanaStore((state) => state.setNightClosePanelOpen);
  const nightCloseConfirmation = useKemanaStore((state) => state.nightCloseConfirmation);
  const setNightCloseConfirmation = useKemanaStore((state) => state.setNightCloseConfirmation);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [sheetPrefill, setSheetPrefill] = useState<Partial<AddTransactionSubmitPayload> | null>(null);
  const [isBulkSheetOpen, setIsBulkSheetOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [isDataToolsSheetOpen, setIsDataToolsSheetOpen] = useState(false);
  const [homePendingScrollId, setHomePendingScrollId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
  const [notesRenderCount, setNotesRenderCount] = useState(NOTES_RENDER_CHUNK);
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(() => getDefaultCustomDateRange());

  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const homeItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const notesLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const undoToastPayloadRef = useRef<UndoToastPayload | null>(null);
  const movedToastPayloadRef = useRef<MovedToastPayload | null>(null);
  const dateFilterRef = useRef<DateFilterPreset>(dateFilter);
  const customDateRangeRef = useRef<CustomDateRange>(customDateRange);
  const cancelEntriesPersistRef = useRef<(() => void) | null>(null);
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    async function initStorage() {
      await migrateFromLocalStorage();
      const [loadedEntries, loadedRules, nightMarker] = await Promise.all([
        loadEntries(),
        loadRules(),
        readNightCloseMarker()
      ]);
      setEntries(loadedEntries);
      setRules(loadedRules);
      setNightCloseClosedAt(nightMarker);
      setIsNightCloseReady(true);

      const health = getStorageHealth();
      if (health.hasCorruption) {
        setStorageWarning("Data penyimpanan bermasalah. Coba import backup.");
      }
      setIsStorageReady(true);
    }

    initStorage();
  }, [
    setEntries,
    setRules,
    setNightCloseClosedAt,
    setIsNightCloseReady,
    setStorageWarning,
    setIsStorageReady
  ]);

  useEffect(() => {
    const storedName = window.localStorage.getItem(USER_NAME_KEY) ?? "";
    const normalizedName = storedName.replace(/\s+/g, " ").trim();

    if (normalizedName) {
      setUserName(normalizedName);
      setNameDraft(normalizedName);
      setIsNamePromptOpen(false);
      return;
    }

    setUserName("");
    setNameDraft("");
    setIsNamePromptOpen(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }

    cancelEntriesPersistRef.current?.();
    const cancelPersist = scheduleBackgroundTask(() => {
      saveEntries(entries);
      if (cancelEntriesPersistRef.current === cancelPersist) {
        cancelEntriesPersistRef.current = null;
      }
    });
    cancelEntriesPersistRef.current = cancelPersist;

    return () => {
      if (isUnmountingRef.current) {
        return;
      }
      cancelPersist();
      if (cancelEntriesPersistRef.current === cancelPersist) {
        cancelEntriesPersistRef.current = null;
      }
    };
  }, [entries, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }
    saveRules(rules);
  }, [rules, isStorageReady]);

  useEffect(() => {
    const now = Date.now();
    const rawLastOpenAt = window.localStorage.getItem(LAST_OPEN_AT_KEY);
    const parsedLastOpenAt = rawLastOpenAt ? Number.parseInt(rawLastOpenAt, 10) : Number.NaN;
    setLastAppOpenAt(Number.isFinite(parsedLastOpenAt) ? parsedLastOpenAt : null);
    window.localStorage.setItem(LAST_OPEN_AT_KEY, String(now));

    const dismissed = window.sessionStorage.getItem(RECALL_DISMISSED_SESSION_KEY);
    setRecallDismissedInSession(Boolean(dismissed));
    setIsRecallSessionReady(true);
  }, [setIsRecallSessionReady, setLastAppOpenAt, setRecallDismissedInSession]);

  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      cancelEntriesPersistRef.current?.();
      toast.dismiss(UNDO_TOAST_ID);
      toast.dismiss(MOVED_TOAST_ID);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuickInput(quickInput);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [quickInput, setDebouncedQuickInput]);

  useEffect(() => {
    const root = document.documentElement;
    const initialTheme = resolveThemeModeFromStorage(root);
    root.classList.toggle("dark", initialTheme === "dark");
    setIsDarkMode(initialTheme === "dark");
    persistThemeMode(initialTheme);
  }, []);

  useEffect(() => {
    dateFilterRef.current = dateFilter;
  }, [dateFilter]);

  useEffect(() => {
    customDateRangeRef.current = customDateRange;
  }, [customDateRange]);

  useEffect(() => {
    setExpandedIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    if (!highlightEntryId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setHighlightEntryId((current) => (current === highlightEntryId ? null : current));
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [highlightEntryId, setHighlightEntryId]);

  useEffect(() => {
    if (!nightCloseConfirmation) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNightCloseConfirmation((current) => (current === nightCloseConfirmation ? null : current));
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [nightCloseConfirmation, setNightCloseConfirmation]);

  useEffect(() => {
    if (!pendingScrollToId || activeTab !== "notes") {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 4;

    const tryScroll = () => {
      if (cancelled) {
        return;
      }

      const mapTarget = itemRefs.current.get(pendingScrollToId);
      const domTarget =
        mapTarget ?? (document.querySelector(`[data-entry-id="${pendingScrollToId}"]`) as HTMLDivElement | null);

      if (domTarget) {
        domTarget.scrollIntoView({ behavior: "smooth", block: "center" });
        setPendingScrollToId((current) => (current === pendingScrollToId ? null : current));
        return;
      }

      if (attempts >= maxAttempts) {
        setPendingScrollToId((current) => (current === pendingScrollToId ? null : current));
        return;
      }

      attempts += 1;
      window.setTimeout(() => {
        window.requestAnimationFrame(tryScroll);
      }, 90);
    };

    window.requestAnimationFrame(tryScroll);

    return () => {
      cancelled = true;
    };
  }, [activeTab, dateFilter, entries, pendingScrollToId, setPendingScrollToId]);

  useEffect(() => {
    if (!homePendingScrollId || activeTab !== "home") {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 4;

    const tryScroll = () => {
      if (cancelled) {
        return;
      }

      const mapTarget = homeItemRefs.current.get(homePendingScrollId);
      const domTarget =
        mapTarget ??
        (document.querySelector(`[data-home-entry-id="${homePendingScrollId}"]`) as HTMLDivElement | null);

      if (domTarget) {
        domTarget.scrollIntoView({ behavior: "smooth", block: "center" });
        setHomePendingScrollId((current) => (current === homePendingScrollId ? null : current));
        return;
      }

      if (attempts >= maxAttempts) {
        setHomePendingScrollId((current) => (current === homePendingScrollId ? null : current));
        return;
      }

      attempts += 1;
      window.setTimeout(() => {
        window.requestAnimationFrame(tryScroll);
      }, 90);
    };

    window.requestAnimationFrame(tryScroll);

    return () => {
      cancelled = true;
    };
  }, [activeTab, entries, homePendingScrollId]);

  useEffect(() => {
    if (isNightCloseReady && !shouldShowNightClose({ entries, closedAt: nightCloseClosedAt })) {
      setNightClosePanelOpen(false);
    }
  }, [entries, isNightCloseReady, nightCloseClosedAt, setNightClosePanelOpen]);

  const allTransactions = useMemo(() => entries.map(toTransactionItem), [entries]);
  const normalizedCustomRange = useMemo(
    () => normalizeCustomDateRange(customDateRange, new Date()),
    [customDateRange]
  );
  const filteredEntries = useMemo(
    () => getFilteredEntries(entries, dateFilter, new Date(), normalizedCustomRange),
    [dateFilter, entries, normalizedCustomRange]
  );
  const filteredTransactions = useMemo(() => filteredEntries.map(toTransactionItem), [filteredEntries]);
  const notesVirtualizationPlan = useMemo(
    () =>
      deriveNotesVirtualizationPlan({
        totalEntries: filteredEntries.length,
        requestedRenderCount: notesRenderCount,
        threshold: NOTES_VIRTUALIZE_THRESHOLD,
        chunkSize: NOTES_RENDER_CHUNK
      }),
    [filteredEntries.length, notesRenderCount]
  );
  const shouldVirtualizeNotes = notesVirtualizationPlan.shouldVirtualize;
  const notesVisibleEntries = useMemo(
    () => filteredEntries.slice(0, notesVirtualizationPlan.visibleCount),
    [filteredEntries, notesVirtualizationPlan.visibleCount]
  );
  const notesHasMore = notesVirtualizationPlan.hasMore;

  const groupedEntriesResult = useMemo(() => groupEntriesByDate(notesVisibleEntries), [notesVisibleEntries]);
  const groupedEntries = useMemo(() => groupedEntriesResult.groups, [groupedEntriesResult]);
  const orderedDates = useMemo(() => groupedEntriesResult.dates, [groupedEntriesResult]);
  const dailyTotal = useMemo(
    () =>
      orderedDates.reduce(
        (acc, dateISO) => {
          acc[dateISO] = sumAmount(groupedEntries[dateISO] ?? []);
          return acc;
        },
        {} as Record<string, number>
      ),
    [groupedEntries, orderedDates]
  );

  useEffect(() => {
    if (activeTab !== "notes") {
      return;
    }

    // Threshold-based windowing keeps first render smooth on 1000+ rows.
    // Can be swapped to react-window later using notesVisibleEntries as boundary.
    setNotesRenderCount(
      getInitialNotesRenderCount(filteredEntries.length, NOTES_VIRTUALIZE_THRESHOLD, NOTES_RENDER_CHUNK)
    );
  }, [activeTab, dateFilter, filteredEntries.length]);

  useEffect(() => {
    if (!pendingScrollToId || !shouldVirtualizeNotes) {
      return;
    }

    const targetIndex = filteredEntries.findIndex((entry) => entry.id === pendingScrollToId);
    if (targetIndex < 0) {
      return;
    }

    setNotesRenderCount((prev) =>
      Math.min(filteredEntries.length, Math.max(prev, targetIndex + Math.floor(NOTES_RENDER_CHUNK / 2)))
    );
  }, [filteredEntries, pendingScrollToId, shouldVirtualizeNotes]);

  useEffect(() => {
    if (activeTab !== "notes" || !notesHasMore) {
      return;
    }

    const target = notesLoadMoreRef.current;
    if (!target) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setNotesRenderCount((prev) => getNextNotesRenderCount(prev, filteredEntries.length, NOTES_RENDER_CHUNK));
      return;
    }

    const observer = new IntersectionObserver(
      (entriesObserved) => {
        if (!entriesObserved.some((entry) => entry.isIntersecting)) {
          return;
        }
        setNotesRenderCount((prev) => getNextNotesRenderCount(prev, filteredEntries.length, NOTES_RENDER_CHUNK));
      },
      {
        root: null,
        rootMargin: "220px 0px"
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab, filteredEntries.length, notesHasMore]);

  const summaryStats = useMemo(
    () =>
      getSummaryStats({
        allEntries: entries,
        filteredEntries,
        preset: dateFilter,
        customRange: normalizedCustomRange
      }),
    [dateFilter, entries, filteredEntries, normalizedCustomRange]
  );
  const insightSevenDay = useMemo(
    () => deriveInsightSummary(entries, dateFilter, new Date(), normalizedCustomRange),
    [dateFilter, entries, normalizedCustomRange]
  );
  const insightWhyCards = useMemo(() => deriveInsightWhyCards(insightSevenDay), [insightSevenDay]);
  const insightCoachCopy = useMemo(() => deriveInsightCoachCopy(insightSevenDay), [insightSevenDay]);
  const insightTrendBadge = useMemo(() => deriveInsightTrendBadge(insightSevenDay), [insightSevenDay]);
  const insightAverageAmountLabel = useMemo(() => {
    const amount = insightSevenDay.averagePerDay;
    if (amount >= 1_000_000) {
      return `Rp${formatAmountCompact(amount)}`;
    }
    return `Rp${formatAmountIDR(amount)}`;
  }, [insightSevenDay.averagePerDay]);

  const insightWeeklySeries = useMemo(() => {
    const now = new Date();
    const labels = ["4 minggu lalu", "3 minggu lalu", "2 minggu lalu", "Pekan ini"];

    return labels.map((label, index) => {
      const endOffset = -(3 - index) * 7;
      const startOffset = endOffset - 6;
      const startKey = toDateKey(offsetDate(now, startOffset));
      const endKey = toDateKey(offsetDate(now, endOffset));
      const bucketEntries = filteredEntries.filter((entry) => entry.date >= startKey && entry.date <= endKey);

      return {
        label,
        total: sumAmount(bucketEntries)
      };
    });
  }, [filteredEntries]);
  const insightMaxWeekTotal = useMemo(
    () => Math.max(...insightWeeklySeries.map((item) => item.total), 0),
    [insightWeeklySeries]
  );

  const quickPreview = useMemo(() => {
    if (!debouncedQuickInput.trim()) {
      return null;
    }
    return parseQuickAdd(debouncedQuickInput);
  }, [debouncedQuickInput]);

  const quickPreviewTextParts = useMemo(
    () => (quickPreview?.ok ? splitDisplayText(quickPreview.value.text) : null),
    [quickPreview]
  );
  const quickPreviewSubtitleBreakdown = useMemo(
    () =>
      quickPreviewTextParts?.subtitle
        ? parseItemBreakdownFromSubtitle(quickPreviewTextParts.subtitle)
        : null,
    [quickPreviewTextParts?.subtitle]
  );
  const quickPreviewSubtitleItems = useMemo(
    () => (quickPreviewTextParts?.subtitle ? splitSubtitleItems(quickPreviewTextParts.subtitle) : null),
    [quickPreviewTextParts?.subtitle]
  );

  const adaptiveHints = useMemo(() => getInputHints(quickInput, quickPreview), [quickInput, quickPreview]);
  const summedAmountMeta = useMemo(
    () => (quickPreview?.ok ? extractSummedAmountMeta(quickPreview.warnings) : null),
    [quickPreview]
  );

  const smartRecallPrompt = useMemo(() => {
    if (!isStorageReady || !isRecallSessionReady || recallDismissedInSession) {
      return null;
    }

    return getSmartRecallPrompt({
      entries,
      lastAppOpenAt
    });
  }, [entries, isRecallSessionReady, isStorageReady, lastAppOpenAt, recallDismissedInSession]);

  const lastEntryAt = useMemo(() => getLastEntryTimestamp(entries), [entries]);

  const quickInputPlaceholder = useMemo(() => {
    if (smartRecallPrompt || recallInputPrimed) {
      return "Barusan apa?";
    }

    const hour = new Date().getHours();
    if (hour >= 19 && hour <= 23) {
      return "Keluar apa hari ini?";
    }

    return "Misal: 25k makan";
  }, [recallInputPrimed, smartRecallPrompt]);

  const quickHistorySuggestions = useMemo(() => {
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
      } else {
        current.count += 1;
        current.lastAt = Math.max(current.lastAt, Number.isFinite(recency) ? recency : 0);
      }
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
  }, [entries, quickInput]);

  const nightCloseTodayStats = useMemo(() => getTodayStats(entries), [entries]);
  const nightCloseAvg7 = useMemo(() => getAverageLast7Days(entries), [entries]);
  const nightCloseTopCategory = useMemo(
    () => getNightCloseTopCategory(nightCloseTodayStats.byCategory),
    [nightCloseTodayStats.byCategory]
  );
  const nightCloseCopy = useMemo(
    () => getNightCloseCopy({ stats: nightCloseTodayStats, avg7: nightCloseAvg7 }),
    [nightCloseAvg7, nightCloseTodayStats]
  );
  const nightCloseDateLabel = useMemo(() => {
    const parsed = new Date(`${nightCloseTodayStats.dateISO}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return nightCloseTodayStats.dateISO;
    }

    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(parsed);
  }, [nightCloseTodayStats.dateISO]);

  const showNightCloseBar = useMemo(
    () =>
      isNightCloseReady &&
      shouldShowNightClose({
        entries,
        closedAt: nightCloseClosedAt
      }),
    [entries, isNightCloseReady, nightCloseClosedAt]
  );

  const adaptiveRecallItems: QuickRecallItem[] = useMemo(() => {
    if (!entries.length) {
      return [];
    }

    const now = Date.now();
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
      const ageDays = Number.isFinite(createdAt) ? Math.max(0, (now - createdAt) / 86_400_000) : 99;
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
      } else {
        current.amountTotal += entry.amount;
        current.count += 1;
        current.score += scoreBoost;
      }
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
  }, [entries]);

  const topAdaptiveRecallItem = useMemo(() => adaptiveRecallItems[0] ?? null, [adaptiveRecallItems]);

  const adaptiveHint = useMemo(() => {
    if (!topAdaptiveRecallItem) {
      return "Belum ada pola. Catat beberapa pengeluaran untuk mulai saran pintar.";
    }
    return `${topAdaptiveRecallItem.title} sekitar Rp${formatAmountIDR(topAdaptiveRecallItem.amount)}.`;
  }, [topAdaptiveRecallItem]);

  const showSuggestionCard = Boolean(smartRecallPrompt && topAdaptiveRecallItem);

  const latestEntryInsight = useMemo(() => {
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
  }, [entries]);

  const quickFormatTemplates = useMemo(() => {
    const fallbackBase = topAdaptiveRecallItem ? splitDisplayText(topAdaptiveRecallItem.title).title : "makan";
    return deriveQuickFormatTemplates({
      quickInput,
      fallbackBase
    });
  }, [quickInput, topAdaptiveRecallItem]);

  const showQuickFormatTemplates = useMemo(() => quickInput.trim().length > 0, [quickInput]);
  const normalizedNameDraft = useMemo(() => nameDraft.replace(/\s+/g, " ").trim(), [nameDraft]);
  const canSaveName = normalizedNameDraft.length >= 2;
  const homeGreetingSubtitle = useMemo(() => (userName ? `Halo, ${userName}` : "Halo"), [userName]);

  const bulkDraftLines = useMemo<ParsedBulkLine[]>(() => {
    const lines = bulkInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines.map((line) => {
      const parsed = parseQuickAdd(line, new Date(), "bulk_paste");
      if (!parsed.ok) {
        return {
          line,
          ok: false,
          reason: parsed.reason
        };
      }
      return {
        line,
        ok: true,
        amount: parsed.value.amount,
        parsed
      };
    });
  }, [bulkInput]);

  const bulkPreview = useMemo<BulkPreviewLine[]>(
    () =>
      bulkDraftLines.map((line) => ({
        line: line.line,
        ok: line.ok,
        reason: line.reason,
        amount: line.amount
      })),
    [bulkDraftLines]
  );
  const validBulkCount = useMemo(() => bulkDraftLines.filter((line) => line.ok).length, [bulkDraftLines]);

  const isAnySheetOpen =
    isAddSheetOpen || isBulkSheetOpen || isDataToolsSheetOpen || nightClosePanelOpen || isNamePromptOpen;
  const shouldHideFab = isAnySheetOpen || expandedIds.size > 0;

  const toggleTheme = useCallback(() => {
    setIsDarkMode((current) => {
      const nextIsDark = !current;
      const root = document.documentElement;
      root.classList.toggle("dark", nextIsDark);
      persistThemeMode(nextIsDark ? "dark" : "light");
      return nextIsDark;
    });
  }, []);

  const openAddSheet = useCallback((prefillData?: Partial<AddTransactionSubmitPayload>) => {
    setSheetPrefill(prefillData ?? null);
    setIsAddSheetOpen(true);
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const dismissRecallForSession = useCallback(() => {
    setRecallDismissedInSession(true);
    window.sessionStorage.setItem(RECALL_DISMISSED_SESSION_KEY, String(Date.now()));
  }, [setRecallDismissedInSession]);

  const primeQuickInputForRecall = useCallback(
    (options?: { dismissSession?: boolean }) => {
      const dismissSession = options?.dismissSession ?? true;
      setRecallInputPrimed(true);
      if (dismissSession) {
        dismissRecallForSession();
      }
      setQuickError(null);
      setShowQuickWarningDetails(false);
      if (activeTab !== "home") {
        setActiveTab("home");
      }
      window.requestAnimationFrame(() => {
        quickInputRef.current?.focus();
      });
    },
    [activeTab, dismissRecallForSession, setQuickError, setRecallInputPrimed, setShowQuickWarningDetails]
  );

  const handleRecallAddRecent = useCallback(async () => {
    incrementRecoveryCount().catch(() => {
      // no-op for local telemetry failure
    });
    primeQuickInputForRecall();
  }, [primeQuickInputForRecall]);

  const handleRecallDismiss = useCallback(() => {
    setRecallInputPrimed(false);
    dismissRecallForSession();
  }, [dismissRecallForSession, setRecallInputPrimed]);

  const handleApplyQuickHistorySuggestion = useCallback(
    (title: string) => {
      setQuickInput(`${title} `);
      setQuickError(null);
      setShowQuickWarningDetails(false);
      window.requestAnimationFrame(() => {
        quickInputRef.current?.focus();
      });
    },
    [setQuickError, setQuickInput, setShowQuickWarningDetails]
  );

  const handleApplyQuickFormatTemplate = useCallback(
    (template: string) => {
      setQuickInput(template);
      setQuickError(null);
      setShowQuickWarningDetails(false);
      window.requestAnimationFrame(() => {
        quickInputRef.current?.focus();
      });
    },
    [setQuickError, setQuickInput, setShowQuickWarningDetails]
  );

  const inferCategoryFromText = useCallback(
    (text: string) => inferCategory(text, rules),
    [rules]
  );

  const handleSaveUserName = useCallback(() => {
    if (!canSaveName) {
      return;
    }

    const nextName = normalizedNameDraft;
    setUserName(nextName);
    setNameDraft(nextName);
    setIsNamePromptOpen(false);
    window.localStorage.setItem(USER_NAME_KEY, nextName);
    toast.success(`Halo, ${nextName}`);
  }, [canSaveName, normalizedNameDraft]);

  const handleDateFilterChange = useCallback(
    (next: DateFilterPreset) => {
      if (next === "custom") {
        setCustomDateRange((prev) => normalizeCustomDateRange(prev, new Date()));
      }
      setDateFilter(next);
    },
    [setDateFilter]
  );

  const handleCustomDateRangeChange = useCallback(
    (next: CustomDateRange) => {
      setCustomDateRange(normalizeCustomDateRange(next, new Date()));
      if (dateFilter !== "custom") {
        setDateFilter("custom");
      }
    },
    [dateFilter, setDateFilter]
  );

  const handleMovedToastSee = useCallback(() => {
    const movedToast = movedToastPayloadRef.current;
    if (!movedToast) {
      return;
    }

    if (!includesDateInFilter(movedToast.targetDate, dateFilterRef.current, new Date(), customDateRangeRef.current)) {
      setDateFilter(getBestFilterForDate(movedToast.targetDate));
    }

    setActiveTab("notes");
    setPendingScrollToId(movedToast.entryId);
    setHighlightEntryId(movedToast.entryId);
    movedToastPayloadRef.current = null;
    toast.dismiss(MOVED_TOAST_ID);
  }, [setDateFilter, setHighlightEntryId, setPendingScrollToId]);

  const showMovedToast = useCallback(
    (payload: MovedToastPayload) => {
      movedToastPayloadRef.current = payload;
      toast(
        payload.movedOutOfFilter
          ? `Tanggal disimpan. Dipindah ke ${payload.label} (di luar filter aktif).`
          : `Tanggal disimpan. Dipindah ke ${payload.label}`,
        {
          id: MOVED_TOAST_ID,
          duration: 8000,
          action: {
            label: "Lihat",
            onClick: handleMovedToastSee
          },
          onDismiss: () => {
            movedToastPayloadRef.current = null;
          },
          onAutoClose: () => {
            movedToastPayloadRef.current = null;
          }
        }
      );
    },
    [handleMovedToastSee]
  );

  const handleSaveTransaction = useCallback(
    (updatedItem: TransactionItem) => {
      const originalEntry = entries.find((entry) => entry.id === updatedItem.id);
      if (!originalEntry) {
        return;
      }

      const dateChanged = originalEntry.date !== updatedItem.time;
      const categoryChanged = originalEntry.category !== updatedItem.category;

      const originalTitle = splitDisplayText(originalEntry.text).title.trim();
      const nextTitle = updatedItem.title.trim() || originalTitle || updatedItem.category;
      const note = updatedItem.note?.trim();
      const nextText = note ? `${nextTitle} - ${note}` : nextTitle;
      const paymentMethod =
        updatedItem.paymentMethod &&
        PAYMENT_METHODS.includes(updatedItem.paymentMethod as (typeof PAYMENT_METHODS)[number])
          ? (updatedItem.paymentMethod as Entry["paymentMethod"])
          : undefined;

      const nextEntries = entries.map((entry) => {
        if (entry.id !== updatedItem.id) {
          return entry;
        }

        return {
          ...entry,
          amount: updatedItem.amount,
          date: updatedItem.time,
          category: updatedItem.category as Entry["category"],
          paymentMethod,
          text: nextText,
          rawInput: updatedItem.rawInput,
          parseWarnings: updatedItem.parseWarnings,
          split: updatedItem.split,
          updatedAt: new Date().toISOString()
        };
      });

      setEntries(nextEntries);
      if (categoryChanged) {
        setRules((prev) => updateCategoryRule(prev, nextText, updatedItem.category as Category));
      }

      if (dateChanged) {
        const movedLabel = formatDayLabel(updatedItem.time, new Date());
        showMovedToast({
          entryId: updatedItem.id,
          targetDate: updatedItem.time,
          label: movedLabel,
          movedOutOfFilter: !includesDateInFilter(updatedItem.time, dateFilter, new Date(), normalizedCustomRange)
        });
        setPendingScrollToId(updatedItem.id);
        setHighlightEntryId(updatedItem.id);
      } else {
        toast.success("Catatan diperbarui.");
      }
    },
    [
      dateFilter,
      entries,
      normalizedCustomRange,
      setEntries,
      setHighlightEntryId,
      setPendingScrollToId,
      setRules,
      showMovedToast
    ]
  );

  const handleDeleteTransaction = useCallback(
    (id: string) => {
      let undoPayload: UndoToastPayload | null = null;

      setEntries((prev) => {
        const deletedIndex = prev.findIndex((entry) => entry.id === id);
        if (deletedIndex === -1) {
          return prev;
        }

        undoPayload = {
          entry: prev[deletedIndex],
          index: deletedIndex
        };

        return prev.filter((entry) => entry.id !== id);
      });

      if (!undoPayload) {
        return;
      }

      undoToastPayloadRef.current = undoPayload;
      toast("Catatan dihapus.", {
        id: UNDO_TOAST_ID,
        duration: 6000,
        action: {
          label: "Urungkan",
          onClick: () => {
            const payload = undoToastPayloadRef.current;
            if (!payload) {
              return;
            }

            setEntries((prev) => {
              const next = [...prev];
              const insertIndex = Math.max(0, Math.min(payload.index, next.length));
              next.splice(insertIndex, 0, payload.entry);
              return next;
            });

            undoToastPayloadRef.current = null;
            toast.dismiss(UNDO_TOAST_ID);
            toast.success("Catatan dikembalikan.");
          }
        },
        onDismiss: () => {
          undoToastPayloadRef.current = null;
        },
        onAutoClose: () => {
          undoToastPayloadRef.current = null;
        }
      });
    },
    [setEntries]
  );

  const handleQuickAddSubmit = useCallback(() => {
    const submitStartedAt = performance.now();
    const parsed =
      quickPreview && debouncedQuickInput === quickInput
        ? quickPreview
        : parseQuickAdd(quickInput, new Date(), "quick_add");

    if (!parsed.ok) {
      setQuickError(parsed.reason || "Format catatan belum dikenali.");
      return;
    }

    const now = new Date().toISOString();
    const nextEntry: Entry = {
      id: createEntryId(),
      text: parsed.value.text,
      amount: parsed.value.amount,
      rawInput: parsed.value.rawInput,
      date: parsed.value.date,
      category: inferCategory(parsed.value.text, rules),
      paymentMethod: "Unknown",
      source: parsed.value.source,
      parseWarnings: parsed.warnings,
      split: makeInitialSplit(parsed.value.amount, parsed.value.splitCount),
      createdAt: now,
      updatedAt: now
    };

    setEntries((prev) => [nextEntry, ...prev]);
    setExpandedIds(new Set([nextEntry.id]));
    setHomePendingScrollId(nextEntry.id);
    setHighlightEntryId(nextEntry.id);
    setQuickInput("");
    setDebouncedQuickInput("");
    setQuickError(null);
    setShowQuickWarningDetails(false);
    setRecallInputPrimed(false);
    dismissRecallForSession();

    window.requestAnimationFrame(() => {
      quickInputRef.current?.focus();
      recordQuickAddAck(performance.now() - submitStartedAt);
    });

    toast.success("Catatan tersimpan.");
  }, [
    debouncedQuickInput,
    dismissRecallForSession,
    quickInput,
    quickPreview,
    rules,
    setHighlightEntryId,
    setDebouncedQuickInput,
    setEntries,
    setQuickError,
    setQuickInput,
    setRecallInputPrimed,
    setShowQuickWarningDetails
  ]);

  const handleCreateFromSheet = useCallback(
    (data: AddTransactionSubmitPayload) => {
      const normalizedPayment =
        data.payment && PAYMENT_METHODS.includes(data.payment as (typeof PAYMENT_METHODS)[number])
          ? (data.payment as Entry["paymentMethod"])
          : undefined;
      const title = data.title?.trim();
      const note = data.note.trim();
      const textTitle = title || data.category;
      const text = note ? `${textTitle} - ${note}` : textTitle;
      const normalizedQty = Math.max(1, Math.round(data.quantity ?? 1));
      const normalizedUnitAmount = Math.max(0, Math.round(data.unitAmount ?? data.amount));
      const splitCount = data.split?.shares?.length ?? 0;
      const splitToken = splitCount > 1 ? ` ${splitCount}p` : "";
      const rawInputLabel = title || note || data.category;
      const fallbackRawInput = `${rawInputLabel} ${normalizedQty > 1 ? `${normalizedQty}x ` : ""}${toParserAmountToken(normalizedUnitAmount)}${splitToken}`.trim();
      const rawInput = data.rawInput?.trim() || fallbackRawInput;
      const now = new Date().toISOString();

      const nextEntry: Entry = {
        id: createEntryId(),
        text,
        amount: data.amount,
        rawInput,
        date: data.date,
        category: data.category as Entry["category"],
        paymentMethod: normalizedPayment,
        source: "quick_add",
        split: data.split,
        createdAt: now,
        updatedAt: now
      };

      setEntries((prev) => [nextEntry, ...prev]);
      dismissRecallForSession();
      setRecallInputPrimed(false);
      toast.success("Catatan tersimpan.");
    },
    [dismissRecallForSession, setEntries, setRecallInputPrimed]
  );

  const handleSaveBulk = useCallback(() => {
    const validLines = bulkDraftLines.filter(
      (line): line is ParsedBulkLine & { parsed: Extract<ParseQuickAddResult, { ok: true }> } =>
        line.ok && Boolean(line.parsed)
    );
    if (!validLines.length) {
      return;
    }

    const timestamp = new Date().toISOString();
    const newEntries: Entry[] = validLines.map((line) => {
      const parsed = line.parsed;
      return {
        id: createEntryId(),
        text: parsed.value.text,
        amount: parsed.value.amount,
        rawInput: parsed.value.rawInput,
        date: parsed.value.date,
        category: inferCategory(parsed.value.text, rules),
        paymentMethod: "Unknown",
        source: "bulk_paste",
        parseWarnings: parsed.warnings,
        split: makeInitialSplit(parsed.value.amount, parsed.value.splitCount),
        createdAt: timestamp,
        updatedAt: timestamp
      };
    });

    setEntries((prev) => [...newEntries.reverse(), ...prev]);
    setBulkInput("");
    setIsBulkSheetOpen(false);
    dismissRecallForSession();
    setRecallInputPrimed(false);
    toast.success(`${newEntries.length} catatan berhasil ditambahkan.`);
  }, [bulkDraftLines, dismissRecallForSession, rules, setEntries, setRecallInputPrimed]);

  const handleExportJson = useCallback(() => {
    const payload = createBackupPayload(entries, rules, "kemana-web");
    downloadBackupFile(payload);
    setBackupMessage("Backup JSON berhasil diunduh.");
    toast.success("Backup JSON diunduh.");
  }, [entries, rules, setBackupMessage]);

  const handleExportCsv = useCallback(() => {
    downloadCsv(entries);
    setBackupMessage("Export CSV berhasil diunduh.");
    toast.success("Export CSV diunduh.");
  }, [entries, setBackupMessage]);

  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const rawText = await file.text();
        const raw = rawText.replace(/^\uFEFF/, "");
        const importMode = replaceOnImport ? "replace" : "merge";
        const normalizedName = file.name.trim().toLowerCase();
        const normalizedType = file.type.trim().toLowerCase();
        const trimmedRaw = raw.trim();
        const isLikelyCsvFile =
          normalizedType.includes("csv") ||
          normalizedName.endsWith(".csv") ||
          (!trimmedRaw.startsWith("{") && !trimmedRaw.startsWith("["));

        if (!isLikelyCsvFile) {
          const jsonResult = importBackupFromText({
            raw,
            currentEntries: entries,
            currentRules: rules,
            mode: importMode
          });

          if (jsonResult.ok) {
            setEntries(jsonResult.entries);
            setRules(jsonResult.rules);
            clearStorageHealthWarnings();
            setStorageWarning(null);
            setBackupMessage(jsonResult.message);
            toast.success(jsonResult.message);
            return;
          }
        }

        const csvResult = importEntriesFromCsv({
          raw,
          currentEntries: entries,
          mode: importMode
        });
        if (csvResult.ok) {
          setEntries(csvResult.entries);
          clearStorageHealthWarnings();
          setStorageWarning(null);
          setBackupMessage(csvResult.message);
          toast.success(csvResult.message);
          return;
        }

        const jsonFallback = importBackupFromText({
          raw,
          currentEntries: entries,
          currentRules: rules,
          mode: importMode
        });
        if (jsonFallback.ok) {
          setEntries(jsonFallback.entries);
          setRules(jsonFallback.rules);
          clearStorageHealthWarnings();
          setStorageWarning(null);
          setBackupMessage(jsonFallback.message);
          toast.success(jsonFallback.message);
          return;
        }

        const fallbackMessage = csvResult.message || jsonFallback.message || "Format file import belum didukung.";
        setBackupMessage(fallbackMessage);
        toast.error(fallbackMessage);
      } catch {
        const message = "Gagal membaca file import.";
        setBackupMessage(message);
        toast.error(message);
      }
    },
    [entries, replaceOnImport, rules, setBackupMessage, setEntries, setRules, setStorageWarning]
  );

  const markNightCloseDone = useCallback(
    (showConfirmation: boolean) => {
      const todayISO = getTodayISO();
      setNightCloseClosedAt(todayISO);
      writeNightCloseMarker(todayISO);
      setNightClosePanelOpen(false);
      if (showConfirmation) {
        setNightCloseConfirmation("Hari ditutup ✅");
      }
    },
    [setNightCloseClosedAt, setNightCloseConfirmation, setNightClosePanelOpen]
  );

  const handleNightCloseBarClose = useCallback(() => {
    markNightCloseDone(false);
  }, [markNightCloseDone]);

  const handleNightCloseDoneFromPanel = useCallback(() => {
    markNightCloseDone(true);
  }, [markNightCloseDone]);

  const handleNightCloseAddEntry = useCallback(() => {
    setNightClosePanelOpen(false);
    primeQuickInputForRecall({ dismissSession: false });
  }, [primeQuickInputForRecall, setNightClosePanelOpen]);

  const handleUseTopSuggestion = useCallback(() => {
    if (!topAdaptiveRecallItem) {
      return;
    }

    openAddSheet({
      category: topAdaptiveRecallItem.category,
      amount: topAdaptiveRecallItem.amount,
      title: topAdaptiveRecallItem.title,
      type: "expense"
    });
  }, [openAddSheet, topAdaptiveRecallItem]);

  const handleInsightPrimaryAction = useCallback(() => {
    primeQuickInputForRecall({ dismissSession: false });
  }, [primeQuickInputForRecall]);

  const handleInsightOpenNotes = useCallback(() => {
    setActiveTab("notes");
  }, []);

  const commonSheets = (
    <>
      <AddTransactionSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onSave={handleCreateFromSheet}
        prefill={sheetPrefill ?? undefined}
      />
      <BulkInputSheet
        isOpen={isBulkSheetOpen}
        onClose={() => setIsBulkSheetOpen(false)}
        input={bulkInput}
        onInputChange={setBulkInput}
        preview={bulkPreview}
        validCount={validBulkCount}
        onSave={handleSaveBulk}
      />
      <DataToolsSheet
        isOpen={isDataToolsSheetOpen}
        onClose={() => setIsDataToolsSheetOpen(false)}
        replaceOnImport={replaceOnImport}
        onReplaceOnImportChange={setReplaceOnImport}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
        onImportFile={handleImportFile}
        importMessage={backupMessage}
      />
      <NightCloseReviewSheet
        isOpen={nightClosePanelOpen}
        dateLabel={`Hari ini • ${nightCloseDateLabel}`}
        total={nightCloseTodayStats.total}
        count={nightCloseTodayStats.count}
        topCategory={nightCloseTopCategory}
        promptLine={nightCloseCopy.promptLine}
        onClose={() => setNightClosePanelOpen(false)}
        onDone={handleNightCloseDoneFromPanel}
        onAddEntry={handleNightCloseAddEntry}
      />
      <NameOnboardingSheet
        isOpen={isNamePromptOpen}
        value={nameDraft}
        onValueChange={setNameDraft}
        onSave={handleSaveUserName}
        canSave={canSaveName}
      />
    </>
  );

  if (activeTab === "insight") {
    return (
      <ScreenContainer withBottomNav>
        <TopAppBar title="Insight" />

        <main className="flex flex-col gap-3 px-4 py-2">
          <div className="sticky top-[calc(var(--safe-header-offset)+74px)] z-20 bg-bg-base/94 pb-2 pt-1 backdrop-blur-md">
            <DateRangeFilter
              value={dateFilter}
              onChange={handleDateFilterChange}
              customRange={normalizedCustomRange}
              onCustomRangeChange={handleCustomDateRangeChange}
            />
          </div>

          <section className="rounded-[24px] border border-border-subtle bg-bg-elevated p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-bg-subtle px-3 py-1 text-[11px] font-semibold text-text-secondary">
                {insightSevenDay.periodLabel}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  insightTrendBadge.tone === "up"
                    ? "bg-warning-soft text-warning"
                    : insightTrendBadge.tone === "down"
                      ? "bg-success-soft text-success"
                      : "bg-bg-subtle text-text-secondary"
                )}
              >
                {insightTrendBadge.tone === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : insightTrendBadge.tone === "down" ? (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                ) : (
                  <PieChart className="h-3.5 w-3.5" />
                )}
                {insightTrendBadge.label}
              </span>
            </div>

            <p className="mt-4 text-[13px] font-medium text-text-secondary">Pengeluaranmu</p>
            <p className="mt-1 text-[42px] font-bold leading-none tracking-tight text-text-primary">
              Rp{formatAmountIDR(insightSevenDay.total)}
            </p>
            <p className="mt-2 text-[12px] font-medium text-text-secondary">
              {insightSevenDay.hasData
                ? `${insightSevenDay.periodLabel} kamu mencatat ${insightSevenDay.entryCount} transaksi.`
                : `Belum ada catatan untuk dianalisis di ${insightSevenDay.periodLabel.toLowerCase()}.`}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2">
                <p className="text-[11px] font-medium text-text-tertiary">Catatan</p>
                <p className="mt-1 text-[16px] font-bold text-text-primary">{insightSevenDay.entryCount}</p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2">
                <p className="text-[11px] font-medium text-text-tertiary">Hari aktif</p>
                <p className="mt-1 text-[16px] font-bold text-text-primary">
                  {insightSevenDay.windowDays
                    ? `${insightSevenDay.activeDays}/${insightSevenDay.windowDays}`
                    : `${insightSevenDay.activeDays} hari`}
                </p>
              </div>
              <div className="col-span-2 rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2 sm:col-span-1">
                <p className="text-[11px] font-medium text-text-tertiary">
                  {insightSevenDay.windowDays ? "Rata-rata/hari" : "Rata-rata/hari aktif"}
                </p>
                <p className="mt-1 text-[15px] font-bold leading-tight text-text-primary sm:text-[16px]">
                  {insightAverageAmountLabel}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-border-subtle bg-bg-elevated px-4 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                <CircleHelp className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-[16px] font-bold text-text-primary">Kenapa segitu?</h3>
            </div>

            {insightWhyCards.length ? (
              <div className="mt-3 flex flex-col gap-2.5">
                {insightWhyCards.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{item.label}</p>
                      <p className="mt-1 text-[14px] font-semibold text-text-primary">{item.value}</p>
                    </div>
                    <p className="text-right text-[11px] font-medium text-text-secondary">{item.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border-subtle bg-bg-subtle px-3 py-3 text-[12px] font-medium text-text-secondary">
                Belum cukup data untuk jelasin penyebab pengeluaranmu.
              </p>
            )}
          </section>

          <section className="rounded-[20px] border border-border-subtle bg-bg-elevated px-4 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Flame className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-[16px] font-bold text-text-primary">Dari mana paling banyak keluar</h3>
            </div>

            {insightSevenDay.topCategories.length ? (
              <div className="mt-3 flex flex-col gap-2.5">
                {insightSevenDay.topCategories.map((item) => (
                  <div key={item.category} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-text-primary">{item.category}</span>
                      <span className="text-[12px] font-medium text-text-secondary">
                        Rp{formatAmountIDR(item.amount)} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-subtle">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(8, item.percentage)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border-subtle bg-bg-subtle px-3 py-3 text-[12px] font-medium text-text-secondary">
                Belum ada pengeluaran untuk ditampilkan.
              </p>
            )}
          </section>

          <section className="rounded-[20px] border border-border-subtle bg-bg-elevated px-4 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                <CalendarDays className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-[16px] font-bold text-text-primary">Tren 4 pekan</h3>
            </div>
            <p className="mt-1 text-[12px] font-medium text-text-secondary">
              Biar kamu bisa lihat ritme pengeluaran naik/turun dari minggu ke minggu.
            </p>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {insightWeeklySeries.map((week, index) => {
                const isLatest = index === insightWeeklySeries.length - 1;
                const height = insightMaxWeekTotal
                  ? Math.max(16, Math.round((week.total / insightMaxWeekTotal) * 100))
                  : 16;

                return (
                  <div key={week.label} className="flex min-w-0 flex-col items-center gap-2">
                    <div className="flex h-28 w-full items-end rounded-xl bg-bg-subtle/80 px-1.5 pb-1.5">
                      <div
                        className={cn(
                          "w-full rounded-lg transition-[height]",
                          isLatest ? "bg-brand shadow-[0_4px_14px_rgba(37,99,235,0.24)]" : "bg-brand/35"
                        )}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-center text-[10px] font-semibold text-text-secondary">{week.label}</span>
                    <span
                      className={cn(
                        "text-center text-[10px] font-semibold",
                        isLatest ? "text-brand" : "text-text-tertiary"
                      )}
                    >
                      Rp{formatAmountCompact(week.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[20px] border border-border-subtle bg-bg-elevated px-4 py-3.5">
            <h3 className="text-[16px] font-bold text-text-primary">
              Transaksi terbesar {insightSevenDay.periodLabel.toLowerCase()}
            </h3>
            {insightSevenDay.largestEntries.length ? (
              <div className="mt-3 flex flex-col gap-2.5">
                {insightSevenDay.largestEntries.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-text-primary">{item.title}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-text-secondary">
                        {item.dateLabel} • {item.category} • {item.paymentMethod}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-bold text-text-primary">Rp{formatAmountIDR(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border-subtle bg-bg-subtle px-3 py-3 text-[12px] font-medium text-text-secondary">
                Belum ada transaksi yang bisa dirangkum.
              </p>
            )}
          </section>

          <section className="rounded-[20px] border border-border-subtle bg-bg-elevated px-4 py-3.5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <CreditCard className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold leading-snug text-text-primary">{insightCoachCopy.title}</h3>
                <p className="mt-1 text-[12px] font-medium leading-relaxed text-text-secondary">
                  {insightCoachCopy.subtitle}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleInsightPrimaryAction}
                className="min-h-10 w-full rounded-lg bg-brand px-3.5 py-2 text-center text-[12px] font-semibold leading-tight text-white shadow-sm transition-colors hover:bg-brand-pressed"
              >
                {insightCoachCopy.primaryLabel}
              </button>
              <button
                type="button"
                onClick={handleInsightOpenNotes}
                className="min-h-10 w-full rounded-lg border border-border-subtle bg-bg-subtle px-3.5 py-2 text-center text-[12px] font-semibold leading-tight text-text-secondary transition-colors hover:border-brand hover:text-brand"
              >
                {insightCoachCopy.secondaryLabel}
              </button>
            </div>
          </section>
        </main>

        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {commonSheets}
      </ScreenContainer>
    );
  }

  if (activeTab === "notes") {
    return (
      <ScreenContainer withBottomNav withFab>
        <TopAppBar
          title="Catatan"
          actionIcon={<Settings className="h-5 w-5" />}
          onActionClick={() => setIsDataToolsSheetOpen(true)}
        />

        <div className="px-4 py-2">
          {storageWarning ? (
            <div className="mb-3 rounded-xl border border-danger/20 bg-danger-soft/60 px-3 py-2 text-[12px] font-medium text-danger">
              {storageWarning}
            </div>
          ) : null}

          <DateRangeFilter
            value={dateFilter}
            onChange={handleDateFilterChange}
            customRange={normalizedCustomRange}
            onCustomRangeChange={handleCustomDateRangeChange}
            className="mb-2"
          />

          <div className="mb-3 mt-2 rounded-[16px] bg-bg-card px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-text-secondary">{summaryStats.periodLabel}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  summaryStats.status.tone === "boros"
                    ? "bg-danger-soft text-danger"
                    : summaryStats.status.tone === "lumayan"
                      ? "bg-warning-soft text-warning"
                      : "bg-bg-subtle text-text-secondary"
                )}
              >
                {summaryStats.status.label}
              </span>
            </div>
            <div className="mt-1 text-[22px] font-bold tracking-tight text-text-primary">
              Rp{formatAmountIDR(summaryStats.totalAmount)}
            </div>
            <div className="mt-1 text-[12px] font-medium text-text-secondary">{summaryStats.compareText}</div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsBulkSheetOpen(true)}
              className="h-10 rounded-xl border border-border-subtle bg-bg-elevated text-[13px] font-semibold text-text-primary transition-colors hover:border-brand hover:text-brand"
            >
              Catat banyak
            </button>
            <button
              type="button"
              onClick={() => setIsDataToolsSheetOpen(true)}
              className="h-10 rounded-xl border border-border-subtle bg-bg-elevated text-[13px] font-semibold text-text-primary transition-colors hover:border-brand hover:text-brand"
            >
              Data & tools
            </button>
          </div>

          <div className="flex flex-col gap-5 pb-[calc(124px+env(safe-area-inset-bottom))]">
            {orderedDates.map((dateString) => (
              <div key={dateString} className="flex flex-col gap-2">
                <div className="sticky top-[calc(var(--safe-header-offset)+74px)] z-10 flex items-center justify-between gap-2 bg-bg-base/94 pb-2 pt-3 backdrop-blur-md">
                  <span className="text-[14px] font-bold text-text-primary">{formatDayLabel(dateString)}</span>
                  <span className="text-[12px] font-medium text-text-secondary">
                    Rp{formatAmountIDR(dailyTotal[dateString] ?? 0)}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {(groupedEntries[dateString] ?? []).map((entry) => {
                    const transaction = toTransactionItem(entry);
                    const highlighted = highlightEntryId === transaction.id || pendingScrollToId === transaction.id;

                    return (
                      <div
                        key={transaction.id}
                        data-entry-id={transaction.id}
                        ref={(element) => {
                          itemRefs.current.set(transaction.id, element);
                        }}
                        className={cn(
                          highlighted
                            ? "animate-in fade-in zoom-in rounded-[16px] ring-2 ring-brand duration-300"
                            : ""
                        )}
                      >
                        <TransactionCard
                          item={transaction}
                          isExpanded={expandedIds.has(transaction.id)}
                          onToggleExpand={() => handleToggleExpand(transaction.id)}
                          inferCategory={inferCategoryFromText}
                          onSave={handleSaveTransaction}
                          onDelete={handleDeleteTransaction}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredTransactions.length === 0 ? (
              <div className="animate-in fade-in rounded-2xl border border-dashed border-border-subtle bg-bg-elevated px-4 py-10 text-center">
                <p className="text-[14px] font-semibold text-text-primary">
                  {summaryStats.emptyState?.title ?? "Belum ada catatan."}
                </p>
                <p className="mt-1 text-[12px] font-medium text-text-secondary">
                  {summaryStats.emptyState?.subtitle ?? "Mulai dari input cepat atau tombol Catat."}
                </p>
              </div>
            ) : null}

            {notesHasMore ? (
              <div
                ref={notesLoadMoreRef}
                className="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2 text-center text-[12px] font-medium text-text-secondary"
              >
                Memuat catatan lainnya...
              </div>
            ) : null}

            {shouldVirtualizeNotes && filteredEntries.length > 0 ? (
              <div className="text-center text-[11px] font-medium text-text-tertiary">
                Menampilkan {notesVirtualizationPlan.visibleCount} dari {filteredEntries.length} catatan
              </div>
            ) : null}
          </div>
        </div>

        <FabAddButton
          onClick={() => openAddSheet()}
          className={cn(
            "duration-200",
            shouldHideFab ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100"
          )}
        />
        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {commonSheets}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withBottomNav withFab>
      <TopAppBar
        title="KeMana"
        subtitle={homeGreetingSubtitle}
        actionIcon={isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        onActionClick={toggleTheme}
      />

      <main className="flex flex-col gap-5 px-4 py-2">
        {storageWarning ? (
          <div className="rounded-xl border border-danger/20 bg-danger-soft/60 px-3 py-2 text-[12px] font-medium text-danger">
            {storageWarning}
          </div>
        ) : null}

        <SummaryHeroCard
          expense={summaryStats.totalAmount}
          transactionCount={summaryStats.entryCount}
          averagePerDay={summaryStats.sevenDayAverage}
          periodLabel={summaryStats.periodLabel}
        >
          <div className="relative overflow-hidden rounded-[20px] border border-insight-border bg-insight-bg p-4">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/20 blur-2xl" />

            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-widest text-insight-header">Insight hari ini</span>
              <button
                onClick={() => setActiveTab("insight")}
                className="flex items-center gap-1 text-[12px] font-semibold text-brand transition-opacity hover:opacity-80"
              >
                Detail
                <PieChart className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative z-10 mt-2 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-insight-icon-bg shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <span className="text-[20px]">📌</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold leading-tight text-insight-title">{summaryStats.status.label}</span>
                <span className="text-[13px] font-medium leading-snug text-insight-subtitle">{summaryStats.compareText}</span>
              </div>
            </div>

            <div className="relative z-10 mt-3 flex items-center justify-between border-t border-insight-border pt-3">
              <span className="text-[12px] font-medium text-insight-subtitle">Kategori terbesar:</span>
              <div className="flex items-center gap-1.5 rounded-full border border-insight-chip-text/10 bg-insight-chip-bg px-3 py-1">
                <span className="text-[12px] font-bold text-insight-chip-text">
                  {summaryStats.topCategory
                    ? `${summaryStats.topCategory.category} (${Math.max(
                        1,
                        Math.round((summaryStats.topCategory.totalAmount / Math.max(1, summaryStats.totalAmount)) * 100)
                      )}%)`
                    : "Belum ada"}
                </span>
              </div>
            </div>
          </div>
        </SummaryHeroCard>

        <div className="overflow-hidden rounded-[20px] bg-bg-card p-1.5 shadow-sm ring-1 ring-border-subtle transition-shadow focus-within:ring-2 focus-within:ring-brand/50">
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 sm:gap-2">
            <input
              ref={quickInputRef}
              type="text"
              value={quickInput}
              placeholder={quickInputPlaceholder}
              className="min-w-0 w-full flex-1 bg-transparent px-2.5 py-2.5 text-[15px] font-medium outline-none placeholder:text-[14px] placeholder:text-text-secondary/70 sm:px-3 sm:placeholder:text-[15px]"
              onChange={(event) => {
                setQuickInput(event.target.value);
                setQuickError(null);
                setShowQuickWarningDetails(false);
              }}
              onBlur={() => {
                if (!quickInput.trim()) {
                  setRecallInputPrimed(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleQuickAddSubmit();
                }
              }}
            />
            <button
              className="h-10 min-w-[62px] shrink-0 rounded-[12px] bg-brand/10 px-2.5 text-[12px] font-semibold text-brand transition-all hover:bg-brand hover:text-white active:scale-95 sm:h-11 sm:min-w-[80px] sm:rounded-[14px] sm:px-4 sm:text-[13px]"
              onClick={handleQuickAddSubmit}
            >
              Catat
            </button>
            <button
              type="button"
              aria-label="Catat banyak"
              className="h-10 min-w-[68px] shrink-0 rounded-[12px] border border-border-subtle bg-bg-elevated px-2.5 text-[12px] font-semibold text-text-secondary transition-colors hover:border-brand hover:text-brand active:scale-95 sm:h-11 sm:min-w-[88px] sm:rounded-[14px] sm:px-3 sm:text-[13px]"
              onClick={() => setIsBulkSheetOpen(true)}
            >
              Banyak
            </button>
          </div>
        </div>

        {showQuickFormatTemplates ? (
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Format cepat</span>
              <span className="text-[11px] font-medium text-text-tertiary">Geser, lalu tap untuk pakai</span>
            </div>
            <div className="relative -mx-4">
              <div className="flex gap-2 overflow-x-auto pl-4 pr-0 pb-1 scrollbar-hide">
                {quickFormatTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleApplyQuickFormatTemplate(template.sample)}
                    className="shrink-0 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1.5 text-[12px] font-semibold text-text-secondary transition-colors hover:border-brand hover:text-brand"
                    aria-label={`${template.description}: ${template.sample}`}
                  >
                    {template.sample}
                  </button>
                ))}
              </div>
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg-base via-bg-base/70 to-transparent"
                aria-hidden
              />
            </div>
          </section>
        ) : null}

        {quickHistorySuggestions.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Saran cepat</span>
            {quickHistorySuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleApplyQuickHistorySuggestion(suggestion)}
                className="rounded-full border border-border-subtle bg-bg-elevated px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:border-brand hover:text-brand"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {smartRecallPrompt ? (
          <section className="rounded-2xl border border-border-subtle bg-bg-elevated px-3.5 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Clock3 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <LastEntryGapIndicator lastEntryAt={lastEntryAt} />
                <p className="mt-1 text-[14px] font-semibold leading-snug text-text-primary">{smartRecallPrompt.title}</p>
                <p className="mt-0.5 text-[12px] font-medium text-text-secondary">
                  {smartRecallPrompt.subtitle ??
                    (latestEntryInsight
                      ? `Terakhir: ${latestEntryInsight.title} • Rp${formatAmountIDR(latestEntryInsight.amount)}`
                      : "Coba catat lagi supaya saran makin akurat.")}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleRecallDismiss}
                className="rounded-lg border border-border-subtle bg-bg-base px-3 py-1.5 text-[12px] font-semibold text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={handleRecallAddRecent}
                className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-pressed"
              >
                Tambah lagi
              </button>
            </div>
          </section>
        ) : null}

        {showSuggestionCard && topAdaptiveRecallItem ? (
          <section className="rounded-2xl border border-border-subtle bg-bg-elevated px-3.5 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <WandSparkles className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Saran</p>
                <p className="mt-1 text-[14px] font-semibold leading-snug text-text-primary">
                  {topAdaptiveRecallItem.title} sekitar Rp{formatAmountIDR(topAdaptiveRecallItem.amount)}.
                </p>
              </div>
              <button
                type="button"
                onClick={handleUseTopSuggestion}
                className="shrink-0 rounded-full border border-border-subtle bg-bg-base px-3 py-1.5 text-[12px] font-semibold text-text-secondary transition-colors hover:border-brand hover:text-brand"
              >
                Pakai
              </button>
            </div>
          </section>
        ) : null}

        {quickPreview?.ok ? (
          <div className="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2.5">
            <div className="text-[13px] font-semibold text-text-primary">
              {quickPreviewTextParts?.title ?? quickPreview.value.text} • Rp{formatAmountIDR(quickPreview.value.amount)}
            </div>
            <div className="mt-0.5 text-[12px] font-medium text-text-secondary">
              {quickPreview.value.date}
              {quickPreview.value.splitCount ? ` • ${quickPreview.value.splitCount} orang` : ""}
              {summedAmountMeta ? ` • total ${summedAmountMeta.parts} item` : ""}
            </div>
            {quickPreviewTextParts?.subtitle ? (
              <div className="mt-1 text-[12px] font-medium text-text-secondary">{quickPreviewTextParts.subtitle}</div>
            ) : null}
            {quickPreviewSubtitleBreakdown?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickPreviewSubtitleBreakdown.slice(0, 5).map((item, index) => (
                  <span
                    key={`${item.raw}-${index}`}
                    className="rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                  >
                    {item.label}
                    {item.qty ? ` ×${item.qty}` : ""}
                    {item.amount !== undefined ? ` • Rp${formatAmountIDR(item.amount)}` : ""}
                  </span>
                ))}
                {quickPreviewSubtitleBreakdown.length > 5 ? (
                  <span className="rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 text-[11px] font-medium text-text-tertiary">
                    +{quickPreviewSubtitleBreakdown.length - 5} item
                  </span>
                ) : null}
              </div>
            ) : quickPreviewSubtitleItems?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickPreviewSubtitleItems.slice(0, 4).map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {quickPreview.warnings?.length ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowQuickWarningDetails((prev) => !prev)}
                  className="mt-2 text-[12px] font-semibold text-brand"
                >
                  {showQuickWarningDetails ? "Sembunyikan" : "Lihat"} peringatan parser
                </button>
                {showQuickWarningDetails ? (
                  <ul className="mt-1 list-disc pl-4 text-[12px] font-medium text-text-secondary">
                    {quickPreview.warnings.map((warning, index) => (
                      <li key={`${warning.code}-${index}`}>{warningShortText(warning)}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {adaptiveHints.length && !showQuickFormatTemplates ? (
          <div className="rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2 text-[12px] font-medium text-text-secondary">
            {adaptiveHints[0]}
          </div>
        ) : null}

        {quickError ? (
          <div className="rounded-xl border border-danger/20 bg-danger-soft/60 px-3 py-2 text-[12px] font-medium text-danger">
            {quickError}
          </div>
        ) : null}

        <QuickRecallChips
          items={
            adaptiveRecallItems.length
              ? adaptiveRecallItems
              : [
                  { id: "r1", category: "Makan", title: "Nasi padang", amount: 25_000 },
                  { id: "r2", category: "Transport", title: "Gojek kantor", amount: 14_000 }
                ]
          }
          onSelect={(item) =>
            openAddSheet({
              category: item.category,
              amount: item.amount,
              title: item.title,
              type: "expense"
            })
          }
        />

        {showNightCloseBar ? (
          <ContextBanner
            variant="nightClose"
            title="Tutup hari ini"
            subtitle={nightCloseCopy.subtitle}
            actionLabel="Review sekarang"
            secondaryActionLabel="Tutup"
            className="dark:border dark:border-brand/20 dark:bg-brand-soft/20"
            onAction={() => setNightClosePanelOpen(true)}
            onSecondaryAction={handleNightCloseBarClose}
          />
        ) : null}

        {nightCloseConfirmation ? (
          <div className="rounded-xl border border-success/20 bg-success-soft px-3 py-2 text-[12px] font-semibold text-success">
            {nightCloseConfirmation}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <h3 className="text-[16px] font-bold text-text-primary">Aktivitas terbaru</h3>
          <div className="flex flex-col gap-3">
            {allTransactions.slice(0, 5).map((transaction) => (
              <div
                key={transaction.id}
                data-home-entry-id={transaction.id}
                ref={(element) => {
                  homeItemRefs.current.set(transaction.id, element);
                }}
                className={cn(
                  highlightEntryId === transaction.id || homePendingScrollId === transaction.id
                    ? "animate-in fade-in zoom-in rounded-[16px] ring-2 ring-brand duration-300"
                    : ""
                )}
              >
                <TransactionCard
                  item={transaction}
                  isExpanded={expandedIds.has(transaction.id)}
                  onToggleExpand={() => handleToggleExpand(transaction.id)}
                  inferCategory={inferCategoryFromText}
                  onSave={handleSaveTransaction}
                  onDelete={handleDeleteTransaction}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className="h-11 w-full rounded-xl bg-brand text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-pressed"
          >
            Lihat semua catatan
          </button>
        </div>

        <div className="h-10" aria-hidden />
      </main>

      <FabAddButton
        onClick={() => openAddSheet()}
        className={cn(
          "duration-200",
          shouldHideFab ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100"
        )}
      />
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      {commonSheets}
    </ScreenContainer>
  );
}
