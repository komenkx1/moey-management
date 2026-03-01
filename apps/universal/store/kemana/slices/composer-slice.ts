import { resolveUpdater } from "../helpers";
import type { ComposerSlice, KemanaSliceCreator } from "../types";

export const createComposerSlice: KemanaSliceCreator<ComposerSlice> = (set) => ({
  quickInput: "",
  debouncedQuickInput: "",
  quickError: null,
  showQuickWarningDetails: false,
  bulkOpen: false,
  bulkInput: "",
  recallInputPrimed: false,
  setQuickInput: (next) => set((state) => ({ quickInput: resolveUpdater(next, state.quickInput) })),
  setDebouncedQuickInput: (next) =>
    set((state) => ({ debouncedQuickInput: resolveUpdater(next, state.debouncedQuickInput) })),
  setQuickError: (next) => set((state) => ({ quickError: resolveUpdater(next, state.quickError) })),
  setShowQuickWarningDetails: (next) =>
    set((state) => ({ showQuickWarningDetails: resolveUpdater(next, state.showQuickWarningDetails) })),
  setBulkOpen: (next) => set((state) => ({ bulkOpen: resolveUpdater(next, state.bulkOpen) })),
  setBulkInput: (next) => set((state) => ({ bulkInput: resolveUpdater(next, state.bulkInput) })),
  setRecallInputPrimed: (next) =>
    set((state) => ({ recallInputPrimed: resolveUpdater(next, state.recallInputPrimed) }))
});
