import { useEffect, useMemo } from "react";
import type { Entry } from "@kemana/core/types";
import type { DateFilterPreset } from "@/lib/kemana-utils";
import { NOTES_VIRTUALIZE_THRESHOLD, NOTES_RENDER_CHUNK } from "@/lib/constants";
import {
    deriveNotesVirtualizationPlan,
    getInitialNotesRenderCount,
    getNextNotesRenderCount
} from "@/lib/dashboard-page-utils";

interface UseNotesVirtualizationProps {
    activeTab: string;
    dateFilter: DateFilterPreset;
    filteredEntries: Entry[];
    pendingScrollToId: string | null;
    notesLoadMoreRef: React.RefObject<HTMLDivElement | null>;
    notesRenderCount: number;
    setNotesRenderCount: React.Dispatch<React.SetStateAction<number>>;
}

export function useNotesVirtualization({
    activeTab,
    dateFilter,
    filteredEntries,
    pendingScrollToId,
    notesLoadMoreRef,
    notesRenderCount,
    setNotesRenderCount
}: UseNotesVirtualizationProps) {
    const notesVirtualizationPlan = useMemo(
        () =>
            deriveNotesVirtualizationPlan({
                totalEntries: filteredEntries.length,
                requestedRenderCount: notesRenderCount,
                threshold: NOTES_VIRTUALIZE_THRESHOLD,
                chunkSize: NOTES_RENDER_CHUNK
            }),
        [filteredEntries.length, notesRenderCount]
    );

    const shouldVirtualizeNotes = notesVirtualizationPlan.shouldVirtualize;
    const notesVisibleEntries = useMemo(
        () => filteredEntries.slice(0, notesVirtualizationPlan.visibleCount),
        [filteredEntries, notesVirtualizationPlan.visibleCount]
    );
    const notesHasMore = notesVirtualizationPlan.hasMore;

    useEffect(() => {
        if (activeTab !== "notes") {
            return;
        }

        setNotesRenderCount(
            getInitialNotesRenderCount(filteredEntries.length, NOTES_VIRTUALIZE_THRESHOLD, NOTES_RENDER_CHUNK)
        );
    }, [activeTab, dateFilter, filteredEntries.length, setNotesRenderCount]);

    useEffect(() => {
        if (!pendingScrollToId || !shouldVirtualizeNotes) {
            return;
        }

        const targetIndex = filteredEntries.findIndex((entry) => entry.id === pendingScrollToId);
        if (targetIndex < 0) {
            return;
        }

        setNotesRenderCount((prev) =>
            Math.min(filteredEntries.length, Math.max(prev, targetIndex + Math.floor(NOTES_RENDER_CHUNK / 2)))
        );
    }, [filteredEntries, pendingScrollToId, shouldVirtualizeNotes, setNotesRenderCount]);

    useEffect(() => {
        if (activeTab !== "notes" || !notesHasMore) {
            return;
        }

        const target = notesLoadMoreRef.current;
        if (!target) {
            return;
        }

        if (typeof IntersectionObserver === "undefined") {
            setNotesRenderCount((prev) => getNextNotesRenderCount(prev, filteredEntries.length, NOTES_RENDER_CHUNK));
            return;
        }

        const observer = new IntersectionObserver(
            (entriesObserved) => {
                if (!entriesObserved.some((entry) => entry.isIntersecting)) {
                    return;
                }
                setNotesRenderCount((prev) => getNextNotesRenderCount(prev, filteredEntries.length, NOTES_RENDER_CHUNK));
            },
            {
                root: null,
                rootMargin: "220px 0px"
            }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [activeTab, filteredEntries.length, notesHasMore, notesLoadMoreRef, setNotesRenderCount]);

    return {
        notesVirtualizationPlan,
        shouldVirtualizeNotes,
        notesVisibleEntries,
        notesHasMore
    };
}
