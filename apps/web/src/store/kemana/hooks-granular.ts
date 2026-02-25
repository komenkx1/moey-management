import { useShallow } from "zustand/react/shallow";
import { useKemanaStore } from "../use-kemana-store";

/**
 * Granular store hooks to reduce unnecessary re-renders
 * Each hook only subscribes to the specific slice of state it needs
 */

// Data slice hooks
export function useEntries() {
  return useKemanaStore(useShallow((state) => ({
    entries: state.entries,
    setEntries: state.setEntries
  })));
}

export function useRules() {
  return useKemanaStore(useShallow((state) => ({
    rules: state.rules,
    setRules: state.setRules
  })));
}

export function useStorageState() {
  return useKemanaStore(useShallow((state) => ({
    isStorageReady: state.isStorageReady,
    setIsStorageReady: state.setIsStorageReady,
    storageWarning: state.storageWarning,
    setStorageWarning: state.setStorageWarning
  })));
}

// UI slice hooks
export function useDateFilter() {
  return useKemanaStore(useShallow((state) => ({
    dateFilter: state.dateFilter,
    setDateFilter: state.setDateFilter
  })));
}

export function useScrollState() {
  return useKemanaStore(useShallow((state) => ({
    pendingScrollToId: state.pendingScrollToId,
    setPendingScrollToId: state.setPendingScrollToId,
    highlightEntryId: state.highlightEntryId,
    setHighlightEntryId: state.setHighlightEntryId
  })));
}

export function useBackupState() {
  return useKemanaStore(useShallow((state) => ({
    backupMessage: state.backupMessage,
    setBackupMessage: state.setBackupMessage,
    replaceOnImport: state.replaceOnImport,
    setReplaceOnImport: state.setReplaceOnImport
  })));
}

// Composer slice hooks
export function useQuickInput() {
  return useKemanaStore(useShallow((state) => ({
    quickInput: state.quickInput,
    setQuickInput: state.setQuickInput,
    debouncedQuickInput: state.debouncedQuickInput,
    setDebouncedQuickInput: state.setDebouncedQuickInput
  })));
}

export function useQuickInputError() {
  return useKemanaStore(useShallow((state) => ({
    quickError: state.quickError,
    setQuickError: state.setQuickError,
    showQuickWarningDetails: state.showQuickWarningDetails,
    setShowQuickWarningDetails: state.setShowQuickWarningDetails
  })));
}

export function useBulkInput() {
  return useKemanaStore(useShallow((state) => ({
    bulkOpen: state.bulkOpen,
    setBulkOpen: state.setBulkOpen,
    bulkInput: state.bulkInput,
    setBulkInput: state.setBulkInput
  })));
}

export function useRecallState() {
  return useKemanaStore(useShallow((state) => ({
    recallInputPrimed: state.recallInputPrimed,
    setRecallInputPrimed: state.setRecallInputPrimed
  })));
}

// Habit slice hooks
export function useRecallSession() {
  return useKemanaStore(useShallow((state) => ({
    lastAppOpenAt: state.lastAppOpenAt,
    setLastAppOpenAt: state.setLastAppOpenAt,
    recallDismissedInSession: state.recallDismissedInSession,
    setRecallDismissedInSession: state.setRecallDismissedInSession,
    isRecallSessionReady: state.isRecallSessionReady,
    setIsRecallSessionReady: state.setIsRecallSessionReady
  })));
}

export function useNightCloseState() {
  return useKemanaStore(useShallow((state) => ({
    nightCloseClosedAt: state.nightCloseClosedAt,
    setNightCloseClosedAt: state.setNightCloseClosedAt,
    isNightCloseReady: state.isNightCloseReady,
    setIsNightCloseReady: state.setIsNightCloseReady,
    nightClosePanelOpen: state.nightClosePanelOpen,
    setNightClosePanelOpen: state.setNightClosePanelOpen,
    nightCloseConfirmation: state.nightCloseConfirmation,
    setNightCloseConfirmation: state.setNightCloseConfirmation
  })));
}
