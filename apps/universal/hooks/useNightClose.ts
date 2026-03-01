import { useMemo, useCallback, useEffect } from "react";
import type { Entry } from "@kemana/core/types";
import {
    getAverageLast7Days,
    getNightCloseCopy,
    getTopCategory as getNightCloseTopCategory,
    getTodayISO,
    getTodayStats,
    shouldShowNightClose
} from "@/app/night-close";
import { writeNightCloseMarker } from "@kemana/storage";

interface UseNightCloseProps {
    entries: Entry[];
    isNightCloseReady: boolean;
    nightCloseClosedAt: string | null;
    setNightCloseClosedAt: (date: string | null) => void;
    setNightClosePanelOpen: (open: boolean) => void;
    setNightCloseConfirmation: (confirmation: string | null) => void;
}

export function useNightClose({
    entries,
    isNightCloseReady,
    nightCloseClosedAt,
    setNightCloseClosedAt,
    setNightClosePanelOpen,
    setNightCloseConfirmation
}: UseNightCloseProps) {
    useEffect(() => {
        if (isNightCloseReady && !shouldShowNightClose({ entries, closedAt: nightCloseClosedAt })) {
            setNightClosePanelOpen(false);
        }
    }, [entries, isNightCloseReady, nightCloseClosedAt, setNightClosePanelOpen]);

    const nightCloseTodayStats = useMemo(() => getTodayStats(entries), [entries]);
    const nightCloseAvg7 = useMemo(() => getAverageLast7Days(entries), [entries]);
    const nightCloseTopCategory = useMemo(
        () => getNightCloseTopCategory(nightCloseTodayStats.byCategory),
        [nightCloseTodayStats.byCategory]
    );
    const nightCloseCopy = useMemo(
        () => getNightCloseCopy({ stats: nightCloseTodayStats, avg7: nightCloseAvg7 }),
        [nightCloseAvg7, nightCloseTodayStats]
    );

    const nightCloseDateLabel = useMemo(() => {
        const parsed = new Date(`${nightCloseTodayStats.dateISO}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) {
            return nightCloseTodayStats.dateISO;
        }

        return new Intl.DateTimeFormat("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(parsed);
    }, [nightCloseTodayStats.dateISO]);

    const showNightCloseBar = useMemo(
        () =>
            isNightCloseReady &&
            shouldShowNightClose({
                entries,
                closedAt: nightCloseClosedAt
            }),
        [entries, isNightCloseReady, nightCloseClosedAt]
    );

    const markNightCloseDone = useCallback(
        (showConfirmation: boolean) => {
            const todayISO = getTodayISO();
            setNightCloseClosedAt(todayISO);
            writeNightCloseMarker(todayISO);
            setNightClosePanelOpen(false);
            if (showConfirmation) {
                setNightCloseConfirmation("Hari ditutup ✅");
            }
        },
        [setNightCloseClosedAt, setNightCloseConfirmation, setNightClosePanelOpen]
    );

    const handleNightCloseBarClose = useCallback(() => {
        markNightCloseDone(false);
    }, [markNightCloseDone]);

    const handleNightCloseDoneFromPanel = useCallback(() => {
        markNightCloseDone(true);
    }, [markNightCloseDone]);

    return {
        nightCloseTodayStats,
        nightCloseTopCategory,
        nightCloseCopy,
        nightCloseDateLabel,
        showNightCloseBar,
        handleNightCloseBarClose,
        handleNightCloseDoneFromPanel
    };
}
