import { useMemo, useEffect } from "react";
import type { Entry } from "@kemana/core/types";
import { formatAmountCompact, formatAmountIDR } from "@kemana/core/format";
import {
    deriveInsightCoachCopy,
    deriveInsightSummary,
    deriveInsightTrendBadge,
    deriveInsightWhyCards,
} from "@/lib/dashboard-page-utils";
import {
    generateTrendSeries,
    getTrendGranularity,
    getTrendTitle,
    getTrendSubtitle,
    type DateFilterPreset,
    type CustomDateRange
} from "@/lib/kemana-utils";

interface UseInsightDataProps {
    entries: Entry[];
    activeTab: string;
    dateFilter: DateFilterPreset;
    normalizedCustomRange: CustomDateRange;
    insightTrendScrollRef: React.RefObject<HTMLDivElement | null>;
    setIsTrendChartOverflowing: (overflowing: boolean) => void;
}

export function useInsightData({
    entries,
    activeTab,
    dateFilter,
    normalizedCustomRange,
    insightTrendScrollRef,
    setIsTrendChartOverflowing
}: UseInsightDataProps) {
    const insightSevenDay = useMemo(
        () => deriveInsightSummary(entries, dateFilter, new Date(), normalizedCustomRange),
        [dateFilter, entries, normalizedCustomRange]
    );
    const insightWhyCards = useMemo(() => deriveInsightWhyCards(insightSevenDay), [insightSevenDay]);
    const insightCoachCopy = useMemo(() => deriveInsightCoachCopy(insightSevenDay), [insightSevenDay]);
    const insightTrendBadge = useMemo(() => deriveInsightTrendBadge(insightSevenDay), [insightSevenDay]);

    const insightAverageAmountLabel = useMemo(() => {
        const amount = insightSevenDay.averagePerDay;
        if (amount >= 1_000_000) {
            return `Rp${formatAmountCompact(amount)}`;
        }
        return `Rp${formatAmountIDR(amount)}`;
    }, [insightSevenDay.averagePerDay]);

    const insightTrendSeries = useMemo(() => {
        return generateTrendSeries(entries, dateFilter, normalizedCustomRange, new Date());
    }, [entries, dateFilter, normalizedCustomRange]);

    const trendGranularity = useMemo(() => {
        return getTrendGranularity(dateFilter, normalizedCustomRange, new Date());
    }, [dateFilter, normalizedCustomRange]);

    const trendTitle = useMemo(() => {
        return getTrendTitle(dateFilter, trendGranularity, normalizedCustomRange, new Date());
    }, [dateFilter, trendGranularity, normalizedCustomRange]);

    const trendSubtitle = useMemo(() => {
        return getTrendSubtitle(trendGranularity);
    }, [trendGranularity]);

    const insightMaxTrendTotal = useMemo(
        () => Math.max(...insightTrendSeries.map((item) => item.total), 0),
        [insightTrendSeries]
    );

    const insightTrendSeriesDisplay = useMemo(
        () => [...insightTrendSeries].reverse(),
        [insightTrendSeries]
    );

    const trendCompactSlotCount = useMemo(
        () => Math.max(2, insightTrendSeriesDisplay.length),
        [insightTrendSeriesDisplay.length]
    );

    const trendCompactItemWidth = useMemo(
        () => `min(72px, max(56px, calc((100% - ${(trendCompactSlotCount - 1) * 10}px) / ${trendCompactSlotCount})))`,
        [trendCompactSlotCount]
    );

    useEffect(() => {
        if (activeTab !== "insight") {
            setIsTrendChartOverflowing(false);
            return;
        }

        // Native React Native fallback for overflow behavior
        // Since we know the screen width roughly, we can guess if items > 5
        setIsTrendChartOverflowing(insightTrendSeriesDisplay.length > 5);
    }, [activeTab, insightTrendSeriesDisplay.length, setIsTrendChartOverflowing]);

    return {
        insightSevenDay,
        insightWhyCards,
        insightCoachCopy,
        insightTrendBadge,
        insightAverageAmountLabel,
        insightTrendSeries,
        trendTitle,
        trendSubtitle,
        insightMaxTrendTotal,
        insightTrendSeriesDisplay,
        trendCompactItemWidth
    };
}
