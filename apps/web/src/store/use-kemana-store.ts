"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createComposerSlice } from "./kemana/slices/composer-slice";
import { createDataSlice } from "./kemana/slices/data-slice";
import { createHabitSlice } from "./kemana/slices/habit-slice";
import { createUiSlice } from "./kemana/slices/ui-slice";
import type { KemanaStoreState } from "./kemana/types";

export type { ActionToastState, MovedToastState, UndoToastState } from "./kemana/types";

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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        dateFilter: state.dateFilter,
        replaceOnImport: state.replaceOnImport
      })
    }
  )
);
