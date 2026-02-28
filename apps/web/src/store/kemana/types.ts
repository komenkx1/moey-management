import type { CategoryRules, Entry } from "@kemana/core/types";
import type { StateCreator } from "zustand";
import type { DateFilterPreset, CustomDateRange } from "@/lib/kemana-utils";
import type { AddTransactionSubmitPayload } from "@/components/kemana-ui/AddTransactionSheet";
export type Updater<T> = T | ((prev: T) => T);

export interface DataSlice {
  isStorageReady: boolean;
  entries: Entry[];
  rules: CategoryRules;
  storageWarning: string | null;
  setIsStorageReady: (next: Updater<boolean>) => void;
  setEntries: (next: Updater<Entry[]>) => void;
  setRules: (next: Updater<CategoryRules>) => void;
  setStorageWarning: (next: Updater<string | null>) => void;
}

export interface UiSlice {
  backupMessage: string | null;
  replaceOnImport: boolean;
  dateFilter: DateFilterPreset;
  autoExpandedEntryId: string | null;
  pendingScrollToId: string | null;
  highlightEntryId: string | null;

  // Dashboard UI State
  activeTab: string;
  expandedIds: Set<string>;
  isAddSheetOpen: boolean;
  sheetPrefill: Partial<AddTransactionSubmitPayload> | null;
  isDataToolsSheetOpen: boolean;
  homePendingScrollId: string | null;
  isDarkMode: boolean;
  userName: string;
  nameDraft: string;
  isNamePromptOpen: boolean;
  notesRenderCount: number;
  customDateRange: CustomDateRange;
  isTrendChartOverflowing: boolean;

  setBackupMessage: (next: Updater<string | null>) => void;
  setReplaceOnImport: (next: Updater<boolean>) => void;
  setDateFilter: (next: Updater<DateFilterPreset>) => void;
  setAutoExpandedEntryId: (next: Updater<string | null>) => void;
  setPendingScrollToId: (next: Updater<string | null>) => void;
  setHighlightEntryId: (next: Updater<string | null>) => void;

  setActiveTab: (next: Updater<string>) => void;
  setExpandedIds: (next: Updater<Set<string>>) => void;
  setIsAddSheetOpen: (next: Updater<boolean>) => void;
  setSheetPrefill: (next: Updater<Partial<AddTransactionSubmitPayload> | null>) => void;
  setIsDataToolsSheetOpen: (next: Updater<boolean>) => void;
  setHomePendingScrollId: (next: Updater<string | null>) => void;
  setIsDarkMode: (next: Updater<boolean>) => void;
  setUserName: (next: Updater<string>) => void;
  setNameDraft: (next: Updater<string>) => void;
  setIsNamePromptOpen: (next: Updater<boolean>) => void;
  setNotesRenderCount: (next: Updater<number>) => void;
  setCustomDateRange: (next: Updater<CustomDateRange>) => void;
  setIsTrendChartOverflowing: (next: Updater<boolean>) => void;
}

export interface ComposerSlice {
  quickInput: string;
  debouncedQuickInput: string;
  quickError: string | null;
  showQuickWarningDetails: boolean;
  bulkOpen: boolean;
  bulkInput: string;
  recallInputPrimed: boolean;
  setQuickInput: (next: Updater<string>) => void;
  setDebouncedQuickInput: (next: Updater<string>) => void;
  setQuickError: (next: Updater<string | null>) => void;
  setShowQuickWarningDetails: (next: Updater<boolean>) => void;
  setBulkOpen: (next: Updater<boolean>) => void;
  setBulkInput: (next: Updater<string>) => void;
  setRecallInputPrimed: (next: Updater<boolean>) => void;
}

export interface HabitSlice {
  lastAppOpenAt: number | null;
  recallDismissedInSession: boolean;
  isRecallSessionReady: boolean;
  nightCloseClosedAt: string | null;
  isNightCloseReady: boolean;
  nightClosePanelOpen: boolean;
  nightCloseConfirmation: string | null;
  setLastAppOpenAt: (next: Updater<number | null>) => void;
  setRecallDismissedInSession: (next: Updater<boolean>) => void;
  setIsRecallSessionReady: (next: Updater<boolean>) => void;
  setNightCloseClosedAt: (next: Updater<string | null>) => void;
  setIsNightCloseReady: (next: Updater<boolean>) => void;
  setNightClosePanelOpen: (next: Updater<boolean>) => void;
  setNightCloseConfirmation: (next: Updater<string | null>) => void;
}

export type KemanaStoreState = DataSlice & UiSlice & ComposerSlice & HabitSlice;

export type KemanaSliceCreator<TSlice> = StateCreator<KemanaStoreState, [], [], TSlice>;
