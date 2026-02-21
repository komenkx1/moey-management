import { resolveUpdater } from "../helpers";
import type { HabitSlice, KemanaSliceCreator } from "../types";

export const createHabitSlice: KemanaSliceCreator<HabitSlice> = (set) => ({
  lastAppOpenAt: null,
  recallDismissedInSession: false,
  isRecallSessionReady: false,
  nightCloseClosedAt: null,
  isNightCloseReady: false,
  nightClosePanelOpen: false,
  nightCloseConfirmation: null,
  setLastAppOpenAt: (next) =>
    set((state) => ({ lastAppOpenAt: resolveUpdater(next, state.lastAppOpenAt) })),
  setRecallDismissedInSession: (next) =>
    set((state) => ({ recallDismissedInSession: resolveUpdater(next, state.recallDismissedInSession) })),
  setIsRecallSessionReady: (next) =>
    set((state) => ({ isRecallSessionReady: resolveUpdater(next, state.isRecallSessionReady) })),
  setNightCloseClosedAt: (next) =>
    set((state) => ({ nightCloseClosedAt: resolveUpdater(next, state.nightCloseClosedAt) })),
  setIsNightCloseReady: (next) =>
    set((state) => ({ isNightCloseReady: resolveUpdater(next, state.isNightCloseReady) })),
  setNightClosePanelOpen: (next) =>
    set((state) => ({ nightClosePanelOpen: resolveUpdater(next, state.nightClosePanelOpen) })),
  setNightCloseConfirmation: (next) =>
    set((state) => ({ nightCloseConfirmation: resolveUpdater(next, state.nightCloseConfirmation) }))
});
