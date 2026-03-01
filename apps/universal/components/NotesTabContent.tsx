import React, { useCallback, useMemo } from 'react';
import { View, Text, SectionList, Pressable } from 'react-native';
import { formatAmountIDR } from '@kemana/core/format';
import type { Entry } from '@kemana/core/types';
import { formatDayLabel, type CustomDateRange, type DateFilterPreset, type TodaySummaryStats } from '@/lib/kemana-utils';
import DateRangeFilter from '@/components/DateRangeFilter';
import { TransactionCard, type TransactionItem } from '@/components/TransactionCard';
import { useExpandedIds } from '@/store/kemana/hooks-granular';

interface NotesTabContentProps {
    storageWarning: string | null;
    dateFilter: DateFilterPreset;
    onDateFilterChange: (value: DateFilterPreset) => void;
    customRange: CustomDateRange;
    onCustomRangeChange: (range: CustomDateRange) => void;
    summaryStats: TodaySummaryStats;
    onOpenBulk: () => void;
    onOpenDataTools: () => void;
    orderedDates: string[];
    dailyTotal: Record<string, number>;
    groupedEntries: Record<string, Entry[]>;
    toTransactionItem: (entry: Entry) => TransactionItem;
    highlightEntryId: string | null;
    inferCategoryFromText: (value: string) => Entry['category'];
    onSaveTransaction: (entryId: string, updates: Partial<Entry>) => void;
    onDeleteTransaction: (entryId: string) => void;
    filteredTransactionsLength: number;
}

export default function NotesTabContent({
    storageWarning,
    dateFilter,
    onDateFilterChange,
    customRange,
    onCustomRangeChange,
    summaryStats,
    onOpenBulk,
    onOpenDataTools,
    orderedDates,
    dailyTotal,
    groupedEntries,
    toTransactionItem,
    highlightEntryId,
    inferCategoryFromText,
    onSaveTransaction,
    onDeleteTransaction,
    filteredTransactionsLength,
}: NotesTabContentProps) {
    const { expandedIds, setExpandedIds } = useExpandedIds();

    const handleToggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, [setExpandedIds]);

    // Transform groupedEntries into SectionList data structure
    const sectionData = useMemo(() => {
        return orderedDates.map(dateKey => ({
            title: dateKey,
            data: groupedEntries[dateKey] || [],
        }));
    }, [orderedDates, groupedEntries]);

    const renderHeader = () => (
        <View className="mb-4 px-5">
            {storageWarning ? (
                <View className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <Text className="text-[12px] font-medium text-red-600">
                        {storageWarning}
                    </Text>
                </View>
            ) : null}

            <DateRangeFilter
                value={dateFilter}
                onChange={onDateFilterChange}
                customRange={customRange}
                onCustomRangeChange={onCustomRangeChange}
                className="mb-2"
            />

            <View className="mb-3 mt-2 rounded-[16px] bg-white px-4 py-3 border border-gray-200 shadow-sm">
                <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-semibold text-gray-500">{summaryStats.periodLabel}</Text>
                    <View
                        className={`rounded-full px-2.5 py-1 ${summaryStats.status.tone === 'boros'
                            ? 'bg-red-100'
                            : summaryStats.status.tone === 'lumayan'
                                ? 'bg-amber-100'
                                : 'bg-gray-100'
                            }`}
                    >
                        <Text
                            className={`text-[11px] font-semibold ${summaryStats.status.tone === 'boros'
                                ? 'text-red-600'
                                : summaryStats.status.tone === 'lumayan'
                                    ? 'text-amber-600'
                                    : 'text-gray-500'
                                }`}
                        >
                            {summaryStats.status.label}
                        </Text>
                    </View>
                </View>
                <Text className="mt-1 text-[22px] font-bold tracking-tight text-gray-900">
                    -Rp{formatAmountIDR(summaryStats.totalAmount)}
                </Text>
                <Text className="mt-1 text-[12px] font-medium text-gray-500">{summaryStats.compareText}</Text>
            </View>

            <View className="flex-row gap-2">
                <Pressable
                    onPress={onOpenBulk}
                    className="flex-1 h-10 items-center justify-center rounded-xl border border-gray-200 bg-white active:bg-gray-50"
                >
                    <Text className="text-[13px] font-semibold text-gray-900">Catat banyak</Text>
                </Pressable>
                <Pressable
                    onPress={onOpenDataTools}
                    className="flex-1 h-10 items-center justify-center rounded-xl border border-gray-200 bg-white active:bg-gray-50"
                >
                    <Text className="text-[13px] font-semibold text-gray-900">Data & tools</Text>
                </Pressable>
            </View>
        </View>
    );

    const renderEmptyComponent = () => (
        <View className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 mx-5 px-4 py-10 items-center">
            <Text className="text-[14px] font-semibold text-gray-900 text-center">
                {summaryStats.emptyState?.title ?? 'Belum ada catatan.'}
            </Text>
            <Text className="mt-1 text-[12px] font-medium text-gray-500 text-center">
                {summaryStats.emptyState?.subtitle ?? 'Mulai dari input cepat atau tombol Catat.'}
            </Text>
        </View>
    );

    return (
        <SectionList
            className="flex-1 px-5 pt-2"
            sections={sectionData}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={filteredTransactionsLength === 0 ? renderEmptyComponent : null}
            contentContainerStyle={{}}
            stickySectionHeadersEnabled={true}
            renderSectionHeader={({ section: { title } }) => (
                <View className="flex-row items-center justify-between border-b border-gray-100 bg-white/95 pb-2 pt-3 backdrop-blur-md mb-2">
                    <Text className="text-[14px] font-bold text-gray-900">{formatDayLabel(title)}</Text>
                    <Text className="text-[12px] font-medium text-gray-500">
                        -Rp{formatAmountIDR(dailyTotal[title] ?? 0)}
                    </Text>
                </View>
            )}
            renderItem={({ item }) => {
                const transaction = toTransactionItem(item);
                const highlighted = highlightEntryId === transaction.id;

                return (
                    <View className={`mb-3 ${highlighted ? 'rounded-[16px] border-2 border-brand' : ''}`}>
                        <TransactionCard
                            item={transaction}
                            isExpanded={expandedIds.has(transaction.id)}
                            onToggleExpand={() => handleToggleExpand(transaction.id)}
                            inferCategory={inferCategoryFromText}
                            onSave={onSaveTransaction}
                            onDelete={onDeleteTransaction}
                        />
                    </View>
                );
            }}
        />
    );
}
