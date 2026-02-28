import { useMemo } from "react";
import { parseQuickAdd } from "@kemana/core/parser";
import {
    splitDisplayText,
    parseItemBreakdownFromSubtitle,
    splitSubtitleItems,
    extractSummedAmountMeta,
    getInputHints
} from "@/lib/kemana-utils";
import {
    deriveQuickHistorySuggestions,
    deriveQuickFormatTemplates,
    getQuickInputPlaceholder
} from "@/lib/dashboard-page-utils";
import type { Entry } from "@kemana/core/types";
import type { QuickRecallItem } from "@/components/kemana-ui/QuickRecallChips";
import type { SmartRecallPrompt } from "@/app/recall";

interface UseQuickAddProps {
    entries: Entry[];
    quickInput: string;
    debouncedQuickInput: string;
    smartRecallPrompt: SmartRecallPrompt | null;
    recallInputPrimed: boolean;
    topAdaptiveRecallItem: QuickRecallItem | null;
}

export function useQuickAdd({
    entries,
    quickInput,
    debouncedQuickInput,
    smartRecallPrompt,
    recallInputPrimed,
    topAdaptiveRecallItem
}: UseQuickAddProps) {
    const quickPreview = useMemo(() => {
        if (!debouncedQuickInput.trim()) {
            return null;
        }
        return parseQuickAdd(debouncedQuickInput);
    }, [debouncedQuickInput]);

    const quickPreviewTextParts = useMemo(
        () => (quickPreview?.ok ? splitDisplayText(quickPreview.value.text) : null),
        [quickPreview]
    );

    const quickPreviewSubtitleBreakdown = useMemo(
        () =>
            quickPreviewTextParts?.subtitle
                ? parseItemBreakdownFromSubtitle(quickPreviewTextParts.subtitle)
                : null,
        [quickPreviewTextParts?.subtitle]
    );

    const quickPreviewSubtitleItems = useMemo(
        () => (quickPreviewTextParts?.subtitle ? splitSubtitleItems(quickPreviewTextParts.subtitle) : null),
        [quickPreviewTextParts?.subtitle]
    );

    const adaptiveHints = useMemo(() => getInputHints(quickInput, quickPreview), [quickInput, quickPreview]);

    const summedAmountMeta = useMemo(
        () => (quickPreview?.ok ? extractSummedAmountMeta(quickPreview.warnings) : null),
        [quickPreview]
    );

    const quickInputPlaceholder = useMemo(() => {
        return getQuickInputPlaceholder({
            hasSmartRecallPrompt: Boolean(smartRecallPrompt),
            recallInputPrimed
        });
    }, [recallInputPrimed, smartRecallPrompt]);

    const quickHistorySuggestions = useMemo(() => {
        return deriveQuickHistorySuggestions(entries, quickInput);
    }, [entries, quickInput]);

    const quickFormatTemplates = useMemo(() => {
        const fallbackBase = topAdaptiveRecallItem ? splitDisplayText(topAdaptiveRecallItem.title).title : "makan";
        return deriveQuickFormatTemplates({
            quickInput,
            fallbackBase
        });
    }, [quickInput, topAdaptiveRecallItem]);

    return {
        quickPreview,
        quickPreviewTextParts,
        quickPreviewSubtitleBreakdown,
        quickPreviewSubtitleItems,
        adaptiveHints,
        summedAmountMeta,
        quickInputPlaceholder,
        quickHistorySuggestions,
        quickFormatTemplates
    };
}
