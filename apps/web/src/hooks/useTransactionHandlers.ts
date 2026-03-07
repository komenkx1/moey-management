import { useCallback, useRef } from "react";
import { toast } from "sonner";
import type { TransactionItem } from "@/components/kemana-ui/TransactionCard";
import type { AddTransactionSubmitPayload } from "@/components/kemana-ui/AddTransactionSheet";
import type { Entry, Category, ParseQuickAddResult, CategoryRules } from "@kemana/core/types";
import { PAYMENT_METHODS } from "@kemana/core/types";
import { parseQuickAdd } from "@kemana/core/parser";
import { inferCategory, updateCategoryRule } from "@kemana/core/rules";
import {
  splitDisplayText,
  formatDayLabel,
  includesDateInFilter,
  makeInitialSplit,
  type DateFilterPreset,
  type CustomDateRange
} from "@/lib/kemana-utils";
import { createEntryId, toParserAmountToken } from "@/lib/dashboard-page-helpers";
import { recordQuickAddAck } from "@/lib/perf";
import { TOAST_IDS } from "@/lib/constants";
import { hapticsSuccess, hapticsMedium } from "@/lib/haptics";
import { enqueueSyncOperation } from "@kemana/storage";
import { useKemanaStore } from "@/store/use-kemana-store";

import { useAuth } from "./useAuth";

interface MovedToastPayload {
  entryId: string;
  targetDate: string;
  label: string;
  movedOutOfFilter: boolean;
}

interface UndoToastPayload {
  entry: Entry;
  index: number;
}

interface UseTransactionHandlersProps {
  entries: Entry[];
  setEntries: (entries: Entry[] | ((prev: Entry[]) => Entry[])) => void;
  flushEntries?: () => void; // Optional flush function for immediate persistence
  rules: CategoryRules;
  setRules: (rules: CategoryRules | ((prev: CategoryRules) => CategoryRules)) => void;
  dateFilter: DateFilterPreset;
  setDateFilter: (filter: DateFilterPreset) => void;
  setActiveTab: (tab: "home" | "notes" | "insight") => void;
  normalizedCustomRange: CustomDateRange;
  setHighlightEntryId: (id: string | null) => void;
  setPendingScrollToId: (id: string | null) => void;
  setExpandedIds: (ids: Set<string>) => void;
  setHomePendingScrollId: (id: string | null) => void;
  setQuickInput: (input: string) => void;
  setDebouncedQuickInput: (input: string) => void;
  setQuickError: (error: string | null) => void;
  setShowQuickWarningDetails: (show: boolean) => void;
  setRecallInputPrimed: (primed: boolean) => void;
  dismissRecallForSession: () => void;
  quickInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useTransactionHandlers(props: UseTransactionHandlersProps) {
  const {
    entries,
    setEntries,
    flushEntries,
    rules,
    setRules,
    dateFilter,
    setDateFilter,
    setActiveTab,
    normalizedCustomRange,
    setHighlightEntryId,
    setPendingScrollToId,
    setExpandedIds,
    setHomePendingScrollId,
    setQuickInput,
    setDebouncedQuickInput,
    setQuickError,
    setShowQuickWarningDetails,
    setRecallInputPrimed,
    dismissRecallForSession,
    quickInputRef
  } = props;

  const { session } = useAuth();

  const undoToastPayloadRef = useRef<UndoToastPayload | null>(null);
  const movedToastPayloadRef = useRef<MovedToastPayload | null>(null);

  const handleMovedToastSee = useCallback(() => {
    const movedToast = movedToastPayloadRef.current;
    if (!movedToast) {
      return;
    }

    // Switch to notes tab
    setActiveTab("notes");

    // If moved out of filter, change to "all" filter
    if (movedToast.movedOutOfFilter) {
      setDateFilter("all");
    }

    // Set scroll and highlight
    setPendingScrollToId(movedToast.entryId);
    setHighlightEntryId(movedToast.entryId);

    // Auto-clear highlight after 4 seconds
    setTimeout(() => {
      setHighlightEntryId(null);
    }, 4000);
  }, [setActiveTab, setDateFilter, setHighlightEntryId, setPendingScrollToId]);

  const showMovedToast = useCallback(
    (payload: MovedToastPayload) => {
      movedToastPayloadRef.current = payload;
      toast(
        payload.movedOutOfFilter
          ? `Tanggal disimpan. Dipindah ke ${payload.label} (di luar filter aktif).`
          : `Tanggal disimpan. Dipindah ke ${payload.label}`,
        {
          id: TOAST_IDS.MOVED,
          duration: 8000,
          action: {
            label: "Lihat",
            onClick: handleMovedToastSee
          },
          onDismiss: () => {
            movedToastPayloadRef.current = null;
          },
          onAutoClose: () => {
            movedToastPayloadRef.current = null;
          }
        }
      );
    },
    [handleMovedToastSee]
  );

  const handleSaveTransaction = useCallback(
    (updatedItem: TransactionItem) => {
      const originalEntry = entries.find((entry) => entry.id === updatedItem.id);
      if (!originalEntry) {
        return;
      }

      const dateChanged = originalEntry.date !== updatedItem.time;
      const categoryChanged = originalEntry.category !== updatedItem.category;

      const originalTitle = splitDisplayText(originalEntry.text).title.trim();
      const nextTitle = updatedItem.title.trim() || originalTitle || updatedItem.category;
      const note = updatedItem.note?.trim();
      const nextText = note ? `${nextTitle} - ${note}` : nextTitle;
      const paymentMethod =
        updatedItem.paymentMethod &&
          PAYMENT_METHODS.includes(updatedItem.paymentMethod as (typeof PAYMENT_METHODS)[number])
          ? (updatedItem.paymentMethod as Entry["paymentMethod"])
          : undefined;

      const updatedEntry: Entry = {
        ...originalEntry,
        amount: updatedItem.amount,
        date: updatedItem.time,
        category: updatedItem.category as Entry["category"],
        paymentMethod,
        text: nextText,
        rawInput: updatedItem.rawInput,
        parseWarnings: updatedItem.parseWarnings,
        split: updatedItem.split,
        updatedAt: new Date().toISOString()
      };

      // Directly update the store synchronously with a functional updater
      useKemanaStore.getState().setEntries((prev: Entry[]) => prev.map((entry: Entry) => {
        if (entry.id !== updatedItem.id) {
          return entry;
        }
        return updatedEntry;
      }));
      
      // Enqueue sync if logged in
      if (session?.user) {
        enqueueSyncOperation('entry', updatedEntry.id, 'update', updatedEntry).catch(console.error);
      }

      if (categoryChanged) {
        setRules((prev) => updateCategoryRule(prev, nextText, updatedItem.category as Category));
      }

      if (dateChanged) {
        const movedLabel = formatDayLabel(updatedItem.time, new Date());
        showMovedToast({
          entryId: updatedItem.id,
          targetDate: updatedItem.time,
          label: movedLabel,
          movedOutOfFilter: !includesDateInFilter(updatedItem.time, dateFilter, new Date(), normalizedCustomRange)
        });
        setPendingScrollToId(updatedItem.id);
        setHighlightEntryId(updatedItem.id);
        hapticsSuccess();
        toast.success("Catatan diperbarui.");
      }
    },
    [
      dateFilter,
      entries,
      normalizedCustomRange,
      session,
      setEntries,
      setHighlightEntryId,
      setPendingScrollToId,
      setRules,
      showMovedToast
    ]
  );

  const handleDeleteTransaction = useCallback(
    (id: string) => {
      const deletedIndex = entries.findIndex((entry) => entry.id === id);
      if (deletedIndex === -1) {
        return;
      }

      const deletedEntry = entries[deletedIndex];
      const undoPayload: UndoToastPayload = {
        entry: deletedEntry,
        index: deletedIndex
      };

      // Directly update the store synchronously to avoid debounce race conditions
      useKemanaStore.getState().setEntries((prev: Entry[]) => prev.filter((entry: Entry) => entry.id !== id));

      // Enqueue sync if logged in
      if (session?.user) {
        enqueueSyncOperation('entry', id, 'delete', deletedEntry).catch(console.error);
      }

      undoToastPayloadRef.current = undoPayload;
      hapticsMedium();
      toast("Catatan dihapus.", {
        id: TOAST_IDS.UNDO,
        duration: 6000,
        action: {
          label: "Urungkan",
          onClick: () => {
            const payload = undoToastPayloadRef.current;
            if (!payload) {
              return;
            }

            useKemanaStore.getState().setEntries((prev: Entry[]) => {
              const next = [...prev];
              const insertIndex = Math.max(0, Math.min(payload.index, next.length));
              next.splice(insertIndex, 0, payload.entry);
              return next;
            });

            // Re-enqueue create if undo
            if (session?.user) {
              enqueueSyncOperation('entry', payload.entry.id, 'create', payload.entry).catch(console.error);
            }

            // Flush immediately for undo operations
            flushEntries?.();

            undoToastPayloadRef.current = null;
            toast.dismiss(TOAST_IDS.UNDO);
            hapticsSuccess();
            toast.success("Catatan dikembalikan.");
          }
        },
        onDismiss: () => {
          undoToastPayloadRef.current = null;
        },
        onAutoClose: () => {
          undoToastPayloadRef.current = null;
        }
      });

      // Flush immediately after showing toast for delete operations
      flushEntries?.();
    },
    [entries, setEntries, flushEntries]
  );

  const handleQuickAddSubmit = useCallback(
    (quickInput: string, debouncedQuickInput: string, quickPreview: ParseQuickAddResult | null) => {
      const submitStartedAt = performance.now();
      const parsed =
        quickPreview && debouncedQuickInput === quickInput
          ? quickPreview
          : parseQuickAdd(quickInput, new Date(), "quick_add");

      if (!parsed.ok) {
        setQuickError(parsed.reason || "Format catatan belum dikenali.");
        return;
      }

      const now = new Date().toISOString();
      const nextEntry: Entry = {
        id: createEntryId(),
        text: parsed.value.text,
        amount: parsed.value.amount,
        rawInput: parsed.value.rawInput,
        date: parsed.value.date,
        category: inferCategory(parsed.value.text, rules),
        paymentMethod: "Unknown",
        source: parsed.value.source,
        parseWarnings: parsed.warnings,
        split: makeInitialSplit(parsed.value.amount, parsed.value.splitCount),
        createdAt: now,
        updatedAt: now
      };

      // Directly update the store synchronously to avoid debounce race conditions
      useKemanaStore.getState().setEntries((prev: Entry[]) => [nextEntry, ...prev]);

      // Enqueue sync if logged in
      if (session?.user) {
        enqueueSyncOperation('entry', nextEntry.id, 'create', nextEntry).catch(console.error);
      }

      // Flush immediately for quick add to ensure UI updates
      flushEntries?.();

      setExpandedIds(new Set([nextEntry.id]));
      setHomePendingScrollId(nextEntry.id);
      setHighlightEntryId(nextEntry.id);
      setQuickInput("");
      setDebouncedQuickInput("");
      setQuickError(null);
      setShowQuickWarningDetails(false);
      setRecallInputPrimed(false);
      dismissRecallForSession();

      window.requestAnimationFrame(() => {
        quickInputRef.current?.focus();
        recordQuickAddAck(performance.now() - submitStartedAt);
      });

      hapticsSuccess();
      toast.success("Catatan tersimpan.");
    },
    [
      dismissRecallForSession,
      rules,
      setHighlightEntryId,
      setDebouncedQuickInput,
      setEntries,
      flushEntries,
      setQuickError,
      setQuickInput,
      setRecallInputPrimed,
      setShowQuickWarningDetails,
      setExpandedIds,
      setHomePendingScrollId,
      quickInputRef
    ]
  );

  const handleCreateFromSheet = useCallback(
    (data: AddTransactionSubmitPayload) => {
      const normalizedPayment =
        data.payment && PAYMENT_METHODS.includes(data.payment as (typeof PAYMENT_METHODS)[number])
          ? (data.payment as Entry["paymentMethod"])
          : undefined;
      const title = data.title?.trim();
      const note = data.note.trim();
      const textTitle = title || data.category;
      const text = note ? `${textTitle} - ${note}` : textTitle;
      const normalizedQty = Math.max(1, Math.round(data.quantity ?? 1));
      const normalizedUnitAmount = Math.max(0, Math.round(data.unitAmount ?? data.amount));
      const splitCount = data.split?.shares?.length ?? 0;
      const splitToken = splitCount > 1 ? ` ${splitCount}p` : "";
      const rawInputLabel = title || note || data.category;
      const fallbackRawInput = `${rawInputLabel} ${normalizedQty > 1 ? `${normalizedQty}x ` : ""}${toParserAmountToken(normalizedUnitAmount)}${splitToken}`.trim();
      const rawInput = data.rawInput?.trim() || fallbackRawInput;
      const now = new Date().toISOString();

      const nextEntry: Entry = {
        id: createEntryId(),
        text,
        amount: data.amount,
        rawInput,
        date: data.date,
        category: data.category as Entry["category"],
        paymentMethod: normalizedPayment,
        source: "quick_add",
        split: data.split,
        createdAt: now,
        updatedAt: now
      };

      // Directly update the store synchronously to avoid debounce race conditions
      useKemanaStore.getState().setEntries((prev: Entry[]) => [nextEntry, ...prev]);

      // Enqueue sync if logged in
      if (session?.user) {
        enqueueSyncOperation('entry', nextEntry.id, 'create', nextEntry).catch(console.error);
      }

      // Flush immediately for sheet creation
      flushEntries?.();

      dismissRecallForSession();
      setRecallInputPrimed(false);
      hapticsSuccess();
      toast.success("Catatan tersimpan.");
    },
    [dismissRecallForSession, setEntries, flushEntries, setRecallInputPrimed]
  );

  return {
    handleSaveTransaction,
    handleDeleteTransaction,
    handleQuickAddSubmit,
    handleCreateFromSheet,
    undoToastPayloadRef,
    movedToastPayloadRef
  };
}
