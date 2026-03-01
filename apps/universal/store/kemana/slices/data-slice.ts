import { resolveUpdater } from "../helpers";
import type { DataSlice, KemanaSliceCreator } from "../types";

export const createDataSlice: KemanaSliceCreator<DataSlice> = (set) => ({
  isStorageReady: false,
  entries: [],
  rules: [],
  storageWarning: null,
  setIsStorageReady: (next) =>
    set((state) => ({ isStorageReady: resolveUpdater(next, state.isStorageReady) })),
  setEntries: (next) => set((state) => ({ entries: resolveUpdater(next, state.entries) })),
  setRules: (next) => set((state) => ({ rules: resolveUpdater(next, state.rules) })),
  setStorageWarning: (next) =>
    set((state) => ({ storageWarning: resolveUpdater(next, state.storageWarning) }))
});
