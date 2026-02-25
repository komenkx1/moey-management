import { useState, useRef } from "react";
import type { AddTransactionSubmitPayload } from "@/components/kemana-ui/AddTransactionSheet";
import type { CustomDateRange } from "@/lib/kemana-utils";
import { getDefaultCustomDateRange } from "@/lib/kemana-utils";
import { NOTES_RENDER_CHUNK } from "@/lib/constants";

/**
 * Custom hook to manage dashboard UI state
 * Separates UI state from business logic
 */
export function useDashboardState() {
  // Tab and navigation state
  const [activeTab, setActiveTab] = useState("home");
  
  // Expansion and interaction state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [sheetPrefill, setSheetPrefill] = useState<Partial<AddTransactionSubmitPayload> | null>(null);
  const [isDataToolsSheetOpen, setIsDataToolsSheetOpen] = useState(false);
  const [homePendingScrollId, setHomePendingScrollId] = useState<string | null>(null);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // User state
  const [userName, setUserName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
  
  // Virtualization state
  const [notesRenderCount, setNotesRenderCount] = useState(NOTES_RENDER_CHUNK);
  
  // Date range state
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(() => 
    getDefaultCustomDateRange()
  );
  const [isTrendChartOverflowing, setIsTrendChartOverflowing] = useState(false);
  
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
    // State
    activeTab,
    setActiveTab,
    expandedIds,
    setExpandedIds,
    isAddSheetOpen,
    setIsAddSheetOpen,
    sheetPrefill,
    setSheetPrefill,
    isDataToolsSheetOpen,
    setIsDataToolsSheetOpen,
    homePendingScrollId,
    setHomePendingScrollId,
    isDarkMode,
    setIsDarkMode,
    userName,
    setUserName,
    nameDraft,
    setNameDraft,
    isNamePromptOpen,
    setIsNamePromptOpen,
    notesRenderCount,
    setNotesRenderCount,
    customDateRange,
    setCustomDateRange,
    isTrendChartOverflowing,
    setIsTrendChartOverflowing,
    
    // Refs
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
