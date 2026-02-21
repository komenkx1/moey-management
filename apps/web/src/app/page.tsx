"use client";

import { useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { parseQuickAdd } from "@kemana/core/parser";
import { inferCategory, updateCategoryRule } from "@kemana/core/rules";
import {
  Category,
  Entry,
  EntrySource
} from "@kemana/core/types";
import { createId } from "@/lib/id";
import {
  clearStorageHealthWarnings,
  createBackupPayload,
  downloadBackupFile,
  getStorageHealth,
  importBackupFromText,
  loadEntries,
  loadRules,
  readNightCloseMarker,
  saveEntries,
  saveRules,
  writeNightCloseMarker,
  migrateFromLocalStorage
} from "@kemana/storage";
import { recordQuickAddAck, scheduleBackgroundTask } from "@/lib/perf";
import EntriesList from "@/components/kemana/EntriesList";
import NightCloseBar from "@/components/kemana/NightCloseBar";
import NightClosePanel from "@/components/kemana/NightClosePanel";
import QuickAddComposer from "@/components/kemana/QuickAddComposer";
import SummaryHeader from "@/components/kemana/SummaryHeader";
import {
  type ActionToastState,
  type MovedToastState,
  type UndoToastState,
  useKemanaStore
} from "@/store/use-kemana-store";
import {
  FILTER_OPTIONS,
  DateFilterPreset,
  extractSummedAmountMeta,
  formatDayLabel,
  getBestFilterForDate,
  getFilteredEntries,
  getInputHints,
  getSummaryStats,
  groupEntriesByDate,
  includesDateInFilter,
  makeInitialSplit,
  parseItemBreakdownFromSubtitle,
  splitDisplayText,
  splitSubtitleItems,
  sumAmount
} from "@/lib/kemana-utils";
import {
  getAverageLast7Days,
  getNightCloseCopy,
  getTopCategory as getNightCloseTopCategory,
  getTodayISO,
  getTodayStats,
  shouldShowNightClose
} from "./night-close";
import { getLastEntryTimestamp, getSmartRecallPrompt } from "./recall";

interface BulkPreviewLine {
  line: string;
  ok: boolean;
  reason?: string;
}

const LAST_OPEN_AT_KEY = "kemana.lastOpenAt";
const RECALL_DISMISSED_SESSION_KEY = "kemana.dismissedRecallUntil";

export default function HomePage() {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const {
    isStorageReady,
    entries,
    rules,
    storageWarning,
    backupMessage,
    replaceOnImport,
    dateFilter,
    autoExpandedEntryId,
    actionToast,
    movedToast,
    pendingScrollToId,
    highlightEntryId,
    quickInput,
    debouncedQuickInput,
    lastAppOpenAt,
    recallDismissedInSession,
    isRecallSessionReady,
    recallInputPrimed,
    nightCloseClosedAt,
    isNightCloseReady,
    nightClosePanelOpen,
    nightCloseConfirmation,
    quickError,
    showQuickWarningDetails,
    bulkOpen,
    bulkInput,
    undoToast,
    setIsStorageReady,
    setEntries,
    setRules,
    setStorageWarning,
    setBackupMessage,
    setReplaceOnImport,
    setDateFilter,
    setAutoExpandedEntryId,
    setActionToast,
    setMovedToast,
    setPendingScrollToId,
    setHighlightEntryId,
    setQuickInput,
    setDebouncedQuickInput,
    setLastAppOpenAt,
    setRecallDismissedInSession,
    setIsRecallSessionReady,
    setRecallInputPrimed,
    setNightCloseClosedAt,
    setIsNightCloseReady,
    setNightClosePanelOpen,
    setNightCloseConfirmation,
    setQuickError,
    setShowQuickWarningDetails,
    setBulkOpen,
    setBulkInput,
    setUndoToast
  } = useKemanaStore(
    useShallow((state) => ({
      isStorageReady: state.isStorageReady,
      entries: state.entries,
      rules: state.rules,
      storageWarning: state.storageWarning,
      backupMessage: state.backupMessage,
      replaceOnImport: state.replaceOnImport,
      dateFilter: state.dateFilter,
      autoExpandedEntryId: state.autoExpandedEntryId,
      actionToast: state.actionToast,
      movedToast: state.movedToast,
      pendingScrollToId: state.pendingScrollToId,
      highlightEntryId: state.highlightEntryId,
      quickInput: state.quickInput,
      debouncedQuickInput: state.debouncedQuickInput,
      lastAppOpenAt: state.lastAppOpenAt,
      recallDismissedInSession: state.recallDismissedInSession,
      isRecallSessionReady: state.isRecallSessionReady,
      recallInputPrimed: state.recallInputPrimed,
      nightCloseClosedAt: state.nightCloseClosedAt,
      isNightCloseReady: state.isNightCloseReady,
      nightClosePanelOpen: state.nightClosePanelOpen,
      nightCloseConfirmation: state.nightCloseConfirmation,
      quickError: state.quickError,
      showQuickWarningDetails: state.showQuickWarningDetails,
      bulkOpen: state.bulkOpen,
      bulkInput: state.bulkInput,
      undoToast: state.undoToast,
      setIsStorageReady: state.setIsStorageReady,
      setEntries: state.setEntries,
      setRules: state.setRules,
      setStorageWarning: state.setStorageWarning,
      setBackupMessage: state.setBackupMessage,
      setReplaceOnImport: state.setReplaceOnImport,
      setDateFilter: state.setDateFilter,
      setAutoExpandedEntryId: state.setAutoExpandedEntryId,
      setActionToast: state.setActionToast,
      setMovedToast: state.setMovedToast,
      setPendingScrollToId: state.setPendingScrollToId,
      setHighlightEntryId: state.setHighlightEntryId,
      setQuickInput: state.setQuickInput,
      setDebouncedQuickInput: state.setDebouncedQuickInput,
      setLastAppOpenAt: state.setLastAppOpenAt,
      setRecallDismissedInSession: state.setRecallDismissedInSession,
      setIsRecallSessionReady: state.setIsRecallSessionReady,
      setRecallInputPrimed: state.setRecallInputPrimed,
      setNightCloseClosedAt: state.setNightCloseClosedAt,
      setIsNightCloseReady: state.setIsNightCloseReady,
      setNightClosePanelOpen: state.setNightClosePanelOpen,
      setNightCloseConfirmation: state.setNightCloseConfirmation,
      setQuickError: state.setQuickError,
      setShowQuickWarningDetails: state.setShowQuickWarningDetails,
      setBulkOpen: state.setBulkOpen,
      setBulkInput: state.setBulkInput,
      setUndoToast: state.setUndoToast
    }))
  );
  const quickInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const pendingUndoRef = useRef<UndoToastState | null>(null);
  const cancelEntriesPersistRef = useRef<(() => void) | null>(null);
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    async function initStorage() {
      await migrateFromLocalStorage();
      const [loadedEntries, loadedRules] = await Promise.all([
        loadEntries(),
        loadRules()
      ]);
      const storageHealth = getStorageHealth();
      setEntries(loadedEntries);
      setRules(loadedRules);
      if (storageHealth.hasCorruption) {
        setStorageWarning("Data penyimpanan bermasalah. Coba Import Backup.");
      }
      setIsStorageReady(true);
    }
    initStorage();
  }, []);

  useEffect(() => {
    quickInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const now = Date.now();
    const storedLastOpenAt = window.sessionStorage ? window.localStorage.getItem(LAST_OPEN_AT_KEY) : null;
    const parsedLastOpenAt = storedLastOpenAt ? Number.parseInt(storedLastOpenAt, 10) : Number.NaN;
    setLastAppOpenAt(Number.isFinite(parsedLastOpenAt) ? parsedLastOpenAt : null);
    if (window.localStorage) {
      window.localStorage.setItem(LAST_OPEN_AT_KEY, String(now));
    }
    setRecallDismissedInSession(Boolean(window.sessionStorage?.getItem(RECALL_DISMISSED_SESSION_KEY)));
    setIsRecallSessionReady(true);

    readNightCloseMarker().then(marker => {
      setNightCloseClosedAt(marker);
      setIsNightCloseReady(true);
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuickInput(quickInput);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [quickInput]);

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
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!pendingUndoRef.current) {
      return;
    }

    setUndoToast(pendingUndoRef.current);
    pendingUndoRef.current = null;
  }, [entries]);

  useEffect(() => {
    if (!isStorageReady) {
      return;
    }
    saveRules(rules);
  }, [rules, isStorageReady]);

  useEffect(() => {
    if (!undoToast) {
      return;
    }

    const timeoutMs = Math.max(0, undoToast.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setUndoToast((current) => (current?.expiresAt === undoToast.expiresAt ? null : current));
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [undoToast]);

  useEffect(() => {
    if (!actionToast) {
      return;
    }

    const timeoutMs = Math.max(0, actionToast.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setActionToast((current) => (current?.expiresAt === actionToast.expiresAt ? null : current));
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [actionToast]);

  useEffect(() => {
    if (!movedToast) {
      return;
    }

    const timeoutMs = Math.max(0, movedToast.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setMovedToast((current) =>
        current?.expiresAt === movedToast.expiresAt ? null : current
      );
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [movedToast]);

  useEffect(() => {
    if (!highlightEntryId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setHighlightEntryId((current) =>
        current === highlightEntryId ? null : current
      );
    }, 2_800);

    return () => window.clearTimeout(timer);
  }, [highlightEntryId]);

  useEffect(() => {
    if (!nightCloseConfirmation) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNightCloseConfirmation((current) =>
        current === nightCloseConfirmation ? null : current
      );
    }, 2_600);

    return () => window.clearTimeout(timer);
  }, [nightCloseConfirmation]);

  const quickPreview = useMemo(() => {
    if (!debouncedQuickInput.trim()) {
      return null;
    }
    return parseQuickAdd(debouncedQuickInput);
  }, [debouncedQuickInput]);
  const smartRecallPrompt = useMemo(() => {
    if (!isStorageReady || !isRecallSessionReady || recallDismissedInSession) {
      return null;
    }

    return getSmartRecallPrompt({
      entries,
      lastAppOpenAt
    });
  }, [entries, isStorageReady, isRecallSessionReady, lastAppOpenAt, recallDismissedInSession]);
  const lastEntryAt = useMemo(() => getLastEntryTimestamp(entries), [entries]);
  const quickInputPlaceholder = useMemo(() => {
    if (smartRecallPrompt || recallInputPrimed) {
      return "barusan bayar apa?";
    }

    const currentHour = new Date().getHours();
    if (currentHour >= 19 && currentHour <= 23) {
      return "hari ini keluar apa?";
    }

    return "Misal : Foree - matcha 10k + kue 20k";
  }, [smartRecallPrompt, recallInputPrimed]);
  const adaptiveHints = useMemo(
    () => getInputHints(quickInput, quickPreview),
    [quickInput, quickPreview]
  );
  const quickPreviewTextParts = quickPreview?.ok ? splitDisplayText(quickPreview.value.text) : null;
  const summedAmountMeta = quickPreview?.ok ? extractSummedAmountMeta(quickPreview.warnings) : null;
  const isSummationInput = summedAmountMeta !== null;
  const quickPreviewSubtitleBreakdown =
    quickPreviewTextParts?.subtitle
      ? parseItemBreakdownFromSubtitle(quickPreviewTextParts.subtitle)
      : null;
  const quickPreviewSubtitleItems =
    quickPreviewTextParts?.subtitle ? splitSubtitleItems(quickPreviewTextParts.subtitle) : null;

  const bulkPreview = useMemo(() => {
    const lines = bulkInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const preview: BulkPreviewLine[] = [];
    for (const line of lines) {
      const result = parseQuickAdd(line, new Date(), "bulk_paste");
      if (result.ok) {
        preview.push({ line, ok: true });
      } else {
        preview.push({ line, ok: false, reason: result.reason });
      }
    }
    return preview;
  }, [bulkInput]);

  const validBulkCount = bulkPreview.filter((line) => line.ok).length;
  const filteredEntries = useMemo(
    () => getFilteredEntries(entries, dateFilter),
    [entries, dateFilter]
  );
  const summaryStats = useMemo(
    () => getSummaryStats({ allEntries: entries, filteredEntries, preset: dateFilter }),
    [entries, filteredEntries, dateFilter]
  );
  const nightCloseTodayStats = useMemo(() => getTodayStats(entries), [entries]);
  const nightCloseAvg7 = useMemo(() => getAverageLast7Days(entries), [entries]);
  const nightCloseTopCategory = useMemo(
    () => getNightCloseTopCategory(nightCloseTodayStats.byCategory),
    [nightCloseTodayStats.byCategory]
  );
  const nightCloseCopy = useMemo(
    () => getNightCloseCopy({ stats: nightCloseTodayStats, avg7: nightCloseAvg7 }),
    [nightCloseTodayStats, nightCloseAvg7]
  );
  const showNightCloseBar = useMemo(
    () =>
      isNightCloseReady &&
      shouldShowNightClose({
        entries,
        closedAt: nightCloseClosedAt
      }),
    [entries, isNightCloseReady, nightCloseClosedAt]
  );
  useEffect(() => {
    if (showNightCloseBar) {
      return;
    }
    setNightClosePanelOpen(false);
  }, [showNightCloseBar]);
  const groupedEntriesResult = useMemo(() => groupEntriesByDate(filteredEntries), [filteredEntries]);
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
    [orderedDates, groupedEntries]
  );

  useEffect(() => {
    if (!pendingScrollToId) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 3;

    const scrollToPending = () => {
      if (cancelled) {
        return;
      }

      const selector = `[data-entry-id="${pendingScrollToId}"]`;
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        try {
          element.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch {
          element.scrollIntoView({ block: "center" });
        }
        setPendingScrollToId((current) =>
          current === pendingScrollToId ? null : current
        );
        return;
      }

      if (attempts >= maxAttempts) {
        setPendingScrollToId((current) =>
          current === pendingScrollToId ? null : current
        );
        return;
      }

      attempts += 1;
      window.setTimeout(() => {
        window.requestAnimationFrame(scrollToPending);
      }, 80);
    };

    window.requestAnimationFrame(scrollToPending);

    return () => {
      cancelled = true;
    };
  }, [pendingScrollToId, orderedDates]);

  function showActionToast(message: string) {
    setActionToast({
      message,
      expiresAt: Date.now() + 2_000
    });
  }

  function dismissRecallForSession() {
    setRecallDismissedInSession(true);
    window.sessionStorage.setItem(RECALL_DISMISSED_SESSION_KEY, String(Date.now()));
  }

  function primeQuickInputForRecall(options?: { dismissSession?: boolean }) {
    const dismissSession = options?.dismissSession ?? true;
    setRecallInputPrimed(true);
    if (dismissSession) {
      dismissRecallForSession();
    }
    setQuickError(null);
    setShowQuickWarningDetails(false);
    window.requestAnimationFrame(() => {
      quickInputRef.current?.focus();
    });
  }

  function handleRecallAddRecent() {
    primeQuickInputForRecall();
  }

  function handleRecallDismiss() {
    setRecallInputPrimed(false);
    dismissRecallForSession();
  }

  function handleEntryDateChanged(entryId: string, nextDateISO: string) {
    const label = formatDayLabel(nextDateISO, new Date());
    const isDateVisibleInCurrentFilter = includesDateInFilter(nextDateISO, dateFilter);

    setMovedToast({
      entryId,
      targetDate: nextDateISO,
      label,
      movedOutOfFilter: !isDateVisibleInCurrentFilter,
      expiresAt: Date.now() + 8_000
    });
    setPendingScrollToId(entryId);
    setHighlightEntryId(entryId);
  }

  function handleMovedToastSee() {
    if (!movedToast) {
      return;
    }

    if (!includesDateInFilter(movedToast.targetDate, dateFilter)) {
      setDateFilter(getBestFilterForDate(movedToast.targetDate));
    }

    setPendingScrollToId(movedToast.entryId);
    setHighlightEntryId(movedToast.entryId);
    setMovedToast(null);
  }

  function markNightCloseDone(showConfirmation: boolean) {
    const todayISO = getTodayISO();
    setNightCloseClosedAt(todayISO);
    writeNightCloseMarker(todayISO);
    setNightClosePanelOpen(false);
    if (showConfirmation) {
      setNightCloseConfirmation("Hari ditutup ✅");
    }
  }

  function handleNightCloseBarClose() {
    markNightCloseDone(false);
  }

  function handleNightCloseDoneFromPanel() {
    markNightCloseDone(true);
  }

  function handleNightCloseAddEntry() {
    setNightClosePanelOpen(false);
    primeQuickInputForRecall({ dismissSession: false });
  }

  function buildEntry(raw: string, source: EntrySource): Entry | null {
    const parsed = parseQuickAdd(raw, new Date(), source);
    if (!parsed.ok) {
      return null;
    }

    const category = inferCategory(parsed.value.text, rules);
    const now = new Date().toISOString();
    return {
      id: createId("entry"),
      text: parsed.value.text,
      amount: parsed.value.amount,
      date: parsed.value.date,
      category,
      paymentMethod: "Unknown",
      source,
      parseWarnings: parsed.warnings,
      createdAt: now,
      updatedAt: now,
      split: makeInitialSplit(parsed.value.amount, parsed.value.splitCount)
    };
  }

  function handleQuickAdd() {
    const submitStartedAt = performance.now();
    const canReuseQuickPreview = quickPreview !== null && debouncedQuickInput === quickInput;
    const parsed = canReuseQuickPreview
      ? quickPreview
      : parseQuickAdd(quickInput, new Date(), "quick_add");

    if (!parsed.ok) {
      setQuickError(parsed.reason);
      return;
    }

    const category = inferCategory(parsed.value.text, rules);
    const now = new Date().toISOString();
    const nextEntry: Entry = {
      id: createId("entry"),
      text: parsed.value.text,
      amount: parsed.value.amount,
      date: parsed.value.date,
      category,
      paymentMethod: "Unknown",
      source: "quick_add",
      parseWarnings: parsed.warnings,
      createdAt: now,
      updatedAt: now,
      split: makeInitialSplit(parsed.value.amount, parsed.value.splitCount)
    };

    setEntries((prev) => [nextEntry, ...prev]);
    setAutoExpandedEntryId(nextEntry.id);
    showActionToast("Transaksi ditambahkan");
    dismissRecallForSession();
    setQuickInput("");
    setRecallInputPrimed(false);
    setQuickError(null);
    setShowQuickWarningDetails(false);
    window.requestAnimationFrame(() => {
      quickInputRef.current?.focus();
      recordQuickAddAck(performance.now() - submitStartedAt);
    });
  }

  function handleBulkSave() {
    const lines = bulkInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const nextEntries: Entry[] = [];
    for (const line of lines) {
      const entry = buildEntry(line, "bulk_paste");
      if (entry) {
        nextEntries.push(entry);
      }
    }

    if (nextEntries.length === 0) {
      return;
    }

    setEntries((prev) => [...nextEntries.reverse(), ...prev]);
    showActionToast(`${nextEntries.length} transaksi ditambahkan`);
    dismissRecallForSession();
    setRecallInputPrimed(false);
    setBulkInput("");
    setBulkOpen(false);
  }

  function updateEntry(
    entryId: string,
    updater: (entry: Entry) => Entry,
    toastMessage?: string
  ) {
    let didUpdate = false;
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }
        didUpdate = true;
        return {
          ...updater(entry),
          updatedAt: new Date().toISOString()
        };
      })
    );
    if (didUpdate && toastMessage) {
      showActionToast(toastMessage);
    }
  }

  function handleCategoryChange(entry: Entry, category: Category) {
    updateEntry(entry.id, (current) => ({
      ...current,
      category
    }), "Kategori diperbarui");
    setRules((prev) => updateCategoryRule(prev, entry.text, category));
  }

  function handleDelete(entryId: string) {
    let didDelete = false;
    setEntries((prev) => {
      const deletedIndex = prev.findIndex((entry) => entry.id === entryId);
      if (deletedIndex === -1) {
        return prev;
      }

      pendingUndoRef.current = {
        entry: prev[deletedIndex],
        index: deletedIndex,
        expiresAt: Date.now() + 6_000
      };
      didDelete = true;
      return prev.filter((current) => current.id !== entryId);
    });
    if (didDelete) {
      showActionToast("Transaksi dihapus");
    }
  }

  function handleUndoDelete() {
    if (!undoToast) {
      return;
    }

    setEntries((prev) => {
      const next = [...prev];
      const insertIndex = Math.max(0, Math.min(undoToast.index, next.length));
      next.splice(insertIndex, 0, undoToast.entry);
      return next;
    });
    setUndoToast(null);
  }

  function handleExportBackup() {
    const payload = createBackupPayload(entries, rules, appVersion);
    downloadBackupFile(payload);
    setBackupMessage("Backup berhasil diekspor.");
  }

  async function handleImportBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const result = importBackupFromText({
        raw,
        currentEntries: entries,
        currentRules: rules,
        mode: replaceOnImport ? "replace" : "merge"
      });

      if (!result.ok) {
        setBackupMessage(result.message);
      } else {
        setEntries(result.entries);
        setRules(result.rules);
        clearStorageHealthWarnings();
        setStorageWarning(null);
        setBackupMessage(result.message);
        showActionToast("Import backup berhasil");
      }
    } catch {
      setBackupMessage("File backup tidak bisa dibaca.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="page safe-top app-shell">
      <h1 className="title">KeMana</h1>
      <p className="subtitle">Biar tau uangmu kemana, yuk catat</p>
      {storageWarning ? <div className="storage-warning">{storageWarning}</div> : null}

      {/* Section: Quick Add Composer */}
      <QuickAddComposer
        lastEntryAt={lastEntryAt}
        smartRecallPrompt={smartRecallPrompt}
        onRecallAddRecent={handleRecallAddRecent}
        onRecallDismiss={handleRecallDismiss}
        quickInputRef={quickInputRef}
        quickInput={quickInput}
        onQuickInputChange={(value) => {
          setQuickInput(value);
          setQuickError(null);
          setShowQuickWarningDetails(false);
        }}
        quickInputPlaceholder={quickInputPlaceholder}
        onQuickInputBlur={() => {
          if (!quickInput.trim()) {
            setRecallInputPrimed(false);
          }
        }}
        onQuickAdd={handleQuickAdd}
        adaptiveHints={adaptiveHints}
        quickPreview={quickPreview}
        quickPreviewTextParts={quickPreviewTextParts}
        quickPreviewSubtitleBreakdown={quickPreviewSubtitleBreakdown}
        quickPreviewSubtitleItems={quickPreviewSubtitleItems}
        summedAmountMeta={summedAmountMeta}
        isSummationInput={isSummationInput}
        showQuickWarningDetails={showQuickWarningDetails}
        onToggleQuickWarningDetails={() => setShowQuickWarningDetails((prev) => !prev)}
        quickError={quickError}
        bulkOpen={bulkOpen}
        onToggleBulkOpen={() => setBulkOpen((prev) => !prev)}
        bulkInput={bulkInput}
        onBulkInputChange={setBulkInput}
        validBulkCount={validBulkCount}
        bulkPreview={bulkPreview}
        onBulkSave={handleBulkSave}
      />

      <section className="data-tools" aria-label="Data backup">
        <div className="data-tools-row">
          <div className="hint subtle">Data</div>
          <button className="btn secondary btn-sm" type="button" onClick={handleExportBackup}>
            Export Backup
          </button>
          <button
            className="btn secondary btn-sm"
            type="button"
            onClick={() => importFileRef.current?.click()}
          >
            Import Backup
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={handleImportBackup}
          />
        </div>
        <label className="data-tools-toggle">
          <input
            type="checkbox"
            checked={replaceOnImport}
            onChange={(event) => setReplaceOnImport(event.target.checked)}
          />
          <span>Ganti semua data saat import</span>
        </label>
        <div className="hint subtle">Backup disimpan sebagai file .json</div>
        {backupMessage ? <div className="hint subtle">{backupMessage}</div> : null}
      </section>

      {/* Section: Summary Header */}
      <SummaryHeader
        filterOptions={FILTER_OPTIONS}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        summary={summaryStats}
      />
      {showNightCloseBar ? (
        <NightCloseBar
          subtitle={nightCloseCopy.subtitle}
          onReview={() => setNightClosePanelOpen(true)}
          onClose={handleNightCloseBarClose}
        />
      ) : null}
      {nightCloseConfirmation ? (
        <div className="night-close-inline-confirmation">{nightCloseConfirmation}</div>
      ) : null}

      {/* Section: Entries List */}
      <EntriesList
        filteredEntries={filteredEntries}
        entriesCount={entries.length}
        orderedDates={orderedDates}
        groupedEntries={groupedEntries}
        dailyTotal={dailyTotal}
        highlightEntryId={highlightEntryId}
        autoExpandedEntryId={autoExpandedEntryId}
        onAutoExpandHandled={(entryId) =>
          setAutoExpandedEntryId((current) => (current === entryId ? null : current))
        }
        onDelete={handleDelete}
        onUpdate={updateEntry}
        onDateChanged={handleEntryDateChanged}
        onCategoryChange={handleCategoryChange}
      />

      {undoToast ? (
        <div className="undo-toast">
          <span>Dihapus</span>
          <button className="undo-link" type="button" onClick={handleUndoDelete}>
            Undo
          </button>
        </div>
      ) : null}
      {actionToast ? (
        <div className={`action-toast ${undoToast ? "with-undo" : ""}`} role="status" aria-live="polite">
          {actionToast.message}
        </div>
      ) : null}
      {movedToast ? (
        <div
          className={`moved-toast ${undoToast ? "with-undo" : ""} ${actionToast ? "with-action" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span>
            {movedToast.movedOutOfFilter
              ? `Tanggal disimpan. Dipindah ke ${movedToast.label} (di luar filter aktif).`
              : `Tanggal disimpan. Dipindah ke ${movedToast.label}`}
          </span>
          <button className="moved-link" type="button" onClick={handleMovedToastSee}>
            Lihat
          </button>
        </div>
      ) : null}
      <NightClosePanel
        open={nightClosePanelOpen}
        dateLabel={`Hari ini • ${nightCloseTodayStats.dateISO}`}
        total={nightCloseTodayStats.total}
        count={nightCloseTodayStats.count}
        topCategory={nightCloseTopCategory}
        promptLine={nightCloseCopy.promptLine}
        onClose={() => setNightClosePanelOpen(false)}
        onDone={handleNightCloseDoneFromPanel}
        onAddEntry={handleNightCloseAddEntry}
      />

      <footer className="app-version" aria-label="Versi aplikasi">
        v{appVersion}
      </footer>
    </main>
  );
}
