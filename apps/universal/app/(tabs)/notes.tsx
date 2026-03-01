import React, { useMemo, useCallback } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';
import { useEntries, useDateFilter, useRules } from '@/store/kemana/hooks-granular';
import {
    getFilteredEntries,
    groupEntriesByDate,
    getSummaryStats,
    normalizeCustomDateRange
} from '@/lib/kemana-utils';
import { toTransactionItem } from '@/lib/dashboard-page-entry-utils';
import { inferCategory } from '@kemana/core/rules';
import NotesTabContent from '@/components/NotesTabContent';

export default function NotesScreen() {
    const { entries, setEntries } = useEntries();
    const { rules } = useRules();
    const { dateFilter, setDateFilter } = useDateFilter();

    const customRange = useMemo(() => normalizeCustomDateRange(null, new Date()), []);

    const filteredEntries = useMemo(
        () => getFilteredEntries(entries, dateFilter, new Date(), customRange),
        [dateFilter, entries, customRange]
    );

    const groupedEntriesResult = useMemo(() => groupEntriesByDate(filteredEntries), [filteredEntries]);

    const summaryStats = useMemo(
        () => getSummaryStats({
            allEntries: entries,
            filteredEntries,
            preset: dateFilter,
            customRange
        }),
        [dateFilter, entries, filteredEntries, customRange]
    );

    const dailyTotal = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const date of groupedEntriesResult.dates) {
            totals[date] = groupedEntriesResult.groups[date].reduce((acc, curr) => acc + curr.amount, 0);
        }
        return totals;
    }, [groupedEntriesResult]);

    const handleSaveTransaction = useCallback((entryId: string, updates: any) => {
        // Ported from previous Nextjs hook, simplified for demonstration
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e));
    }, [setEntries]);

    const handleDeleteTransaction = useCallback((entryId: string) => {
        setEntries(prev => prev.filter(e => e.id !== entryId));
    }, [setEntries]);

    const inferCategoryFromText = useCallback((text: string) => inferCategory(text, rules), [rules]);

    return (
        <SafeAreaView className="flex-1 bg-gray-50 bg-bg-base" edges={['top']}>
            {/* React Native specific TopAppBar replica */}
            <View className="flex flex-row items-center justify-between px-5 py-4 mt-2">
                <Text className="text-2xl font-bold text-gray-900">Catatan</Text>
            </View>

            <NotesTabContent
                storageWarning={null}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                customRange={customRange}
                onCustomRangeChange={() => { }}
                summaryStats={summaryStats}
                onOpenBulk={() => { }}
                onOpenDataTools={() => { }}
                orderedDates={groupedEntriesResult.dates}
                dailyTotal={dailyTotal}
                groupedEntries={groupedEntriesResult.groups}
                toTransactionItem={toTransactionItem}
                highlightEntryId={null}
                inferCategoryFromText={inferCategoryFromText}
                onSaveTransaction={handleSaveTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                filteredTransactionsLength={filteredEntries.length}
            />
        </SafeAreaView>
    );
}
