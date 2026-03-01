import React, { useMemo, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';
import InsightTabContent from '@/components/InsightTabContent';
import { useInsightData } from '@/hooks/useInsightData';
import { useEntries, useDateFilter, useRules } from '@/store/kemana/hooks-granular';
import { normalizeCustomDateRange } from '@/lib/kemana-utils';
import { useRouter } from 'expo-router';
import DateRangeFilter from '@/components/DateRangeFilter';

export default function InsightScreen() {
    const router = useRouter();
    const { entries } = useEntries();
    const { dateFilter, setDateFilter } = useDateFilter();
    const insightTrendScrollRef = useRef(null);
    const [isTrendChartOverflowing, setIsTrendChartOverflowing] = React.useState(false);
    // TODO: implement custom date range global state if fully needed
    const customRange = useMemo(() => normalizeCustomDateRange(null, new Date()), []);

    const insightData = useInsightData({
        entries,
        activeTab: 'insight',
        dateFilter,
        normalizedCustomRange: customRange,
        insightTrendScrollRef,
        setIsTrendChartOverflowing,
    });

    return (
        <SafeAreaView className="flex-1 bg-gray-50 bg-bg-base" edges={['top']}>
            {/* React Native specific TopAppBar replica */}
            <View className="flex flex-row items-center justify-between px-5 py-4 mt-2">
                <Text className="text-2xl font-bold text-gray-900">Insight</Text>
            </View>

            <View className="px-5 pb-2">
                <DateRangeFilter
                    value={dateFilter}
                    onChange={setDateFilter}
                    customRange={customRange}
                // onCustomRangeChange={setCustomRange} // Omitted until datepicker is setup
                />
            </View>

            <ScrollView className="flex-1">
                <InsightTabContent
                    {...insightData}
                    isTrendChartOverflowing={isTrendChartOverflowing}
                    onPrimaryAction={() => router.navigate('/')}
                    onOpenNotes={() => router.navigate('/notes')}
                />
            </ScrollView>
        </SafeAreaView>
    );
}
