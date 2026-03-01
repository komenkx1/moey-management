import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Moon, Sun, Settings, ChevronRight } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Kemana Data Store
import { useEntries, useRules, useThemeState, useNightCloseState } from '@/store/kemana/hooks-granular';
import { parseQuickAdd } from '@kemana/core/parser';
import { inferCategory } from '@kemana/core/rules';
import { createEntryId } from '@/lib/dashboard-page-helpers';
import { getSummaryStats } from '@/lib/kemana-utils';
import { createBackupPayload, importBackupFromText, clearStorageHealthWarnings } from '@kemana/storage';
import { generateCsvString, importEntriesFromCsv } from '@/lib/dashboard-page-entry-utils';
import { useNightClose } from '@/hooks/useNightClose';

// universal components
// universal components
import QuickAddComposer from '@/components/QuickAddComposer';
import SummaryHeroCard from '@/components/SummaryHeroCard';
import HomeRecentActivitySection from '@/components/HomeRecentActivitySection';
import { AddTransactionSheet, type AddTransactionSubmitPayload } from '@/components/AddTransactionSheet';
import { BulkInputSheet, type BulkPreviewLine } from '@/components/BulkInputSheet';
import { DataToolsSheet } from '@/components/DataToolsSheet';
import { NightCloseReviewSheet } from '@/components/NightCloseReviewSheet';
import QuickRecallChips from '@/components/QuickRecallChips';
import ContextBanner from '@/components/ContextBanner';
import { makeInitialSplit } from '@/lib/kemana-utils';
import type { Entry, ParseQuickAddResult, CategoryRules } from '@kemana/core/types';

// Example suggestions
const DEFAULT_SUGGESTIONS = ['makan 25k', 'gojek 14k', 'kopi 18k'];
const DEFAULT_TEMPLATES = [
  { id: '1', sample: 'nasi padang 25', description: 'Makan' },
  { id: '2', sample: 'gojek kantor 14', description: 'Transport' },
];

export default function HomeScreen() {
  const { entries, setEntries } = useEntries();
  const { rules, setRules } = useRules();
  const { isDarkMode, setIsDarkMode } = useThemeState();
  const [quickInput, setQuickInput] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [showWarningDetails, setShowWarningDetails] = useState(false);

  // Sheet State
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [addSheetPrefill, setAddSheetPrefill] = useState<any>(null);

  // Bulk Input State
  const [isBulkSheetOpen, setIsBulkSheetOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState("");

  // Data Tools State
  const [isDataToolsSheetOpen, setIsDataToolsSheetOpen] = useState(false);
  const [replaceOnImport, setReplaceOnImport] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const {
    nightCloseClosedAt,
    setNightCloseClosedAt,
    isNightCloseReady,
    nightClosePanelOpen,
    setNightClosePanelOpen,
    setNightCloseConfirmation
  } = useNightCloseState();

  // Missing Hooks for Parity:
  // User Profile
  const userName = "User"; // Mock or retrieve from storage appropriately if `useUserProfile` isn't accessible

  // Recall Session & Suggestions Mockup (Web parity logic for native)
  // In a full native port, these would correspond to the kemana hooks. 
  // We'll create local state to mimic them for now if the granular hooks are web-only.
  const [showSmartRecall, setShowSmartRecall] = useState(false);
  const [showSuggestionCard, setShowSuggestionCard] = useState(true);
  const [adaptiveHints, setAdaptiveHints] = useState<string[]>([]);
  const adaptiveRecallItems = [
    { id: "r1", category: "Makan", title: "Nasi padang", amount: 25000 },
    { id: "r2", category: "Transport", title: "Gojek kantor", amount: 14000 }
  ];

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

  const handleNightCloseAddEntry = useCallback(() => {
    setNightClosePanelOpen(false);
    setAddSheetPrefill(null);
    setIsAddSheetOpen(true);
  }, [setNightClosePanelOpen]);

  // Parse instantly
  const quickPreview = useMemo(() => {
    if (!quickInput.trim()) return null;
    return parseQuickAdd(quickInput, new Date(), 'quick_add');
  }, [quickInput]);

  // Bulk Data Parsing
  const bulkDraftLines = useMemo(() => {
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

  // Derived state
  const summaryStats = useMemo(() => {
    return getSummaryStats({
      allEntries: entries,
      filteredEntries: entries,
      preset: '30d',
    });
  }, [entries]);

  const handleQuickAddSubmit = useCallback(() => {
    if (!quickInput.trim()) {
      setQuickError("Tulis pengeluaran dulu. Contoh: makan mie 20k");
      return;
    }
    const parsed = parseQuickAdd(quickInput, new Date(), 'quick_add');
    if (!parsed.ok) {
      setQuickError(parsed.reason);
      return;
    }

    // Valid Add
    const newEntry = {
      id: createEntryId(),
      text: parsed.value.text,
      amount: parsed.value.amount,
      rawInput: parsed.value.rawInput,
      date: parsed.value.date,
      category: inferCategory(parsed.value.text, rules),
      paymentMethod: 'Unknown' as any,
      source: 'quick_add' as any,
      parseWarnings: parsed.warnings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEntries(prev => [newEntry, ...prev]);
    setQuickInput('');
    setQuickError(null);
  }, [quickInput, rules, setEntries]);

  const handleEditEntry = useCallback((entry: any) => {
    setAddSheetPrefill({
      id: entry.id, // custom injected
      type: 'expense',
      amount: entry.amount,
      category: entry.category,
      title: entry.text,
      note: entry.note || '',
      payment: entry.paymentMethod,
      date: entry.date,
      split: entry.split,
      source: entry.source,
      createdAt: entry.createdAt,
    });
    setIsAddSheetOpen(true);
  }, []);

  const handleSaveTransaction = useCallback((data: AddTransactionSubmitPayload & { id?: string }) => {
    const id = addSheetPrefill?.id || createEntryId();
    const newEntry = {
      id,
      text: data.title || data.category,
      amount: data.amount,
      rawInput: data.rawInput,
      date: data.date,
      category: data.category as any,
      paymentMethod: (data.payment || 'Cash') as any,
      split: data.split,
      source: addSheetPrefill?.source || 'quick_add',
      createdAt: addSheetPrefill?.id ? addSheetPrefill.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEntries(prev => {
      const exists = prev.some(e => e.id === id);
      if (exists) {
        return prev.map(e => e.id === id ? { ...e, ...newEntry } : e);
      }
      return [newEntry, ...prev];
    });
    setIsAddSheetOpen(false);
    setAddSheetPrefill(null);
  }, [addSheetPrefill, setEntries]);

  const handleSaveBulk = useCallback(() => {
    const validLines = bulkDraftLines.filter(
      (line): line is any => line.ok && Boolean(line.parsed)
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

    setEntries((prev) => [...newEntries.reverse(), ...prev]);
    setBulkInput("");
    setIsBulkSheetOpen(false);
  }, [bulkDraftLines, rules, setEntries]);

  const handleExportJson = useCallback(async () => {
    try {
      const payload = createBackupPayload(entries, rules, "kemana-universal");
      const jsonStr = JSON.stringify(payload, null, 2);
      const date = payload.meta.exportedAt.slice(0, 10);
      // @ts-expect-error known expo-file-system typing discrepancy
      const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + `kemana-backup-${date}.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonStr, { encoding: 'utf8' });
      await Sharing.shareAsync(fileUri);
      setBackupMessage("Backup JSON siap dibagikan.");
    } catch {
      setBackupMessage("Gagal export JSON.");
    }
  }, [entries, rules]);

  const handleExportCsv = useCallback(async () => {
    try {
      const csvStr = generateCsvString(entries);
      const date = new Date().toISOString().slice(0, 10);
      // @ts-expect-error known expo-file-system typing discrepancy
      const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + `kemana-export-${date}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvStr, { encoding: 'utf8' });
      await Sharing.shareAsync(fileUri);
      setBackupMessage("Export CSV siap dibagikan.");
    } catch {
      setBackupMessage("Gagal export CSV.");
    }
  }, [entries]);

  const handleImportFile = useCallback(async (raw: string, fileName: string) => {
    try {
      const importMode = replaceOnImport ? "replace" : "merge";
      const normalizedName = fileName.trim().toLowerCase();
      const trimmedRaw = raw.trim();
      const isLikelyCsvFile =
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
          setBackupMessage(jsonResult.message);
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
        setBackupMessage(csvResult.message);
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
        setBackupMessage(jsonFallback.message);
        return;
      }

      setBackupMessage(csvResult.message || jsonFallback.message || "Format file import belum didukung.");
    } catch {
      setBackupMessage("Gagal membaca file import.");
    }
  }, [entries, rules, replaceOnImport, setEntries, setRules]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 bg-bg-base" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header App Bar Minimal */}
        <View className="flex flex-row items-center justify-between px-5 py-4 mt-2">
          <Pressable onPress={() => {/* Future: Open Name Edit Prompt */ }}>
            <Text className="text-2xl font-bold text-gray-900">KeMana</Text>
            <Text className="text-sm text-gray-500">Halo, User</Text>
          </Pressable>
          <View className="flex-row items-center gap-3">
            <Settings size={24} color="#6B7280" onPress={() => setIsDataToolsSheetOpen(true)} />
            <Pressable
              onPress={() => setIsDarkMode(!isDarkMode)}
              className="h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm"
            >
              {isDarkMode ? <Moon size={20} color="#1d4ed8" /> : <Sun size={20} color="#d97706" />}
            </Pressable>
          </View>
        </View>

        <View className="px-5 flex flex-col gap-6 mt-4">

          {/* Smart Recall Prompt */}
          {showSmartRecall && (
            <ContextBanner
              variant="recall"
              title="Belum catat dari kemarin?"
              subtitle="Terakhir: Nasi Goreng • Rp20.000"
              actionLabel="Tambah lagi"
              onAction={() => setShowSmartRecall(false)}
              secondaryActionLabel="Nanti"
              onSecondaryAction={() => setShowSmartRecall(false)}
            />
          )}

          {/* Suggestion Prompt */}
          {showSuggestionCard && (
            <ContextBanner
              variant="nightClose" // Using blue theme for suggestions
              title="Saran"
              subtitle="Nasi padang sekitar Rp25.000."
              actionLabel="Pakai"
              onAction={() => {
                setQuickInput("Nasi padang 25k");
                setShowSuggestionCard(false);
              }}
            />
          )}

          {/* Night Close Prompt */}
          {showNightCloseBar && (
            <ContextBanner
              variant="nightClose"
              title="Tutup hari ini"
              subtitle={nightCloseDateLabel}
              actionLabel="Review sekarang"
              onAction={() => setNightClosePanelOpen(true)}
              secondaryActionLabel="Tutup"
              onSecondaryAction={() => handleNightCloseBarClose()}
            />
          )}

          {/* Quick Recall Chips (Horizontal Scroll) */}
          <View className="-mx-5 px-5 py-1">
            <QuickRecallChips
              items={adaptiveRecallItems}
              onSelect={(item) => {
                setQuickInput(`${item.title} ${item.amount / 1000}k `);
              }}
            />
          </View>

          <SummaryHeroCard
            expense={summaryStats.totalAmount}
            transactionCount={summaryStats.entryCount}
            averagePerDay={summaryStats.sevenDayAverage}
            periodLabel={summaryStats.periodLabel}
          />

          <QuickAddComposer
            quickInput={quickInput}
            quickInputPlaceholder="Catat pengeluaran... (makan 25k)"
            onQuickInputChange={setQuickInput}
            onQuickInputSubmit={handleQuickAddSubmit}
            onOpenBulk={() => setIsBulkSheetOpen(true)}
            showQuickFormatTemplates={quickInput.trim().length > 0}
            quickFormatTemplates={DEFAULT_TEMPLATES}
            onApplyQuickFormatTemplate={(t) => setQuickInput(t + ' ')}
            quickHistorySuggestions={quickInput.trim().length === 0 ? DEFAULT_SUGGESTIONS : []}
            onApplyQuickHistorySuggestion={(t) => {
              setQuickInput(t + ' ');
            }}
            quickPreview={quickPreview}
            showQuickWarningDetails={showWarningDetails}
            onToggleQuickWarningDetails={() => setShowWarningDetails(!showWarningDetails)}
            adaptiveHints={adaptiveHints}
            quickError={quickError}
          />

          <HomeRecentActivitySection
            entries={entries}
            onSaveEntry={(entryId, updates) => {
              setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e));
            }}
            onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))}
            onViewAll={() => { }}
            inferCategoryFromText={(text) => inferCategory(text, rules)}
          />
        </View>

      </ScrollView>

      <AddTransactionSheet
        isOpen={isAddSheetOpen}
        onClose={() => {
          setIsAddSheetOpen(false);
          setAddSheetPrefill(null);
        }}
        onSave={handleSaveTransaction}
        prefill={addSheetPrefill}
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
        onClose={() => setNightClosePanelOpen(false)}
        dateLabel={`Hari ini • ${nightCloseDateLabel}`}
        total={nightCloseTodayStats.total}
        count={nightCloseTodayStats.count}
        promptLine={nightCloseCopy.promptLine}
        topCategory={nightCloseTopCategory}
        onDone={handleNightCloseDoneFromPanel}
        onAddEntry={handleNightCloseAddEntry}
      />
    </SafeAreaView>
  );
}
