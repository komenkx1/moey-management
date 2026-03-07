import { resolveUpdater } from "../helpers";
import type { DataSlice, KemanaSliceCreator } from "../types";

export const createDataSlice: KemanaSliceCreator<DataSlice> = (set) => ({
  isStorageReady: false,
  entries: [],
  rules: [],
  storageWarning: null,
  syncStatus: 'idle',
  pendingSyncCount: 0,
  lastSyncTime: null,
  setIsStorageReady: (next) =>
    set((state) => ({ isStorageReady: resolveUpdater(next, state.isStorageReady) })),
  setEntries: (next) => set((state) => ({ entries: resolveUpdater(next, state.entries) })),
  setRules: (next) => set((state) => ({ rules: resolveUpdater(next, state.rules) })),
  setStorageWarning: (next) =>
    set((state) => ({ storageWarning: resolveUpdater(next, state.storageWarning) })),
  setSyncStatus: (next) => set((state) => ({ syncStatus: resolveUpdater(next, state.syncStatus) })),
  setPendingSyncCount: (next) => set((state) => ({ pendingSyncCount: resolveUpdater(next, state.pendingSyncCount) })),
  setLastSyncTime: (next) => set((state) => ({ lastSyncTime: resolveUpdater(next, state.lastSyncTime) }))
});
