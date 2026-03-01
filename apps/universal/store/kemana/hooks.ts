import { useShallow } from "zustand/react/shallow";
import { useKemanaStore } from "../use-kemana-store";

export function useDashboardStoreBindings() {
  return useKemanaStore(
    useShallow((state) => ({
      entries: state.entries,
      setEntries: state.setEntries,
      rules: state.rules,
      setRules: state.setRules,
      isStorageReady: state.isStorageReady,
      setIsStorageReady: state.setIsStorageReady,
      storageWarning: state.storageWarning,
      setStorageWarning: state.setStorageWarning,
      backupMessage: state.backupMessage,
      setBackupMessage: state.setBackupMessage,

      replaceOnImport: state.replaceOnImport,
      setReplaceOnImport: state.setReplaceOnImport,
      dateFilter: state.dateFilter,
      setDateFilter: state.setDateFilter,
      pendingScrollToId: state.pendingScrollToId,
      setPendingScrollToId: state.setPendingScrollToId,
      highlightEntryId: state.highlightEntryId,
      setHighlightEntryId: state.setHighlightEntryId,

      quickInput: state.quickInput,
      setQuickInput: state.setQuickInput,
      debouncedQuickInput: state.debouncedQuickInput,
      setDebouncedQuickInput: state.setDebouncedQuickInput,
      quickError: state.quickError,
      setQuickError: state.setQuickError,
      showQuickWarningDetails: state.showQuickWarningDetails,
      setShowQuickWarningDetails: state.setShowQuickWarningDetails,
      recallInputPrimed: state.recallInputPrimed,
      setRecallInputPrimed: state.setRecallInputPrimed,
      bulkOpen: state.bulkOpen,
      setBulkOpen: state.setBulkOpen,
      bulkInput: state.bulkInput,
      setBulkInput: state.setBulkInput,

      lastAppOpenAt: state.lastAppOpenAt,
      setLastAppOpenAt: state.setLastAppOpenAt,
      recallDismissedInSession: state.recallDismissedInSession,
      setRecallDismissedInSession: state.setRecallDismissedInSession,
      isRecallSessionReady: state.isRecallSessionReady,
      setIsRecallSessionReady: state.setIsRecallSessionReady,

      nightCloseClosedAt: state.nightCloseClosedAt,
      setNightCloseClosedAt: state.setNightCloseClosedAt,
      isNightCloseReady: state.isNightCloseReady,
      setIsNightCloseReady: state.setIsNightCloseReady,
      nightClosePanelOpen: state.nightClosePanelOpen,
      setNightClosePanelOpen: state.setNightClosePanelOpen,
      nightCloseConfirmation: state.nightCloseConfirmation,
      setNightCloseConfirmation: state.setNightCloseConfirmation
    }))
  );
}
