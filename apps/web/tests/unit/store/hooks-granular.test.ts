import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useEntries,
  useRules,
  useStorageState,
  useDateFilter,
  useScrollState,
  useBackupState,
  useQuickInput,
  useQuickInputError,
  useBulkInput,
  useRecallState,
  useRecallSession,
  useNightCloseState
} from "@/store/kemana/hooks-granular";
import type { Entry } from "@kemana/core/types";

describe("Granular Store Hooks", () => {
  beforeEach(() => {
    // Reset store state before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("useEntries", () => {
    it("provides entries and setEntries", () => {
      const { result } = renderHook(() => useEntries());

      expect(result.current.entries).toEqual([]);
      expect(typeof result.current.setEntries).toBe("function");
    });

    it("updates entries state", () => {
      const { result } = renderHook(() => useEntries());

      const mockEntry: Entry = {
        id: "test-1",
        amount: 50000,
        date: "2024-01-01",
        category: "Makan",
        text: "Makan siang",
        rawInput: "makan siang 50k",
        source: "quick_add",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      act(() => {
        result.current.setEntries([mockEntry]);
      });

      expect(result.current.entries).toHaveLength(1);
      expect(result.current.entries[0]).toEqual(mockEntry);
    });
  });

  describe("useRules", () => {
    it("provides rules and setRules", () => {
      const { result } = renderHook(() => useRules());

      expect(result.current.rules).toEqual([]);
      expect(typeof result.current.setRules).toBe("function");
    });

    it("updates rules state", () => {
      const { result } = renderHook(() => useRules());

      act(() => {
        result.current.setRules([{ pattern: "makan", match: "contains", category: "Makan" }]);
      });

      expect(result.current.rules).toEqual([{ pattern: "makan", match: "contains", category: "Makan" }]);
    });
  });

  describe("useStorageState", () => {
    it("provides storage state and setters", () => {
      const { result } = renderHook(() => useStorageState());

      expect(result.current.isStorageReady).toBe(false);
      expect(result.current.storageWarning).toBeNull();
      expect(typeof result.current.setIsStorageReady).toBe("function");
      expect(typeof result.current.setStorageWarning).toBe("function");
    });

    it("updates storage ready state", () => {
      const { result } = renderHook(() => useStorageState());

      act(() => {
        result.current.setIsStorageReady(true);
      });

      expect(result.current.isStorageReady).toBe(true);
    });

    it("updates storage warning", () => {
      const { result } = renderHook(() => useStorageState());

      act(() => {
        result.current.setStorageWarning("Storage error");
      });

      expect(result.current.storageWarning).toBe("Storage error");
    });
  });

  describe("useDateFilter", () => {
    it("provides dateFilter and setDateFilter", () => {
      const { result } = renderHook(() => useDateFilter());

      expect(result.current.dateFilter).toBe("today");
      expect(typeof result.current.setDateFilter).toBe("function");
    });

    it("updates date filter", () => {
      const { result } = renderHook(() => useDateFilter());

      act(() => {
        result.current.setDateFilter("7d");
      });

      expect(result.current.dateFilter).toBe("7d");
    });
  });

  describe("useScrollState", () => {
    it("provides scroll state and setters", () => {
      const { result } = renderHook(() => useScrollState());

      expect(result.current.pendingScrollToId).toBeNull();
      expect(result.current.highlightEntryId).toBeNull();
      expect(typeof result.current.setPendingScrollToId).toBe("function");
      expect(typeof result.current.setHighlightEntryId).toBe("function");
    });

    it("updates scroll state", () => {
      const { result } = renderHook(() => useScrollState());

      act(() => {
        result.current.setPendingScrollToId("entry-123");
        result.current.setHighlightEntryId("entry-456");
      });

      expect(result.current.pendingScrollToId).toBe("entry-123");
      expect(result.current.highlightEntryId).toBe("entry-456");
    });
  });

  describe("useBackupState", () => {
    it("provides backup state and setters", () => {
      const { result } = renderHook(() => useBackupState());

      expect(result.current.backupMessage).toBeNull();
      expect(result.current.replaceOnImport).toBe(false);
      expect(typeof result.current.setBackupMessage).toBe("function");
      expect(typeof result.current.setReplaceOnImport).toBe("function");
    });

    it("updates backup state", () => {
      const { result } = renderHook(() => useBackupState());

      act(() => {
        result.current.setBackupMessage("Backup created");
        result.current.setReplaceOnImport(true);
      });

      expect(result.current.backupMessage).toBe("Backup created");
      expect(result.current.replaceOnImport).toBe(true);
    });
  });

  describe("useQuickInput", () => {
    it("provides quick input state and setters", () => {
      const { result } = renderHook(() => useQuickInput());

      expect(result.current.quickInput).toBe("");
      expect(result.current.debouncedQuickInput).toBe("");
      expect(typeof result.current.setQuickInput).toBe("function");
      expect(typeof result.current.setDebouncedQuickInput).toBe("function");
    });

    it("updates quick input", () => {
      const { result } = renderHook(() => useQuickInput());

      act(() => {
        result.current.setQuickInput("makan 50k");
      });

      expect(result.current.quickInput).toBe("makan 50k");
    });
  });

  describe("useQuickInputError", () => {
    it("provides error state and setters", () => {
      const { result } = renderHook(() => useQuickInputError());

      expect(result.current.quickError).toBeNull();
      expect(result.current.showQuickWarningDetails).toBe(false);
      expect(typeof result.current.setQuickError).toBe("function");
      expect(typeof result.current.setShowQuickWarningDetails).toBe("function");
    });

    it("updates error state", () => {
      const { result } = renderHook(() => useQuickInputError());

      act(() => {
        result.current.setQuickError("Invalid input");
        result.current.setShowQuickWarningDetails(true);
      });

      expect(result.current.quickError).toBe("Invalid input");
      expect(result.current.showQuickWarningDetails).toBe(true);
    });
  });

  describe("useBulkInput", () => {
    it("provides bulk input state and setters", () => {
      const { result } = renderHook(() => useBulkInput());

      expect(result.current.bulkOpen).toBe(false);
      expect(result.current.bulkInput).toBe("");
      expect(typeof result.current.setBulkOpen).toBe("function");
      expect(typeof result.current.setBulkInput).toBe("function");
    });

    it("updates bulk input state", () => {
      const { result } = renderHook(() => useBulkInput());

      act(() => {
        result.current.setBulkOpen(true);
        result.current.setBulkInput("makan 50k\nminum 10k");
      });

      expect(result.current.bulkOpen).toBe(true);
      expect(result.current.bulkInput).toBe("makan 50k\nminum 10k");
    });
  });

  describe("useRecallState", () => {
    it("provides recall state and setter", () => {
      const { result } = renderHook(() => useRecallState());

      expect(result.current.recallInputPrimed).toBe(false);
      expect(typeof result.current.setRecallInputPrimed).toBe("function");
    });

    it("updates recall primed state", () => {
      const { result } = renderHook(() => useRecallState());

      act(() => {
        result.current.setRecallInputPrimed(true);
      });

      expect(result.current.recallInputPrimed).toBe(true);
    });
  });

  describe("useRecallSession", () => {
    it("provides recall session state and setters", () => {
      const { result } = renderHook(() => useRecallSession());

      expect(result.current.lastAppOpenAt).toBeNull();
      expect(result.current.recallDismissedInSession).toBe(false);
      expect(result.current.isRecallSessionReady).toBe(false);
      expect(typeof result.current.setLastAppOpenAt).toBe("function");
      expect(typeof result.current.setRecallDismissedInSession).toBe("function");
      expect(typeof result.current.setIsRecallSessionReady).toBe("function");
    });

    it("updates recall session state", () => {
      const { result } = renderHook(() => useRecallSession());

      act(() => {
        result.current.setLastAppOpenAt(Date.now());
        result.current.setRecallDismissedInSession(true);
        result.current.setIsRecallSessionReady(true);
      });

      expect(result.current.lastAppOpenAt).toBeGreaterThan(0);
      expect(result.current.recallDismissedInSession).toBe(true);
      expect(result.current.isRecallSessionReady).toBe(true);
    });
  });

  describe("useNightCloseState", () => {
    it("provides night close state and setters", () => {
      const { result } = renderHook(() => useNightCloseState());

      expect(result.current.nightCloseClosedAt).toBeNull();
      expect(result.current.isNightCloseReady).toBe(false);
      expect(result.current.nightClosePanelOpen).toBe(false);
      expect(result.current.nightCloseConfirmation).toBeNull();
      expect(typeof result.current.setNightCloseClosedAt).toBe("function");
      expect(typeof result.current.setIsNightCloseReady).toBe("function");
      expect(typeof result.current.setNightClosePanelOpen).toBe("function");
      expect(typeof result.current.setNightCloseConfirmation).toBe("function");
    });

    it("updates night close state", () => {
      const { result } = renderHook(() => useNightCloseState());

      act(() => {
        result.current.setNightCloseClosedAt("2024-01-01");
        result.current.setIsNightCloseReady(true);
        result.current.setNightClosePanelOpen(true);
        result.current.setNightCloseConfirmation("confirmed");
      });

      expect(result.current.nightCloseClosedAt).toBe("2024-01-01");
      expect(result.current.isNightCloseReady).toBe(true);
      expect(result.current.nightClosePanelOpen).toBe(true);
      expect(result.current.nightCloseConfirmation).toBe("confirmed");
    });
  });
});
