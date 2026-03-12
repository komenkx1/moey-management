"use client";

import { useCallback, useMemo, useRef, useEffect, lazy, Suspense } from "react";
import { Settings, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import ScreenContainer from "@/components/kemana-ui/ScreenContainer";
import TopAppBar from "@/components/kemana-ui/TopAppBar";
import SyncIndicator from "@/components/kemana-ui/SyncIndicator";
import BottomTabBar from "@/components/kemana-ui/BottomTabBar";
import FabAddButton from "@/components/kemana-ui/FabAddButton";
import DateRangeFilter from "@/components/kemana-ui/DateRangeFilter";
import type { QuickRecallItem } from "@/components/kemana-ui/QuickRecallChips";
import type { TransactionItem } from "@/components/kemana-ui/TransactionCard";
import type { AddTransactionSubmitPayload } from "@/components/kemana-ui/AddTransactionSheet";
import type { BulkPreviewLine } from "@/components/kemana-ui/BulkInputSheet";
import DashboardSheets from "@/components/kemana-ui/DashboardSheets";
const InsightTabContent = lazy(() => import("@/components/kemana-ui/InsightTabContent"));
const AccountTabContent = lazy(() => import("@/components/kemana-ui/AccountTabContent"));
import NotesTabContent from "@/components/kemana-ui/NotesTabContent";
import HomeTabContent from "@/components/kemana-ui/HomeTabContent";
import { parseQuickAdd } from "@kemana/core/parser";
import { inferCategory } from "@kemana/core/rules";
import { isNativeIOS } from "@/lib/capacitor";
import type { Entry, ParseQuickAddResult } from "@kemana/core/types";
import { useDashboardRefs } from "@/hooks/useDashboardState";
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
  useNightCloseState,
  useActiveTab,
  useExpandedIds,
  useDashboardSheetsState,
  useThemeState,
  useUserProfile,
  useDashboardViewContext
} from "@/store/kemana/hooks-granular";
import {
  createBackupPayload,
  downloadBackupFile,
  importBackupFromText,
  clearStorageHealthWarnings,
  incrementRecoveryCount,
  enqueueSyncOperation,
  enqueueSyncOperationBatch
} from "@kemana/storage";
import {
  normalizeCustomDateRange,
  getFilteredEntries,
  getSummaryStats,
  groupEntriesByDate,
  sumAmount,
  makeInitialSplit,
  type DateFilterPreset,
  type CustomDateRange
} from "@/lib/kemana-utils";
import {
  deriveAdaptiveHint,
  deriveAdaptiveRecallItems,
  deriveLatestEntryInsight
} from "@/lib/dashboard-page-utils";
import { createEntryId } from "@/lib/dashboard-page-helpers";
import {
  downloadCsv,
  importEntriesFromCsv,
  toTransactionItem
} from "@/lib/dashboard-page-entry-utils";
import { getTodayStats, getTopCategory as getNightCloseTopCategory } from "./night-close";
import { getLastEntryTimestamp, getSmartRecallPrompt } from "./recall";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/lib/constants";

// Extracted hooks
import { useStorageInit } from "@/hooks/useStorageInit";
import { useTheme } from "@/hooks/useTheme";
import { useNightClose } from "@/hooks/useNightClose";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { useInsightData } from "@/hooks/useInsightData";
import { useScrollToEntry } from "@/hooks/useScrollToEntry";
import { useNotesVirtualization } from "@/hooks/useNotesVirtualization";
import { useAuth, getSyncWorker } from "@/hooks/useAuth";

interface ParsedBulkLine extends BulkPreviewLine {
  parsed?: Extract<ParseQuickAddResult, { ok: true }>;
}

export default function DashboardPage() {
  const { session } = useAuth();
  const { entries, setEntries } = useEntries();
  const { debouncedSetEntries, flushPendingUpdates } = useDebouncedEntries(setEntries, 300);
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

  const { activeTab, setActiveTab } = useActiveTab();
  const { expandedIds, setExpandedIds } = useExpandedIds();
  const {
    isAddSheetOpen,
    setIsAddSheetOpen,
    sheetPrefill,
    setSheetPrefill,
    isDataToolsSheetOpen,
    setIsDataToolsSheetOpen
  } = useDashboardSheetsState();
  const {
    userName,
    setUserName,
    nameDraft,
    setNameDraft,
    isNamePromptOpen,
    setIsNamePromptOpen
  } = useUserProfile();
  const {
    homePendingScrollId,
    setHomePendingScrollId,
    notesRenderCount,
    setNotesRenderCount,
    customDateRange,
    setCustomDateRange,
    isTrendChartOverflowing,
    setIsTrendChartOverflowing
  } = useDashboardViewContext();

  const {
    itemRefs,
    homeItemRefs,
    notesLoadMoreRef,
    insightTrendScrollRef,
    quickInputRef,
    undoToastPayloadRef,
    movedToastPayloadRef,
    cancelEntriesPersistRef,
    isUnmountingRef
  } = useDashboardRefs();

  useEffect(() => {
    const storedName = window.localStorage.getItem(STORAGE_KEYS.USER_NAME);
    const normalizedStoredName = (storedName ?? "").replace(/\s+/g, " ").trim();

    if (normalizedStoredName.length >= 2) {
      setUserName(normalizedStoredName);
      setNameDraft(normalizedStoredName);
      setIsNamePromptOpen(false);
    } else {
      setUserName("");
      setNameDraft(normalizedStoredName);
      setIsNamePromptOpen(true);
    }

    return () => {
      isUnmountingRef.current = true;
    };
  }, [setUserName, setNameDraft, setIsNamePromptOpen, isUnmountingRef]);

  const normalizedCustomRange = useMemo(
    () => normalizeCustomDateRange(customDateRange, new Date()),
    [customDateRange]
  );

  const dismissRecallForSession = useCallback(() => {
    setRecallDismissedInSession(true);
    window.sessionStorage.setItem(STORAGE_KEYS.RECALL_DISMISSED_SESSION, String(Date.now()));
  }, [setRecallDismissedInSession]);

  const {
    handleSaveTransaction,
    handleDeleteTransaction,
    handleQuickAddSubmit: handleQuickAddSubmitFromHook,
    handleCreateFromSheet,
    undoToastPayloadRef: undoToastPayloadRefFromHook,
    movedToastPayloadRef: movedToastPayloadRefFromHook
  } = useTransactionHandlers({
    entries,
    setEntries: debouncedSetEntries,
    flushEntries: flushPendingUpdates,
    rules,
    setRules,
    dateFilter,
    setDateFilter,
    setActiveTab,
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

  undoToastPayloadRef.current = undoToastPayloadRefFromHook.current;
  movedToastPayloadRef.current = movedToastPayloadRefFromHook.current;

  useStorageInit({
    entries,
    rules,
    isStorageReady,
    setEntries,
    setRules,
    setNightCloseClosedAt,
    setIsNightCloseReady,
    setStorageWarning,
    setIsStorageReady,
    setLastAppOpenAt,
    setRecallDismissedInSession,
    setIsRecallSessionReady,
    cancelEntriesPersistRef,
    isUnmountingRef,
    flushPendingUpdates
  });

  const { isDarkMode, toggleTheme } = useTheme();

  const {
    nightCloseTodayStats,
    nightCloseTopCategory,
    nightCloseCopy,
    nightCloseDateLabel,
    showNightCloseBar,
    handleNightCloseBarClose,
    handleNightCloseDoneFromPanel
  } = useNightClose({
    entries,
    isNightCloseReady,
    nightCloseClosedAt,
    setNightCloseClosedAt,
    setNightClosePanelOpen,
    setNightCloseConfirmation
  });

  const smartRecallPrompt = useMemo(() => {
    if (!isStorageReady || !isRecallSessionReady || recallDismissedInSession) {
      return null;
    }
    return getSmartRecallPrompt({ entries, lastAppOpenAt });
  }, [entries, isRecallSessionReady, isStorageReady, lastAppOpenAt, recallDismissedInSession]);

  const adaptiveRecallItems: QuickRecallItem[] = useMemo(() => deriveAdaptiveRecallItems(entries), [entries]);
  const topAdaptiveRecallItem = useMemo(() => adaptiveRecallItems[0] ?? null, [adaptiveRecallItems]);

  const {
    quickPreview,
    quickPreviewTextParts,
    quickPreviewSubtitleBreakdown,
    quickPreviewSubtitleItems,
    adaptiveHints,
    summedAmountMeta,
    quickInputPlaceholder,
    quickHistorySuggestions,
    quickFormatTemplates
  } = useQuickAdd({
    entries,
    quickInput,
    debouncedQuickInput,
    smartRecallPrompt,
    recallInputPrimed,
    topAdaptiveRecallItem
  });

  const {
    insightSevenDay,
    insightWhyCards,
    insightCoachCopy,
    insightTrendBadge,
    insightAverageAmountLabel,
    insightTrendSeriesDisplay,
    insightMaxTrendTotal,
    trendCompactItemWidth,
    trendTitle,
    trendSubtitle
  } = useInsightData({
    entries,
    activeTab,
    dateFilter,
    normalizedCustomRange,
    insightTrendScrollRef,
    setIsTrendChartOverflowing
  });

  useScrollToEntry({
    activeTab,
    dateFilter,
    entries,
    pendingScrollToId,
    setPendingScrollToId,
    homePendingScrollId,
    setHomePendingScrollId,
    itemRefs,
    homeItemRefs
  });

  const allTransactions = useMemo(() => entries.map(toTransactionItem), [entries]);
  const filteredEntries = useMemo(
    () => getFilteredEntries(entries, dateFilter, new Date(), normalizedCustomRange),
    [dateFilter, entries, normalizedCustomRange]
  );
  const filteredTransactions = useMemo(() => filteredEntries.map(toTransactionItem), [filteredEntries]);

  const {
    notesVirtualizationPlan,
    shouldVirtualizeNotes,
    notesHasMore
  } = useNotesVirtualization({
    activeTab,
    dateFilter,
    filteredEntries,
    pendingScrollToId,
    notesLoadMoreRef,
    notesRenderCount,
    setNotesRenderCount
  });

  const notesVisibleEntries = useMemo(
    () => filteredEntries.slice(0, Math.max(notesVirtualizationPlan.visibleCount, 0)),
    [filteredEntries, notesVirtualizationPlan.visibleCount]
  );

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

  const trendBadge = useMemo(() => {
    // Home tab: no badge (to avoid duplication with Insight tab)
    return null;
  }, []);

  const latestEntryInsight = useMemo(() => deriveLatestEntryInsight(entries), [entries]);
  const lastEntryAt = useMemo(() => getLastEntryTimestamp(entries), [entries]);
  const showSuggestionCard = Boolean(smartRecallPrompt && topAdaptiveRecallItem);
  const showQuickFormatTemplates = useMemo(() => quickInput.trim().length > 0, [quickInput]);
  const normalizedNameDraft = useMemo(() => nameDraft.replace(/\s+/g, " ").trim(), [nameDraft]);
  const canSaveName = normalizedNameDraft.length >= 2;
  const homeGreetingSubtitle = useMemo(() => (userName ? `Halo, ${userName}` : "Halo"), [userName]);
  const adaptiveHint = useMemo(() => deriveAdaptiveHint(topAdaptiveRecallItem), [topAdaptiveRecallItem]);

  const bulkDraftLines = useMemo<ParsedBulkLine[]>(() => {
    const lines = bulkInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return lines.map((line) => {
      const parsed = parseQuickAdd(line, new Date(), "bulk_paste");
      if (!parsed.ok) {
        return { line, ok: false, reason: parsed.reason };
      }
      return { line, ok: true, amount: parsed.value.amount, parsed };
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

  const isAnySheetOpen = isAddSheetOpen || bulkOpen || isDataToolsSheetOpen || nightClosePanelOpen || isNamePromptOpen;
  const shouldHideFab = isAnySheetOpen || expandedIds.size > 0;

  const openAddSheet = useCallback((prefillData?: Partial<AddTransactionSubmitPayload>) => {
    setSheetPrefill(prefillData ?? null);
    setIsAddSheetOpen(true);
  }, [setSheetPrefill, setIsAddSheetOpen]);

  const primeQuickInputForRecall = useCallback(
    (options?: { dismissSession?: boolean }) => {
      const dismissSession = options?.dismissSession ?? true;
      setRecallInputPrimed(true);
      if (dismissSession) dismissRecallForSession();
      setQuickError(null);
      setShowQuickWarningDetails(false);
      if (activeTab !== "home") setActiveTab("home");
      window.requestAnimationFrame(() => quickInputRef.current?.focus());
    },
    [activeTab, dismissRecallForSession, setActiveTab, setQuickError, setRecallInputPrimed, setShowQuickWarningDetails, quickInputRef]
  );

  const handleRecallAddRecent = useCallback(async () => {
    incrementRecoveryCount().catch(() => { });
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
      window.requestAnimationFrame(() => quickInputRef.current?.focus());
    },
    [setQuickError, setQuickInput, setShowQuickWarningDetails, quickInputRef]
  );

  const handleApplyQuickFormatTemplate = useCallback(
    (template: string) => {
      setQuickInput(template);
      setQuickError(null);
      setShowQuickWarningDetails(false);
      window.requestAnimationFrame(() => quickInputRef.current?.focus());
    },
    [setQuickError, setQuickInput, setShowQuickWarningDetails, quickInputRef]
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
    if (!quickInput.trim()) setRecallInputPrimed(false);
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

  const handleOpenInsightTab = useCallback(() => setActiveTab("insight"), [setActiveTab]);
  const handleOpenNotesTab = useCallback(() => setActiveTab("notes"), [setActiveTab]);
  const handleOpenNightCloseReview = useCallback(() => setNightClosePanelOpen(true), [setNightClosePanelOpen]);

  const inferCategoryFromText = useCallback((text: string) => inferCategory(text, rules), [rules]);

  const handleSaveUserName = useCallback(() => {
    if (!canSaveName) return;
    const nextName = normalizedNameDraft;
    setUserName(nextName);
    setNameDraft(nextName);
    setIsNamePromptOpen(false);
    window.localStorage.setItem(STORAGE_KEYS.USER_NAME, nextName);
    toast.success(`Halo, ${nextName}`);
  }, [canSaveName, normalizedNameDraft, setUserName, setNameDraft, setIsNamePromptOpen]);

  const handleDateFilterChange = useCallback(
    (next: DateFilterPreset) => {
      if (next === "custom") {
        setCustomDateRange((prev) => normalizeCustomDateRange(prev, new Date()));
      }
      setDateFilter(next);
    },
    [setCustomDateRange, setDateFilter]
  );

  const handleCustomDateRangeChange = useCallback(
    (next: CustomDateRange) => {
      setCustomDateRange(normalizeCustomDateRange(next, new Date()));
      if (dateFilter !== "custom") setDateFilter("custom");
    },
    [dateFilter, setCustomDateRange, setDateFilter]
  );

  const handleQuickAddSubmit = useCallback(() => {
    handleQuickAddSubmitFromHook(quickInput, debouncedQuickInput, quickPreview ?? null);
  }, [handleQuickAddSubmitFromHook, quickInput, debouncedQuickInput, quickPreview]);

  const handleSaveBulk = useCallback(() => {
    const validLines = bulkDraftLines.filter(
      (line): line is ParsedBulkLine & { parsed: Extract<ParseQuickAddResult, { ok: true }> } =>
        line.ok && Boolean(line.parsed)
    );
    if (!validLines.length) return;

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
    
    // Batch enqueue sync for all entries if logged in
    if (session?.user) {
      const syncWorker = getSyncWorker();
      
      // Use batch sync for better performance and reliability
      const operations = newEntries.map(entry => ({
        entity: 'entry' as const,
        entityId: entry.id,
        operation: 'create' as const,
        payload: entry
      }));
      
      enqueueSyncOperationBatch(operations, syncWorker).catch(console.error);
    }
    
    setBulkInput("");
    setBulkOpen(false);
    dismissRecallForSession();
    setRecallInputPrimed(false);
    toast.success(`${newEntries.length} catatan berhasil ditambahkan.`);
  }, [bulkDraftLines, dismissRecallForSession, rules, debouncedSetEntries, setBulkInput, setBulkOpen, setRecallInputPrimed, session]);

  const handleExportJson = useCallback(async () => {
    const payload = createBackupPayload(entries, rules, "kemana-web");
    const content = JSON.stringify(payload, null, 2);
    const date = payload.meta.exportedAt.slice(0, 10);
    const filename = `kemana-backup-${date}.json`;

    try {
      const { nativeShareFile } = await import("@/lib/native-download");
      const handled = await nativeShareFile({ content, filename });
      if (handled) {
        setBackupMessage("Backup JSON berhasil di-share.");
        toast.success("Backup JSON berhasil.");
        return;
      }
    } catch {
      // Fallback ke web
    }

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
          mode: importMode,
          fileSize: file.size
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

  const handleNightCloseAddEntry = useCallback(() => {
    setNightClosePanelOpen(false);
    primeQuickInputForRecall({ dismissSession: false });
  }, [primeQuickInputForRecall, setNightClosePanelOpen]);

  const handleUseTopSuggestion = useCallback(() => {
    if (!topAdaptiveRecallItem) return;
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

  const handleInsightOpenNotes = useCallback(() => setActiveTab("notes"), [setActiveTab]);

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
        <TopAppBar title="Insight" indicator={session ? <SyncIndicator /> : null} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <main className="flex flex-col gap-3 px-4 py-2 pb-[calc(96px+env(safe-area-inset-bottom))]">
            <div
              className={cn(
                "sticky top-0 z-20 pb-2 pt-1 border-b border-border-subtle/50 mb-1",
                isNativeIOS()
                  ? "bg-bg-base/90 backdrop-blur-md"
                  : "bg-bg-base"
              )}
            >
              <DateRangeFilter
                value={dateFilter}
                onChange={handleDateFilterChange}
                customRange={normalizedCustomRange}
                onCustomRangeChange={handleCustomDateRangeChange}
              />
            </div>
            <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 text-[13px] text-text-tertiary animate-pulse">Memuat insight...</div>}>
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
            </Suspense>
          </main>
        </div>
        <BottomTabBar />
        {dashboardSheets}
      </ScreenContainer>
    );
  }

  if (activeTab === "account") {
    return (
      <ScreenContainer withBottomNav>
        <TopAppBar title="Akun" indicator={session ? <SyncIndicator /> : null} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <main className="flex flex-col gap-3 px-4 py-2 pb-[calc(96px+env(safe-area-inset-bottom))]">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 text-[13px] text-text-tertiary animate-pulse">Memuat akun...</div>}>
              <AccountTabContent />
            </Suspense>
          </main>
        </div>
        <BottomTabBar />
        {dashboardSheets}
      </ScreenContainer>
    );
  }

  if (activeTab === "notes") {
    return (
      <ScreenContainer withBottomNav withFab>
        <TopAppBar
          title="Catatan"
          indicator={session ? <SyncIndicator /> : null}
          actionIcon={<Settings className="h-5 w-5" />}
          onActionClick={() => setIsDataToolsSheetOpen(true)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
        </div>
        <FabAddButton
          onClick={() => openAddSheet()}
          className={cn("duration-200", shouldHideFab ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100")}
        />
        <BottomTabBar />
        {dashboardSheets}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withBottomNav withFab>
      <TopAppBar
        title="KeMana"
        subtitle={homeGreetingSubtitle}
        indicator={session ? <SyncIndicator /> : null}
        actionIcon={isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        onActionClick={toggleTheme}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <HomeTabContent
          entries={entries}
          storageWarning={storageWarning}
          summaryStats={summaryStats}
          trendBadge={trendBadge}
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
          quickPreview={quickPreview ?? null}
          quickPreviewTextParts={quickPreviewTextParts ?? null}
          quickPreviewSubtitleBreakdown={quickPreviewSubtitleBreakdown ?? null}
          quickPreviewSubtitleItems={quickPreviewSubtitleItems ?? null}
          summedAmountMeta={summedAmountMeta ?? null}
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
          inferCategoryFromText={inferCategoryFromText}
          onSaveTransaction={handleSaveTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onOpenNotes={handleOpenNotesTab}
        />
      </div>
      <FabAddButton
        onClick={() => openAddSheet()}
        className={cn("duration-200", shouldHideFab ? "pointer-events-none translate-y-4 opacity-0" : "opacity-100")}
      />
      <BottomTabBar />
      {dashboardSheets}
    </ScreenContainer>
  );
}
