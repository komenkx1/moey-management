import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedEntries } from "@/hooks/useDebouncedEntries";
import type { Entry } from "@kemana/core/types";

describe("useDebouncedEntries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("debounces setEntries calls", () => {
    const setEntries = vi.fn();
    const { result } = renderHook(() => useDebouncedEntries(setEntries, 300));

    const mockEntries: Entry[] = [{
      id: "test-1",
      amount: 50000,
      date: "2024-01-01",
      category: "Makan",
      text: "Test",
      rawInput: "test 50k",
      source: "quick_add",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];

    // Call debouncedSetEntries
    act(() => {
      result.current.debouncedSetEntries(mockEntries);
    });

    // Should not call immediately
    expect(setEntries).not.toHaveBeenCalled();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should call after debounce
    expect(setEntries).toHaveBeenCalledTimes(1);
    expect(setEntries).toHaveBeenCalledWith(mockEntries);
  });

  it("cancels previous timeout on rapid calls", () => {
    const setEntries = vi.fn();
    const { result } = renderHook(() => useDebouncedEntries(setEntries, 300));

    const entries1: Entry[] = [{ id: "1" } as Entry];
    const entries2: Entry[] = [{ id: "2" } as Entry];
    const entries3: Entry[] = [{ id: "3" } as Entry];

    // Rapid calls
    act(() => {
      result.current.debouncedSetEntries(entries1);
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.debouncedSetEntries(entries2);
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      result.current.debouncedSetEntries(entries3);
    });

    // Should not have called yet
    expect(setEntries).not.toHaveBeenCalled();

    // Fast forward remaining time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should only call once with the last value
    expect(setEntries).toHaveBeenCalledTimes(1);
    expect(setEntries).toHaveBeenCalledWith(entries3);
  });

  it("flushes pending updates immediately", () => {
    const setEntries = vi.fn();
    const { result } = renderHook(() => useDebouncedEntries(setEntries, 300));

    const mockEntries: Entry[] = [{ id: "test" } as Entry];

    act(() => {
      result.current.debouncedSetEntries(mockEntries);
    });

    expect(setEntries).not.toHaveBeenCalled();

    // Flush immediately
    act(() => {
      result.current.flushPendingUpdates();
    });

    expect(setEntries).toHaveBeenCalledTimes(1);
    expect(setEntries).toHaveBeenCalledWith(mockEntries);
  });

  it("cancels pending updates without calling setEntries", () => {
    const setEntries = vi.fn();
    const { result } = renderHook(() => useDebouncedEntries(setEntries, 300));

    const mockEntries: Entry[] = [{ id: "test" } as Entry];

    act(() => {
      result.current.debouncedSetEntries(mockEntries);
    });

    expect(setEntries).not.toHaveBeenCalled();

    // Cancel
    act(() => {
      result.current.cancelPendingUpdates();
    });

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should not have called
    expect(setEntries).not.toHaveBeenCalled();
  });

  it("handles function updates", () => {
    const setEntries = vi.fn();
    const { result } = renderHook(() => useDebouncedEntries(setEntries, 300));

    const updater = (prev: Entry[]) => [...prev, { id: "new" } as Entry];

    act(() => {
      result.current.debouncedSetEntries(updater);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(setEntries).toHaveBeenCalledTimes(1);
    expect(setEntries).toHaveBeenCalledWith(updater);
  });

  it("cleans up timeout on unmount", () => {
    const setEntries = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedEntries(setEntries, 300));

    const mockEntries: Entry[] = [{ id: "test" } as Entry];

    act(() => {
      result.current.debouncedSetEntries(mockEntries);
    });

    // Unmount before timeout
    unmount();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should not call after unmount
    expect(setEntries).not.toHaveBeenCalled();
  });

  it("reports pending updates status", () => {
    const setEntries = vi.fn();
    const { result } = renderHook(() => useDebouncedEntries(setEntries, 300));

    expect(result.current.hasPendingUpdates()).toBe(false);

    act(() => {
      result.current.debouncedSetEntries([{ id: "test" } as Entry]);
    });

    expect(result.current.hasPendingUpdates()).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.hasPendingUpdates()).toBe(false);
  });

  it("uses custom debounce time", () => {
    const setEntries = vi.fn();
    const { result } = renderHook(() => useDebouncedEntries(setEntries, 500));

    act(() => {
      result.current.debouncedSetEntries([{ id: "test" } as Entry]);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(setEntries).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(setEntries).toHaveBeenCalledTimes(1);
  });
});
