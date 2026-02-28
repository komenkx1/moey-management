import { useEffect } from "react";
import type { Entry } from "@kemana/core/types";
import type { DateFilterPreset } from "@/lib/kemana-utils";

interface UseScrollToEntryProps {
    activeTab: string;
    dateFilter: DateFilterPreset;
    entries: Entry[];
    pendingScrollToId: string | null;
    setPendingScrollToId: (id: string | null) => void;
    homePendingScrollId: string | null;
    setHomePendingScrollId: (id: string | null) => void;
    itemRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
    homeItemRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
}

export function useScrollToEntry({
    activeTab,
    dateFilter,
    entries,
    pendingScrollToId,
    setPendingScrollToId,
    homePendingScrollId,
    setHomePendingScrollId,
    itemRefs,
    homeItemRefs
}: UseScrollToEntryProps) {
    useEffect(() => {
        if (!pendingScrollToId || activeTab !== "notes") {
            return;
        }

        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 4;

        const tryScroll = () => {
            if (cancelled) {
                return;
            }

            const mapTarget = itemRefs.current.get(pendingScrollToId);
            const domTarget =
                mapTarget ?? (document.querySelector(`[data-entry-id="${pendingScrollToId}"]`) as HTMLDivElement | null);

            if (domTarget) {
                domTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                setPendingScrollToId(null);
                return;
            }

            if (attempts >= maxAttempts) {
                setPendingScrollToId(null);
                return;
            }

            attempts += 1;
            window.setTimeout(() => {
                window.requestAnimationFrame(tryScroll);
            }, 90);
        };

        window.requestAnimationFrame(tryScroll);

        return () => {
            cancelled = true;
        };
    }, [activeTab, dateFilter, entries, pendingScrollToId, setPendingScrollToId, itemRefs]);

    useEffect(() => {
        if (!homePendingScrollId || activeTab !== "home") {
            return;
        }

        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 4;

        const tryScroll = () => {
            if (cancelled) {
                return;
            }

            const mapTarget = homeItemRefs.current.get(homePendingScrollId);
            const domTarget =
                mapTarget ??
                (document.querySelector(`[data-home-entry-id="${homePendingScrollId}"]`) as HTMLDivElement | null);

            if (domTarget) {
                domTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                setHomePendingScrollId(null);
                return;
            }

            if (attempts >= maxAttempts) {
                setHomePendingScrollId(null);
                return;
            }

            attempts += 1;
            window.setTimeout(() => {
                window.requestAnimationFrame(tryScroll);
            }, 90);
        };

        window.requestAnimationFrame(tryScroll);

        return () => {
            cancelled = true;
        };
    }, [activeTab, entries, homePendingScrollId, setHomePendingScrollId, homeItemRefs]);
}
