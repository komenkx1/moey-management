import type { CategoryRules, Entry } from "@kemana/core/types";
import type { StateCreator } from "zustand";
import type { DateFilterPreset } from "@/lib/kemana-utils";

export interface UndoToastState {
  entry: Entry;
  index: number;
  expiresAt: number;
}

export interface ActionToastState {
  message: string;
  expiresAt: number;
}

export interface MovedToastState {
  entryId: string;
  targetDate: string;
  label: string;
  movedOutOfFilter: boolean;
  expiresAt: number;
}

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
  actionToast: ActionToastState | null;
  movedToast: MovedToastState | null;
  pendingScrollToId: string | null;
  highlightEntryId: string | null;
  undoToast: UndoToastState | null;
  setBackupMessage: (next: Updater<string | null>) => void;
  setReplaceOnImport: (next: Updater<boolean>) => void;
  setDateFilter: (next: Updater<DateFilterPreset>) => void;
  setAutoExpandedEntryId: (next: Updater<string | null>) => void;
  setActionToast: (next: Updater<ActionToastState | null>) => void;
  setMovedToast: (next: Updater<MovedToastState | null>) => void;
  setPendingScrollToId: (next: Updater<string | null>) => void;
  setHighlightEntryId: (next: Updater<string | null>) => void;
  setUndoToast: (next: Updater<UndoToastState | null>) => void;
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
