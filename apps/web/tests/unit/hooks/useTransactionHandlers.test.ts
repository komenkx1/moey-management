import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransactionHandlers } from "@/hooks/useTransactionHandlers";
import type { Entry, CategoryRules } from "@kemana/core/types";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: vi.fn()
}));

describe("useTransactionHandlers - moved toast functionality", () => {
  let mockProps: any;
  let mockSetActiveTab: ReturnType<typeof vi.fn>;
  let mockSetDateFilter: ReturnType<typeof vi.fn>;
  let mockSetHighlightEntryId: ReturnType<typeof vi.fn>;
  let mockSetPendingScrollToId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockSetActiveTab = vi.fn();
    mockSetDateFilter = vi.fn();
    mockSetHighlightEntryId = vi.fn();
    mockSetPendingScrollToId = vi.fn();

    const mockEntry: Entry = {
      id: "test-1",
      date: "2026-02-28",
      category: "Makan",
      amount: 50000,
      text: "Test entry",
      paymentMethod: "Cash",
      source: "quick_add",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockProps = {
      entries: [mockEntry],
      setEntries: vi.fn(),
      rules: {} as CategoryRules,
      setRules: vi.fn(),
      dateFilter: "today" as const,
      setDateFilter: mockSetDateFilter,
      setActiveTab: mockSetActiveTab,
      normalizedCustomRange: { start: "", end: "" },
      setHighlightEntryId: mockSetHighlightEntryId,
      setPendingScrollToId: mockSetPendingScrollToId,
      setExpandedIds: vi.fn(),
      setHomePendingScrollId: vi.fn(),
      setQuickInput: vi.fn(),
      setDebouncedQuickInput: vi.fn(),
      setQuickError: vi.fn(),
      setShowQuickWarningDetails: vi.fn(),
      setRecallInputPrimed: vi.fn(),
      dismissRecallForSession: vi.fn(),
      quickInputRef: { current: null }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should show moved toast when date changes", () => {
    const { result } = renderHook(() => useTransactionHandlers(mockProps));

    const updatedItem = {
      id: "test-1",
      title: "Test entry",
      amount: 50000,
      note: "",
      time: "2026-02-27", // Changed date
      type: "expense" as const,
      category: "Makan",
      paymentMethod: "Cash"
    };

    act(() => {
      result.current.handleSaveTransaction(updatedItem);
    });

    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining("Tanggal disimpan. Dipindah ke"),
      expect.objectContaining({
        action: expect.objectContaining({
          label: "Lihat"
        })
      })
    );
  });

  it("should navigate to notes tab when 'Lihat' button is clicked", () => {
    const { result } = renderHook(() => useTransactionHandlers(mockProps));

    // Trigger date change to create moved toast
    const updatedItem = {
      id: "test-1",
      title: "Test entry",
      amount: 50000,
      note: "",
      time: "2026-02-27",
      type: "expense" as const,
      category: "Makan",
      paymentMethod: "Cash"
    };

    act(() => {
      result.current.handleSaveTransaction(updatedItem);
    });

    // Get the onClick handler from toast call
    const toastCall = (toast as any).mock.calls[0];
    const onClickHandler = toastCall[1].action.onClick;

    // Simulate clicking "Lihat" button
    act(() => {
      onClickHandler();
    });

    expect(mockSetActiveTab).toHaveBeenCalledWith("notes");
  });

  it("should set highlight and scroll when 'Lihat' button is clicked", () => {
    const { result } = renderHook(() => useTransactionHandlers(mockProps));

    const updatedItem = {
      id: "test-1",
      title: "Test entry",
      amount: 50000,
      note: "",
      time: "2026-02-27",
      type: "expense" as const,
      category: "Makan",
      paymentMethod: "Cash"
    };

    act(() => {
      result.current.handleSaveTransaction(updatedItem);
    });

    const toastCall = (toast as any).mock.calls[0];
    const onClickHandler = toastCall[1].action.onClick;

    act(() => {
      onClickHandler();
    });

    expect(mockSetPendingScrollToId).toHaveBeenCalledWith("test-1");
    expect(mockSetHighlightEntryId).toHaveBeenCalledWith("test-1");
  });

  it("should change filter to 'all' when entry moved out of filter", () => {
    // Set up entry that will be moved outside current filter
    const mockEntryInFilter: Entry = {
      id: "test-2",
      date: "2026-02-28",
      category: "Makan",
      amount: 50000,
      text: "Test entry",
      paymentMethod: "Cash",
      source: "quick_add",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const propsWithTodayFilter = {
      ...mockProps,
      entries: [mockEntryInFilter],
      dateFilter: "today" as const
    };

    const { result } = renderHook(() => useTransactionHandlers(propsWithTodayFilter));

    // Move entry to 10 days ago (outside "today" filter)
    const updatedItem = {
      id: "test-2",
      title: "Test entry",
      amount: 50000,
      note: "",
      time: "2026-02-18", // 10 days ago
      type: "expense" as const,
      category: "Makan",
      paymentMethod: "Cash"
    };

    act(() => {
      result.current.handleSaveTransaction(updatedItem);
    });

    // Verify toast shows "di luar filter aktif"
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining("di luar filter aktif"),
      expect.any(Object)
    );

    const toastCall = (toast as any).mock.calls[0];
    const onClickHandler = toastCall[1].action.onClick;

    act(() => {
      onClickHandler();
    });

    // Verify filter changed to "all"
    expect(mockSetDateFilter).toHaveBeenCalledWith("all");
  });

  it("should auto-clear highlight after 4 seconds", () => {
    const { result } = renderHook(() => useTransactionHandlers(mockProps));

    const updatedItem = {
      id: "test-1",
      title: "Test entry",
      amount: 50000,
      note: "",
      time: "2026-02-27",
      type: "expense" as const,
      category: "Makan",
      paymentMethod: "Cash"
    };

    act(() => {
      result.current.handleSaveTransaction(updatedItem);
    });

    const toastCall = (toast as any).mock.calls[0];
    const onClickHandler = toastCall[1].action.onClick;

    act(() => {
      onClickHandler();
    });

    // Initially highlight is set
    expect(mockSetHighlightEntryId).toHaveBeenCalledWith("test-1");

    // Fast-forward 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Highlight should be cleared
    expect(mockSetHighlightEntryId).toHaveBeenCalledWith(null);
  });

  it("should not change filter when entry stays within current filter", () => {
    const mockEntryToday: Entry = {
      id: "test-3",
      date: "2026-02-28",
      category: "Makan",
      amount: 50000,
      text: "Test entry",
      paymentMethod: "Cash",
      source: "quick_add",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const propsWithSevenDayFilter = {
      ...mockProps,
      entries: [mockEntryToday],
      dateFilter: "7d" as const
    };

    const { result } = renderHook(() => useTransactionHandlers(propsWithSevenDayFilter));

    // Move entry to yesterday (still within 7d filter)
    const updatedItem = {
      id: "test-3",
      title: "Test entry",
      amount: 50000,
      note: "",
      time: "2026-02-27", // Yesterday
      type: "expense" as const,
      category: "Makan",
      paymentMethod: "Cash"
    };

    act(() => {
      result.current.handleSaveTransaction(updatedItem);
    });

    const toastCall = (toast as any).mock.calls[0];
    const onClickHandler = toastCall[1].action.onClick;

    act(() => {
      onClickHandler();
    });

    // Filter should NOT be changed
    expect(mockSetDateFilter).not.toHaveBeenCalled();
  });
});
