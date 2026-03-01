import React, { useState, useRef, useEffect, memo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Animated } from 'react-native';
import { formatAmountIDR } from '@kemana/core/format';
import type { ParseQuickAddResult } from '@kemana/core/types';
import {
    warningShortText,
    extractSummedAmountMeta,
    splitDisplayText,
    splitSubtitleItems,
    parseItemBreakdownFromSubtitle
} from '@/lib/kemana-utils/input'; // Aliased from React Native TS config to /apps/web/src/lib

interface QuickFormatTemplate {
    id: string;
    sample: string;
    description: string;
}

interface QuickAddComposerProps {
    quickInput: string;
    quickInputPlaceholder: string;
    onQuickInputChange: (text: string) => void;
    onQuickInputSubmit: () => void;
    onOpenBulk: () => void;

    showQuickFormatTemplates: boolean;
    quickFormatTemplates: QuickFormatTemplate[];
    onApplyQuickFormatTemplate: (template: string) => void;

    quickHistorySuggestions: string[];
    onApplyQuickHistorySuggestion: (title: string) => void;

    quickPreview: ParseQuickAddResult | null;
    showQuickWarningDetails: boolean;
    onToggleQuickWarningDetails: () => void;

    adaptiveHints: string[];
    quickError: string | null;
}

function QuickAddComposer({
    quickInput,
    quickInputPlaceholder,
    onQuickInputChange,
    onQuickInputSubmit,
    onOpenBulk,
    showQuickFormatTemplates,
    quickFormatTemplates,
    onApplyQuickFormatTemplate,
    quickHistorySuggestions,
    onApplyQuickHistorySuggestion,
    quickPreview,
    showQuickWarningDetails,
    onToggleQuickWarningDetails,
    adaptiveHints,
    quickError
}: QuickAddComposerProps) {
    const inputRef = useRef<TextInput>(null);

    const quickPreviewTextParts = quickPreview?.ok
        ? splitDisplayText(quickPreview.value.text)
        : null;

    const quickPreviewSubtitleBreakdown = quickPreviewTextParts?.subtitle
        ? parseItemBreakdownFromSubtitle(quickPreviewTextParts.subtitle)
        : null;

    const quickPreviewSubtitleItems =
        (!quickPreviewSubtitleBreakdown && quickPreviewTextParts?.subtitle)
            ? splitSubtitleItems(quickPreviewTextParts.subtitle)
            : null;

    const summedAmountMeta = extractSummedAmountMeta(quickPreview?.ok ? quickPreview.warnings : undefined);

    return (
        <View className="flex flex-col gap-4">
            {/* Input Box */}
            <View className="overflow-hidden rounded-[20px] bg-white p-1.5 shadow-sm border border-gray-200">
                <View className="flex flex-row items-center gap-2">
                    <TextInput
                        ref={inputRef}
                        value={quickInput}
                        placeholder={quickInputPlaceholder}
                        onChangeText={onQuickInputChange}
                        onSubmitEditing={onQuickInputSubmit}
                        returnKeyType="done"
                        className="flex-1 shrink min-w-0 bg-transparent px-2 sm:px-3 py-3 text-[15px] font-medium text-gray-900"
                        placeholderTextColor="#9CA3AF"
                    />
                    <Pressable
                        onPress={onQuickInputSubmit}
                        className="h-11 px-4 rounded-[14px] bg-blue-50 items-center justify-center active:bg-blue-600 active:opacity-80"
                    >
                        <Text className="text-[13px] font-semibold text-blue-600 active:text-white">
                            Catat
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={onOpenBulk}
                        className="h-11 px-4 rounded-[14px] border border-gray-200 bg-white items-center justify-center active:border-blue-600 active:bg-blue-50"
                    >
                        <Text className="text-[13px] font-semibold text-gray-500 active:text-blue-600">
                            Banyak
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* Quick Format Templates Scroll */}
            {showQuickFormatTemplates && (
                <View className="flex flex-col gap-1.5">
                    <View className="flex flex-row items-center justify-between px-1">
                        <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Format cepat
                        </Text>
                        <Text className="text-[11px] font-medium text-gray-400">
                            Geser, lalu tap untuk pakai
                        </Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="-mx-4 pb-1 pt-1"
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                    >
                        {quickFormatTemplates.map((template) => (
                            <Pressable
                                key={template.id}
                                onPress={() => onApplyQuickFormatTemplate(template.sample)}
                                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 active:border-blue-600 active:bg-blue-50"
                            >
                                <Text className="text-[12px] font-semibold text-gray-500 active:text-blue-600">
                                    {template.sample}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* History Suggestions */}
            {quickHistorySuggestions.length > 0 && (
                <View className="flex flex-row flex-wrap items-center gap-2">
                    <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Saran cepat
                    </Text>
                    {quickHistorySuggestions.map((suggestion) => (
                        <Pressable
                            key={suggestion}
                            onPress={() => onApplyQuickHistorySuggestion(suggestion)}
                            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 active:border-blue-600"
                        >
                            <Text className="text-[12px] font-medium text-gray-500">
                                {suggestion}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {/* Quick Preview Box */}
            {quickPreview?.ok && (
                <View className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                    <Text className="text-[13px] font-semibold text-gray-900">
                        {quickPreviewTextParts?.title ?? quickPreview.value.text} • Rp{formatAmountIDR(quickPreview.value.amount)}
                    </Text>

                    <Text className="mt-0.5 text-[12px] font-medium text-gray-500">
                        {quickPreview.value.date}
                        {quickPreview.value.splitCount ? ` • ${quickPreview.value.splitCount} orang` : ""}
                        {summedAmountMeta ? ` • total ${summedAmountMeta.parts} item` : ""}
                    </Text>

                    {quickPreviewTextParts?.subtitle && (
                        <Text className="mt-1 text-[12px] font-medium text-gray-500">
                            {quickPreviewTextParts.subtitle}
                        </Text>
                    )}

                    {quickPreviewSubtitleBreakdown?.length ? (
                        <View className="mt-2 flex flex-row flex-wrap gap-1.5">
                            {quickPreviewSubtitleBreakdown.slice(0, 5).map((item, index) => (
                                <View
                                    key={`${item.raw}-${index}`}
                                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1"
                                >
                                    <Text className="text-[11px] font-medium text-gray-500">
                                        {item.label}
                                        {item.qty ? ` ×${item.qty}` : ""}
                                        {item.amount !== undefined ? ` • Rp${formatAmountIDR(item.amount)}` : ""}
                                    </Text>
                                </View>
                            ))}
                            {quickPreviewSubtitleBreakdown.length > 5 && (
                                <View className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                                    <Text className="text-[11px] font-medium text-gray-400">
                                        +{quickPreviewSubtitleBreakdown.length - 5} item
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : quickPreviewSubtitleItems?.length ? (
                        <View className="mt-2 flex flex-row flex-wrap gap-1.5">
                            {quickPreviewSubtitleItems.slice(0, 4).map((item, index) => (
                                <View
                                    key={`${item}-${index}`}
                                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1"
                                >
                                    <Text className="text-[11px] font-medium text-gray-500">
                                        {item}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    {quickPreview.warnings?.length ? (
                        <View className="mt-2">
                            <Pressable onPress={onToggleQuickWarningDetails}>
                                <Text className="text-[12px] font-semibold text-blue-600 mb-1">
                                    {showQuickWarningDetails ? "Sembunyikan" : "Lihat"} peringatan parser
                                </Text>
                            </Pressable>

                            {showQuickWarningDetails && (
                                <View className="pl-2 border-l-2 border-gray-200">
                                    {quickPreview.warnings.map((warning, index) => (
                                        <Text key={`${warning.code}-${index}`} className="text-[12px] font-medium text-gray-500">
                                            • {warningShortText(warning)}
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : null}
                </View>
            )}

            {/* Hints & Errors */}
            {adaptiveHints.length > 0 && !showQuickFormatTemplates && (
                <View className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                    <Text className="text-[12px] font-medium text-gray-500">
                        {adaptiveHints[0]}
                    </Text>
                </View>
            )}

            {quickError && (
                <View className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <Text className="text-[12px] font-medium text-red-600">
                        {quickError}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default memo(QuickAddComposer);
