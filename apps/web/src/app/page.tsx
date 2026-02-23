"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Settings, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import ScreenContainer from "@/components/kemana-ui/ScreenContainer";
import TopAppBar from "@/components/kemana-ui/TopAppBar";
import BottomTabBar from "@/components/kemana-ui/BottomTabBar";
import FabAddButton from "@/components/kemana-ui/FabAddButton";
import DateRangeFilter from "@/components/kemana-ui/DateRangeFilter";
import type { QuickRecallItem } from "@/components/kemana-ui/QuickRecallChips";
import type { TransactionItem } from "@/components/kemana-ui/TransactionCard";
import type { AddTransactionSubmitPayload } from "@/components/kemana-ui/AddTransactionSheet";
import type { BulkPreviewLine } from "@/components/kemana-ui/BulkInputSheet";
import DashboardSheets from "@/components/kemana-ui/DashboardSheets";
import InsightTabContent from "@/components/kemana-ui/InsightTabContent";
import NotesTabContent from "@/components/kemana-ui/NotesTabContent";
import HomeTabContent from "@/components/kemana-ui/HomeTabContent";
import { formatAmountCompact, formatAmountIDR } from "@kemana/core/format";
import { parseQuickAdd } from "@kemana/core/parser";
import { inferCategory, updateCategoryRule } from "@kemana/core/rules";
import { PAYMENT_METHODS, type Category } from "@kemana/core/types";
import type { Entry, ParseQuickAddResult } from "@kemana/core/types";
import { useDashboardStoreBindings } from "@/store/kemana/hooks";
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
  normalizeCustomDateRange,
  offsetDate,
  parseItemBreakdownFromSubtitle,
  splitDisplayText,
  splitSubtitleItems,
  sumAmount,
  toDateKey,
  warningShortText,
  generateTrendSeries,
  getTrendGranularity,
  getTrendTitle,
  getTrendSubtitle
} from "@/lib/kemana-utils";
import {
  deriveNotesVirtualizationPlan,
  deriveAdaptiveHint,
  deriveAdaptiveRecallItems,
  deriveInsightCoachCopy,
  deriveInsightSummary,
  deriveInsightTrendBadge,
  deriveInsightWhyCards,
  deriveLatestEntryInsight,
  deriveQuickHistorySuggestions,
  deriveQuickFormatTemplates,
  getQuickInputPlaceholder,
  getInitialNotesRenderCount,
  getNextNotesRenderCount
} from "@/lib/dashboard-page-utils";
import {
  createEntryId,
  persistThemeMode,
  resolveThemeModeFromStorage,
  toParserAmountToken,
  type ThemeMode
} from "@/lib/dashboard-page-helpers";
import {
  downloadCsv,
  importEntriesFromCsv,
  toTransactionItem
} from "@/lib/dashboard-page-entry-utils";
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
const NOTES_VIRTUALIZE_THRESHOLD = 1000;
const NOTES_RENDER_CHUNK = 220;

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("home");
  const {
    entries,
    setEntries,
    rules,
    setRules,
    isStorageReady,
    setIsStorageReady,
    storageWarning,
    setStorageWarning,
    backupMessage,
    setBackupMessage,
    replaceOnImport,
    setReplaceOnImport,
    dateFilter,
    setDateFilter,
    pendingScrollToId,
    setPendingScrollToId,
    highlightEntryId,
    setHighlightEntryId,
    quickInput,
    setQuickInput,
    debouncedQuickInput,
    setDebouncedQuickInput,
    quickError,
    setQuickError,
    showQuickWarningDetails,
    setShowQuickWarningDetails,
    recallInputPrimed,
    setRecallInputPrimed,
    bulkOpen,
    setBulkOpen,
    bulkInput,
    setBulkInput,
    lastAppOpenAt,
    setLastAppOpenAt,
    recallDismissedInSession,
    setRecallDismissedInSession,
    isRecallSessionReady,
    setIsRecallSessionReady,
    nightCloseClosedAt,
    setNightCloseClosedAt,
    isNightCloseReady,
    setIsNightCloseReady,
    nightClosePanelOpen,
    setNightClosePanelOpen,
    nightCloseConfirmation,
    setNightCloseConfirmation
  } = useDashboardStoreBindings();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [sheetPrefill, setSheetPrefill] = useState<Partial<AddTransactionSubmitPayload> | null>(null);
  const [isDataToolsSheetOpen, setIsDataToolsSheetOpen] = useState(false);
  const [homePendingScrollId, setHomePendingScrollId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
  const [notesRenderCount, setNotesRenderCount] = useState(NOTES_RENDER_CHUNK);
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(() => getDefaultCustomDateRange());
  const [isTrendChartOverflowing, setIsTrendChartOverflowing] = useState(false);

  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const homeItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const notesLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const insightTrendScrollRef = useRef<HTMLDivElement | null>(null);
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

  const insightTrendSeries = useMemo(() => {
    return generateTrendSeries(entries, dateFilter, normalizedCustomRange, new Date());
  }, [entries, dateFilter, normalizedCustomRange]);

  const trendGranularity = useMemo(() => {
    return getTrendGranularity(dateFilter, normalizedCustomRange, new Date());
  }, [dateFilter, normalizedCustomRange]);

  const trendTitle = useMemo(() => {
    return getTrendTitle(dateFilter, trendGranularity, normalizedCustomRange, new Date());
  }, [dateFilter, trendGranularity, normalizedCustomRange]);

  const trendSubtitle = useMemo(() => {
    return getTrendSubtitle(trendGranularity);
  }, [trendGranularity]);

  const insightMaxTrendTotal = useMemo(
    () => Math.max(...insightTrendSeries.map((item) => item.total), 0),
    [insightTrendSeries]
  );
  const insightTrendSeriesDisplay = useMemo(
    () => [...insightTrendSeries].reverse(),
    [insightTrendSeries]
  );
  const trendCompactSlotCount = useMemo(
    () => Math.max(2, insightTrendSeriesDisplay.length),
    [insightTrendSeriesDisplay.length]
  );
  const trendCompactItemWidth = useMemo(
    () => `min(72px, max(56px, calc((100% - ${(trendCompactSlotCount - 1) * 10}px) / ${trendCompactSlotCount})))`,
    [trendCompactSlotCount]
  );

  useEffect(() => {
    if (activeTab !== "insight") {
      setIsTrendChartOverflowing(false);
      return;
    }

    const node = insightTrendScrollRef.current;
    if (!node) {
      setIsTrendChartOverflowing(false);
      return;
    }

    const updateOverflowState = () => {
      setIsTrendChartOverflowing(node.scrollWidth - node.clientWidth > 4);
    };

    updateOverflowState();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateOverflowState);
      resizeObserver.observe(node);
    } else {
      window.addEventListener("resize", updateOverflowState);
    }

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateOverflowState);
    };
  }, [activeTab, insightTrendSeries]);

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
    return getQuickInputPlaceholder({
      hasSmartRecallPrompt: Boolean(smartRecallPrompt),
      recallInputPrimed
    });
  }, [recallInputPrimed, smartRecallPrompt]);

  const quickHistorySuggestions = useMemo(() => {
    return deriveQuickHistorySuggestions(entries, quickInput);
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
    return deriveAdaptiveRecallItems(entries);
  }, [entries]);

  const topAdaptiveRecallItem = useMemo(() => adaptiveRecallItems[0] ?? null, [adaptiveRecallItems]);

  const adaptiveHint = useMemo(() => {
    return deriveAdaptiveHint(topAdaptiveRecallItem);
  }, [topAdaptiveRecallItem]);

  const showSuggestionCard = Boolean(smartRecallPrompt && topAdaptiveRecallItem);

  const latestEntryInsight = useMemo(() => {
    return deriveLatestEntryInsight(entries);
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
    isAddSheetOpen || bulkOpen || isDataToolsSheetOpen || nightClosePanelOpen || isNamePromptOpen;
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

  const handleQuickInputChange = useCallback(
    (next: string) => {
      setQuickInput(next);
      setQuickError(null);
      setShowQuickWarningDetails(false);
    },
    [setQuickError, setQuickInput, setShowQuickWarningDetails]
  );

  const handleQuickInputBlur = useCallback(() => {
    if (!quickInput.trim()) {
      setRecallInputPrimed(false);
    }
  }, [quickInput, setRecallInputPrimed]);

  const handleToggleQuickWarningDetails = useCallback(() => {
    setShowQuickWarningDetails((prev) => !prev);
  }, [setShowQuickWarningDetails]);

  const handleSelectQuickRecallItem = useCallback(
    (item: QuickRecallItem) => {
      openAddSheet({
        category: item.category,
        amount: item.amount,
        title: item.title,
        type: "expense"
      });
    },
    [openAddSheet]
  );

  const handleOpenInsightTab = useCallback(() => {
    setActiveTab("insight");
  }, []);

  const handleOpenNotesTab = useCallback(() => {
    setActiveTab("notes");
  }, []);

  const handleOpenNightCloseReview = useCallback(() => {
    setNightClosePanelOpen(true);
  }, [setNightClosePanelOpen]);

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
    setBulkOpen(false);
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

  const dashboardSheets = (
    <>
      <DashboardSheets
        isAddSheetOpen={isAddSheetOpen}
        onCloseAddSheet={() => setIsAddSheetOpen(false)}
        onSaveAddSheet={handleCreateFromSheet}
        sheetPrefill={sheetPrefill ?? undefined}
        isBulkSheetOpen={bulkOpen}
        onCloseBulkSheet={() => setBulkOpen(false)}
        bulkInput={bulkInput}
        onBulkInputChange={setBulkInput}
        bulkPreview={bulkPreview}
        validBulkCount={validBulkCount}
        onSaveBulk={handleSaveBulk}
        isDataToolsSheetOpen={isDataToolsSheetOpen}
        onCloseDataToolsSheet={() => setIsDataToolsSheetOpen(false)}
        replaceOnImport={replaceOnImport}
        onReplaceOnImportChange={setReplaceOnImport}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
        onImportFile={handleImportFile}
        importMessage={backupMessage}
        isNightCloseSheetOpen={nightClosePanelOpen}
        nightCloseDateLabel={`Hari ini • ${nightCloseDateLabel}`}
        nightCloseTotal={nightCloseTodayStats.total}
        nightCloseCount={nightCloseTodayStats.count}
        nightCloseTopCategory={nightCloseTopCategory}
        nightClosePromptLine={nightCloseCopy.promptLine}
        onCloseNightCloseSheet={() => setNightClosePanelOpen(false)}
        onDoneNightClose={handleNightCloseDoneFromPanel}
        onAddNightCloseEntry={handleNightCloseAddEntry}
        isNamePromptOpen={isNamePromptOpen}
        nameDraft={nameDraft}
        onNameDraftChange={setNameDraft}
        onSaveUserName={handleSaveUserName}
        canSaveName={canSaveName}
      />
    </>
  );

  if (activeTab === "insight") {
    return (
      <ScreenContainer withBottomNav>
        <TopAppBar title="Insight" />

        <main className="flex flex-col gap-3 px-4 py-2">
          <div className="sticky top-[calc(var(--safe-header-offset,env(safe-area-inset-top))+74px)] z-20 bg-bg-base/94 pb-2 pt-1 backdrop-blur-md">
            <DateRangeFilter
              value={dateFilter}
              onChange={handleDateFilterChange}
              customRange={normalizedCustomRange}
              onCustomRangeChange={handleCustomDateRangeChange}
            />
          </div>

          <InsightTabContent
            insightSevenDay={insightSevenDay}
            insightTrendBadge={insightTrendBadge}
            insightAverageAmountLabel={insightAverageAmountLabel}
            insightWhyCards={insightWhyCards}
            trendTitle={trendTitle}
            trendSubtitle={trendSubtitle}
            isTrendChartOverflowing={isTrendChartOverflowing}
            insightTrendScrollRef={insightTrendScrollRef}
            insightTrendSeriesDisplay={insightTrendSeriesDisplay}
            insightMaxTrendTotal={insightMaxTrendTotal}
            trendCompactItemWidth={trendCompactItemWidth}
            insightCoachCopy={insightCoachCopy}
            onPrimaryAction={handleInsightPrimaryAction}
            onOpenNotes={handleInsightOpenNotes}
          />
        </main>

        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {dashboardSheets}
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

        <NotesTabContent
          storageWarning={storageWarning}
          dateFilter={dateFilter}
          onDateFilterChange={handleDateFilterChange}
          customRange={normalizedCustomRange}
          onCustomRangeChange={handleCustomDateRangeChange}
          summaryStats={summaryStats}
          onOpenBulk={() => setBulkOpen(true)}
          onOpenDataTools={() => setIsDataToolsSheetOpen(true)}
          orderedDates={orderedDates}
          dailyTotal={dailyTotal}
          groupedEntries={groupedEntries}
          toTransactionItem={toTransactionItem}
          highlightEntryId={highlightEntryId}
          pendingScrollToId={pendingScrollToId}
          itemRefs={itemRefs}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          inferCategoryFromText={inferCategoryFromText}
          onSaveTransaction={handleSaveTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          filteredTransactionsLength={filteredTransactions.length}
          notesHasMore={notesHasMore}
          notesLoadMoreRef={notesLoadMoreRef}
          shouldVirtualizeNotes={shouldVirtualizeNotes}
          filteredEntriesLength={filteredEntries.length}
          visibleCount={notesVirtualizationPlan.visibleCount}
        />

        <FabAddButton
          onClick={() => openAddSheet()}
          className={cn(
            "duration-200",
            shouldHideFab ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100"
          )}
        />
        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {dashboardSheets}
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

      <HomeTabContent
        storageWarning={storageWarning}
        summaryStats={summaryStats}
        onOpenInsight={handleOpenInsightTab}
        quickInputRef={quickInputRef}
        quickInput={quickInput}
        quickInputPlaceholder={quickInputPlaceholder}
        onQuickInputChange={handleQuickInputChange}
        onQuickInputBlur={handleQuickInputBlur}
        onQuickInputSubmit={handleQuickAddSubmit}
        onOpenBulk={() => setBulkOpen(true)}
        showQuickFormatTemplates={showQuickFormatTemplates}
        quickFormatTemplates={quickFormatTemplates}
        onApplyQuickFormatTemplate={handleApplyQuickFormatTemplate}
        quickHistorySuggestions={quickHistorySuggestions}
        onApplyQuickHistorySuggestion={handleApplyQuickHistorySuggestion}
        smartRecallPrompt={smartRecallPrompt}
        lastEntryAt={lastEntryAt}
        latestEntryInsight={latestEntryInsight}
        onRecallDismiss={handleRecallDismiss}
        onRecallAddRecent={handleRecallAddRecent}
        showSuggestionCard={showSuggestionCard}
        topAdaptiveRecallItem={topAdaptiveRecallItem}
        onUseTopSuggestion={handleUseTopSuggestion}
        quickPreview={quickPreview}
        quickPreviewTextParts={quickPreviewTextParts}
        quickPreviewSubtitleBreakdown={quickPreviewSubtitleBreakdown}
        quickPreviewSubtitleItems={quickPreviewSubtitleItems}
        summedAmountMeta={summedAmountMeta}
        showQuickWarningDetails={showQuickWarningDetails}
        onToggleQuickWarningDetails={handleToggleQuickWarningDetails}
        adaptiveHints={adaptiveHints}
        quickError={quickError}
        adaptiveRecallItems={adaptiveRecallItems}
        onSelectQuickRecallItem={handleSelectQuickRecallItem}
        showNightCloseBar={showNightCloseBar}
        nightCloseSubtitle={nightCloseCopy.subtitle}
        onOpenNightCloseReview={handleOpenNightCloseReview}
        onNightCloseDismiss={handleNightCloseBarClose}
        nightCloseConfirmation={nightCloseConfirmation}
        allTransactions={allTransactions}
        homeItemRefs={homeItemRefs}
        highlightEntryId={highlightEntryId}
        homePendingScrollId={homePendingScrollId}
        expandedIds={expandedIds}
        onToggleExpand={handleToggleExpand}
        inferCategoryFromText={inferCategoryFromText}
        onSaveTransaction={handleSaveTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        onOpenNotes={handleOpenNotesTab}
      />

      <FabAddButton
        onClick={() => openAddSheet()}
        className={cn(
          "duration-200",
          shouldHideFab ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100"
        )}
      />
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      {dashboardSheets}
    </ScreenContainer>
  );
}
