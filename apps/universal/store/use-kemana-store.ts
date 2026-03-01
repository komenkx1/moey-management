"use client";

import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import { createComposerSlice } from "./kemana/slices/composer-slice";
import { createDataSlice } from "./kemana/slices/data-slice";
import { createHabitSlice } from "./kemana/slices/habit-slice";
import { createUiSlice } from "./kemana/slices/ui-slice";
import type { KemanaStoreState } from "./kemana/types";

// Safe dummy storage for Zustand persist to prevent AsyncStorage NativeModule errors in Expo Go
// Since we only partialize non-critical UI state (dateFilter, replaceOnImport),
// in-memory storage is fine for dev/testing. The actual data uses SQLite.
const dummyStorage: StateStorage = {
  getItem: () => null,
  setItem: () => { },
  removeItem: () => { },
};

export const useKemanaStore = create<KemanaStoreState>()(
  persist(
    (...args) => ({
      ...createDataSlice(...args),
      ...createUiSlice(...args),
      ...createComposerSlice(...args),
      ...createHabitSlice(...args)
    }),
    {
      name: "kemana.ui.zustand.v1",
      storage: createJSONStorage(() => dummyStorage),
      partialize: (state) => ({
        dateFilter: state.dateFilter,
        replaceOnImport: state.replaceOnImport
      })
    }
  )
);
