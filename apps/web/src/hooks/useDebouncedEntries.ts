import { useCallback, useRef, useEffect } from "react";
import type { Entry } from "@kemana/core/types";

/**
 * Hook to debounce entries updates for better performance
 * Reduces re-renders and storage I/O by batching rapid updates
 * 
 * Use cases:
 * - Bulk operations (import, bulk add)
 * - Rapid sequential updates
 * - Non-critical updates that can be delayed
 * 
 * For immediate updates (single save/delete), use setEntries directly
 */
export function useDebouncedEntries(
  setEntries: (entries: Entry[] | ((prev: Entry[]) => Entry[])) => void,
  debounceMs: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<Entry[] | ((prev: Entry[]) => Entry[]) | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedSetEntries = useCallback(
    (entries: Entry[] | ((prev: Entry[]) => Entry[])) => {
      // Store the pending update
      pendingUpdateRef.current = entries;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && pendingUpdateRef.current !== null) {
          setEntries(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        timeoutRef.current = null;
      }, debounceMs);
    },
    [setEntries, debounceMs]
  );

  const flushPendingUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isMountedRef.current && pendingUpdateRef.current !== null) {
      setEntries(pendingUpdateRef.current);
      pendingUpdateRef.current = null;
    }
  }, [setEntries]);

  const cancelPendingUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingUpdateRef.current = null;
  }, []);

  return {
    debouncedSetEntries,
    flushPendingUpdates,
    cancelPendingUpdates,
    hasPendingUpdates: () => pendingUpdateRef.current !== null
  };
}
