import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDashboardRefs } from "@/hooks/useDashboardState";

describe("useDashboardRefs", () => {
  it("provides refs with correct initial values", () => {
    const { result } = renderHook(() => useDashboardRefs());

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
    const { result, rerender } = renderHook(() => useDashboardRefs());

    const firstItemRefs = result.current.itemRefs;
    const firstHomeItemRefs = result.current.homeItemRefs;

    rerender();

    expect(result.current.itemRefs).toBe(firstItemRefs);
    expect(result.current.homeItemRefs).toBe(firstHomeItemRefs);
  });
});
