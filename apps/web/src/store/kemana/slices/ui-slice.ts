import { resolveUpdater } from "../helpers";
import type { KemanaSliceCreator, UiSlice } from "../types";
import { getDefaultCustomDateRange } from "@/lib/kemana-utils";
import { NOTES_RENDER_CHUNK } from "@/lib/constants";

export const createUiSlice: KemanaSliceCreator<UiSlice> = (set) => ({
  backupMessage: null,
  replaceOnImport: false,
  dateFilter: "today",
  autoExpandedEntryId: null,
  pendingScrollToId: null,
  highlightEntryId: null,

  // Dashboard UI Initial State
  activeTab: "home",
  expandedIds: new Set<string>(),
  isAddSheetOpen: false,
  sheetPrefill: null,
  isDataToolsSheetOpen: false,
  homePendingScrollId: null,
  isDarkMode: false,
  userName: "",
  nameDraft: "",
  isNamePromptOpen: false,
  notesRenderCount: NOTES_RENDER_CHUNK,
  customDateRange: getDefaultCustomDateRange(),
  isTrendChartOverflowing: false,

  setBackupMessage: (next) =>
    set((state) => ({ backupMessage: resolveUpdater(next, state.backupMessage) })),
  setReplaceOnImport: (next) =>
    set((state) => ({ replaceOnImport: resolveUpdater(next, state.replaceOnImport) })),
  setDateFilter: (next) => set((state) => ({ dateFilter: resolveUpdater(next, state.dateFilter) })),
  setAutoExpandedEntryId: (next) =>
    set((state) => ({ autoExpandedEntryId: resolveUpdater(next, state.autoExpandedEntryId) })),
  setPendingScrollToId: (next) =>
    set((state) => ({ pendingScrollToId: resolveUpdater(next, state.pendingScrollToId) })),
  setHighlightEntryId: (next) =>
    set((state) => ({ highlightEntryId: resolveUpdater(next, state.highlightEntryId) })),

  // Dashboard UI Setters
  setActiveTab: (next) => set((state) => ({ activeTab: resolveUpdater(next, state.activeTab) })),
  setExpandedIds: (next) => set((state) => ({ expandedIds: resolveUpdater(next, state.expandedIds) })),
  setIsAddSheetOpen: (next) => set((state) => ({ isAddSheetOpen: resolveUpdater(next, state.isAddSheetOpen) })),
  setSheetPrefill: (next) => set((state) => ({ sheetPrefill: resolveUpdater(next, state.sheetPrefill) })),
  setIsDataToolsSheetOpen: (next) => set((state) => ({ isDataToolsSheetOpen: resolveUpdater(next, state.isDataToolsSheetOpen) })),
  setHomePendingScrollId: (next) => set((state) => ({ homePendingScrollId: resolveUpdater(next, state.homePendingScrollId) })),
  setIsDarkMode: (next) => set((state) => ({ isDarkMode: resolveUpdater(next, state.isDarkMode) })),
  setUserName: (next) => set((state) => ({ userName: resolveUpdater(next, state.userName) })),
  setNameDraft: (next) => set((state) => ({ nameDraft: resolveUpdater(next, state.nameDraft) })),
  setIsNamePromptOpen: (next) => set((state) => ({ isNamePromptOpen: resolveUpdater(next, state.isNamePromptOpen) })),
  setNotesRenderCount: (next) => set((state) => ({ notesRenderCount: resolveUpdater(next, state.notesRenderCount) })),
  setCustomDateRange: (next) => set((state) => ({ customDateRange: resolveUpdater(next, state.customDateRange) })),
  setIsTrendChartOverflowing: (next) => set((state) => ({ isTrendChartOverflowing: resolveUpdater(next, state.isTrendChartOverflowing) }))
});
