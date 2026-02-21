import { resolveUpdater } from "../helpers";
import type { KemanaSliceCreator, UiSlice } from "../types";

export const createUiSlice: KemanaSliceCreator<UiSlice> = (set) => ({
  backupMessage: null,
  replaceOnImport: false,
  dateFilter: "today",
  autoExpandedEntryId: null,
  pendingScrollToId: null,
  highlightEntryId: null,
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
    set((state) => ({ highlightEntryId: resolveUpdater(next, state.highlightEntryId) }))
});
