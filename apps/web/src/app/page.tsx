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
import { useDashboardState } from "@/hooks/useDashboardState";
import { useTransactionHandlers } from "@/hooks/useTransactionHandlers";
import { useDebouncedEntries } from "@/hooks/useDebouncedEntries";
import {
  useEntries,
  useRules,
  useStorageState,
  useDateFilter,
  useScrollState,
  useBackupState,
  useQuickInput,
  useQuickInputError,
  useBulkInput,
  useRecallState,
  useRecallSession,
  useNightCloseState
} from "@/store/kemana/hooks-granular";
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
import { 
  STORAGE_KEYS, 
  TOAST_IDS, 
  NOTES_VIRTUALIZE_THRESHOLD, 
  NOTES_RENDER_CHUNK,
  HIGHLIGHT_ENTRY_DURATION_MS,
  NIGHT_CLOSE_CONFIRMATION_DURATION_MS,
  SCROLL_RETRY_INTERVAL_MS,
  SCROLL_MAX_ATTEMPTS,
  QUICK_INPUT_DEBOUNCE_MS
} from "@/lib/constants";

interface ParsedBulkLine extends BulkPreviewLine {
  parsed?: Extract<ParseQuickAddResult, { ok: true }>;
}

export default function DashboardPage() {
  // Use granular store hooks for better performance
  const { entries, setEntries } = useEntries();
  
  // Debounce storage writes for better performance
  const { debouncedSetEntries, flushPendingUpdates } = useDebouncedEntries(
    setEntries,
    300 // 300ms debounce
  );
  
  const { rules, setRules } = useRules();
  const { isStorageReady, setIsStorageReady, storageWarning, setStorageWarning } = useStorageState();
  const { dateFilter, setDateFilter } = useDateFilter();
  const { pendingScrollToId, setPendingScrollToId, highlightEntryId, setHighlightEntryId } = useScrollState();
  const { backupMessage, setBackupMessage, replaceOnImport, setReplaceOnImport } = useBackupState();
  const { quickInput, setQuickInput, debouncedQuickInput, setDebouncedQuickInput } = useQuickInput();
  const { quickError, setQuickError, showQuickWarningDetails, setShowQuickWarningDetails } = useQuickInputError();
  const { bulkOpen, setBulkOpen, bulkInput, setBulkInput } = useBulkInput();
  const { recallInputPrimed, setRecallInputPrimed } = useRecallState();
  const {
    lastAppOpenAt,
    setLastAppOpenAt,
    recallDismissedInSession,
    setRecallDismissedInSession,
    isRecallSessionReady,
    setIsRecallSessionReady
  } = useRecallSession();
  const {
    nightCloseClosedAt,
    setNightCloseClosedAt,
    isNightCloseReady,
    setIsNightCloseReady,
    nightClosePanelOpen,
    setNightClosePanelOpen,
    nightCloseConfirmation,
    setNightCloseConfirmation
  } = useNightCloseState();

  // Use custom dashboard state hook for UI state
  const {
    activeTab,
    setActiveTab,
    expandedIds,
    setExpandedIds,
    isAddSheetOpen,
    setIsAddSheetOpen,
    sheetPrefill,
    setSheetPrefill,
    isDataToolsSheetOpen,
    setIsDataToolsSheetOpen,
    homePendingScrollId,
    setHomePendingScrollId,
    isDarkMode,
    setIsDarkMode,
    userName,
    setUserName,
    nameDraft,
    setNameDraft,
    isNamePromptOpen,
    setIsNamePromptOpen,
    notesRenderCount,
    setNotesRenderCount,
    customDateRange,
    setCustomDateRange,
    isTrendChartOverflowing,
    setIsTrendChartOverflowing,
    itemRefs,
    homeItemRefs,
    notesLoadMoreRef,
    insightTrendScrollRef,
    quickInputRef,
    undoToastPayloadRef,
    movedToastPayloadRef,
    cancelEntriesPersistRef,
    isUnmountingRef
  } = useDashboardState();

  // Additional refs for tracking filter state
  const dateFilterRef = useRef<DateFilterPreset>(dateFilter);
  const customDateRangeRef = useRef<CustomDateRange>(customDateRange);

  // Computed values needed by transaction handlers
  const normalizedCustomRange = useMemo(
    () => normalizeCustomDateRange(customDateRange, new Date()),
    [customDateRange]
  );

  const dismissRecallForSession = useCallback(() => {
    setRecallDismissedInSession(true);
    window.sessionStorage.setItem(STORAGE_KEYS.RECALL_DISMISSED_SESSION, String(Date.now()));
  }, [setRecallDismissedInSession]);

  // Use transaction handlers hook
  const {
    handleSaveTransaction,
    handleDeleteTransaction,
    handleQuickAddSubmit: handleQuickAddSubmitFromHook,
    handleCreateFromSheet,
    undoToastPayloadRef: undoToastPayloadRefFromHook,
    movedToastPayloadRef: movedToastPayloadRefFromHook
  } = useTransactionHandlers({
    entries,
    setEntries: debouncedSetEntries, // Use debounced version
    flushEntries: flushPendingUpdates, // Flush function for immediate persistence
    rules,
    setRules,
    dateFilter,
    normalizedCustomRange,
    setHighlightEntryId,
    setPendingScrollToId,
    setExpandedIds,
    setHomePendingScrollId,
    setQuickInput,
    setDebouncedQuickInput,
    setQuickError,
    setShowQuickWarningDetails,
    setRecallInputPrimed,
    dismissRecallForSession,
    quickInputRef
  });

  // Override refs from useDashboardState with ones from useTransactionHandlers
  // This ensures toast payloads are properly managed
  undoToastPayloadRef.current = undoToastPayloadRefFromHook.current;
  movedToastPayloadRef.current = movedToastPayloadRefFromHook.current;

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
    const storedName = window.localStorage.getItem(STORAGE_KEYS.USER_NAME) ?? "";
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
    const rawLastOpenAt = window.localStorage.getItem(STORAGE_KEYS.LAST_OPEN_AT);
    const parsedLastOpenAt = rawLastOpenAt ? Number.parseInt(rawLastOpenAt, 10) : Number.NaN;
    setLastAppOpenAt(Number.isFinite(parsedLastOpenAt) ? parsedLastOpenAt : null);
    window.localStorage.setItem(STORAGE_KEYS.LAST_OPEN_AT, String(now));

    const dismissed = window.sessionStorage.getItem(STORAGE_KEYS.RECALL_DISMISSED_SESSION);
    setRecallDismissedInSession(Boolean(dismissed));
    setIsRecallSessionReady(true);
  }, [setIsRecallSessionReady, setLastAppOpenAt, setRecallDismissedInSession]);

  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      flushPendingUpdates(); // Flush any pending debounced updates
      cancelEntriesPersistRef.current?.();
      toast.dismiss(TOAST_IDS.UNDO);
      toast.dismiss(TOAST_IDS.MOVED);
    };
  }, [flushPendingUpdates]);

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
    window.localStorage.setItem(STORAGE_KEYS.USER_NAME, nextName);
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

  // Wrapper for handleQuickAddSubmit to match expected signature
  const handleQuickAddSubmit = useCallback(() => {
    handleQuickAddSubmitFromHook(quickInput, debouncedQuickInput, quickPreview);
  }, [handleQuickAddSubmitFromHook, quickInput, debouncedQuickInput, quickPreview]);

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

    debouncedSetEntries((prev) => [...newEntries.reverse(), ...prev]);
    setBulkInput("");
    setBulkOpen(false);
    dismissRecallForSession();
    setRecallInputPrimed(false);
    toast.success(`${newEntries.length} catatan berhasil ditambahkan.`);
  }, [bulkDraftLines, dismissRecallForSession, rules, debouncedSetEntries, setRecallInputPrimed]);

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
