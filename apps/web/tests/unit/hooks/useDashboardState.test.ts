import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDashboardState } from "@/hooks/useDashboardState";
import { NOTES_RENDER_CHUNK } from "@/lib/constants";

describe("useDashboardState", () => {
  it("initializes with default values", () => {
    const { result } = renderHook(() => useDashboardState());

    expect(result.current.activeTab).toBe("home");
    expect(result.current.expandedIds).toBeInstanceOf(Set);
    expect(result.current.expandedIds.size).toBe(0);
    expect(result.current.isAddSheetOpen).toBe(false);
    expect(result.current.sheetPrefill).toBeNull();
    expect(result.current.isDataToolsSheetOpen).toBe(false);
    expect(result.current.homePendingScrollId).toBeNull();
    expect(result.current.isDarkMode).toBe(false);
    expect(result.current.userName).toBe("");
    expect(result.current.nameDraft).toBe("");
    expect(result.current.isNamePromptOpen).toBe(false);
    expect(result.current.notesRenderCount).toBe(NOTES_RENDER_CHUNK);
    expect(result.current.isTrendChartOverflowing).toBe(false);
  });

  it("updates activeTab state", () => {
    const { result } = renderHook(() => useDashboardState());

    act(() => {
      result.current.setActiveTab("insight");
    });

    expect(result.current.activeTab).toBe("insight");
  });

  it("updates expandedIds state", () => {
    const { result } = renderHook(() => useDashboardState());

    act(() => {
      result.current.setExpandedIds(new Set(["id1", "id2"]));
    });

    expect(result.current.expandedIds.size).toBe(2);
    expect(result.current.expandedIds.has("id1")).toBe(true);
    expect(result.current.expandedIds.has("id2")).toBe(true);
  });

  it("updates sheet states", () => {
    const { result } = renderHook(() => useDashboardState());

    act(() => {
      result.current.setIsAddSheetOpen(true);
      result.current.setSheetPrefill({ amount: 50000 });
    });

    expect(result.current.isAddSheetOpen).toBe(true);
    expect(result.current.sheetPrefill).toEqual({ amount: 50000 });
  });

  it("updates user name states", () => {
    const { result } = renderHook(() => useDashboardState());

    act(() => {
      result.current.setUserName("John");
      result.current.setNameDraft("John Doe");
      result.current.setIsNamePromptOpen(true);
    });

    expect(result.current.userName).toBe("John");
    expect(result.current.nameDraft).toBe("John Doe");
    expect(result.current.isNamePromptOpen).toBe(true);
  });

  it("updates theme state", () => {
    const { result } = renderHook(() => useDashboardState());

    act(() => {
      result.current.setIsDarkMode(true);
    });

    expect(result.current.isDarkMode).toBe(true);
  });

  it("updates virtualization state", () => {
    const { result } = renderHook(() => useDashboardState());

    act(() => {
      result.current.setNotesRenderCount(500);
    });

    expect(result.current.notesRenderCount).toBe(500);
  });

  it("provides refs with correct initial values", () => {
    const { result } = renderHook(() => useDashboardState());

    expect(result.current.itemRefs.current).toBeInstanceOf(Map);
    expect(result.current.homeItemRefs.current).toBeInstanceOf(Map);
    expect(result.current.notesLoadMoreRef.current).toBeNull();
    expect(result.current.insightTrendScrollRef.current).toBeNull();
    expect(result.current.quickInputRef.current).toBeNull();
    expect(result.current.undoToastPayloadRef.current).toBeNull();
    expect(result.current.movedToastPayloadRef.current).toBeNull();
    expect(result.current.cancelEntriesPersistRef.current).toBeNull();
    expect(result.current.isUnmountingRef.current).toBe(false);
  });

  it("maintains stable ref identities across re-renders", () => {
    const { result, rerender } = renderHook(() => useDashboardState());

    const firstItemRefs = result.current.itemRefs;
    const firstHomeItemRefs = result.current.homeItemRefs;

    rerender();

    expect(result.current.itemRefs).toBe(firstItemRefs);
    expect(result.current.homeItemRefs).toBe(firstHomeItemRefs);
  });

  it("updates custom date range state", () => {
    const { result } = renderHook(() => useDashboardState());

    const customRange = {
      start: "2024-01-01",
      end: "2024-01-31"
    };

    act(() => {
      result.current.setCustomDateRange(customRange);
    });

    expect(result.current.customDateRange).toEqual(customRange);
  });

  it("updates trend chart overflow state", () => {
    const { result } = renderHook(() => useDashboardState());

    act(() => {
      result.current.setIsTrendChartOverflowing(true);
    });

    expect(result.current.isTrendChartOverflowing).toBe(true);
  });
});
