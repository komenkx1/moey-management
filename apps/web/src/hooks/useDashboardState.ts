import { useRef } from "react";

/**
 * Custom hook to manage dashboard DOM and internal refs
 */
export function useDashboardRefs() {
  // Refs for DOM elements
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const homeItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const notesLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const insightTrendScrollRef = useRef<HTMLDivElement | null>(null);
  const quickInputRef = useRef<HTMLInputElement | null>(null);

  // Refs for internal state
  const undoToastPayloadRef = useRef<any | null>(null);
  const movedToastPayloadRef = useRef<any | null>(null);
  const cancelEntriesPersistRef = useRef<(() => void) | null>(null);
  const isUnmountingRef = useRef(false);

  return {
    itemRefs,
    homeItemRefs,
    notesLoadMoreRef,
    insightTrendScrollRef,
    quickInputRef,
    undoToastPayloadRef,
    movedToastPayloadRef,
    cancelEntriesPersistRef,
    isUnmountingRef
  };
}
