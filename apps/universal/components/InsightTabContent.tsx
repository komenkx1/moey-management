import React from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import {
    ArrowDownRight,
    ArrowUpRight,
    CalendarDays,
    CircleHelp,
    CreditCard,
    Flame,
    PieChart
} from 'lucide-react-native';
import { formatAmountCompact, formatAmountIDR } from '@kemana/core/format';

type TrendTone = "up" | "down" | "neutral";

export interface InsightTrendBadge {
    label: string;
    tone: TrendTone;
}

export interface InsightWhyCard {
    key: string;
    label: string;
    value: string;
    detail: string;
    isCurrencyDetail: boolean;
}

export interface InsightTopCategory {
    category: string;
    amount: number;
    percentage: number;
}

export interface InsightLargestEntry {
    id: string;
    title: string;
    dateLabel: string;
    category: string;
    paymentMethod: string;
    amount: number;
}

export interface InsightSummary {
    periodLabel: string;
    total: number;
    hasData: boolean;
    entryCount: number;
    windowDays: number | null;
    activeDays: number;
    topCategories: InsightTopCategory[];
    largestEntries: InsightLargestEntry[];
}

export interface TrendBucket {
    label: string;
    total: number;
}

export interface InsightCoachCopy {
    title: string;
    subtitle: string;
    primaryLabel: string;
    secondaryLabel: string;
}

interface InsightTabContentProps {
    insightSevenDay: InsightSummary;
    insightTrendBadge: InsightTrendBadge;
    insightAverageAmountLabel: string;
    insightWhyCards: InsightWhyCard[];
    trendTitle: string;
    trendSubtitle: string;
    isTrendChartOverflowing: boolean;
    insightTrendSeriesDisplay: TrendBucket[];
    insightMaxTrendTotal: number;
    trendCompactItemWidth?: string;
    insightCoachCopy: InsightCoachCopy;
    onPrimaryAction: () => void;
    onOpenNotes: () => void;
}

const { width } = Dimensions.get('window');

export default function InsightTabContent({
    insightSevenDay,
    insightTrendBadge,
    insightAverageAmountLabel,
    insightWhyCards,
    trendTitle,
    trendSubtitle,
    isTrendChartOverflowing,
    insightTrendSeriesDisplay,
    insightMaxTrendTotal,
    insightCoachCopy,
    onPrimaryAction,
    onOpenNotes,
}: InsightTabContentProps) {
    return (
        <View className="flex-1 px-5 py-2 mt-4 space-y-5 flex-col gap-5 pb-24">
            {/* HEADER SECTION */}
            <View className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                <View className="flex-row items-center justify-between">
                    <View className="rounded-full bg-gray-100 px-3 py-1">
                        <Text className="text-[11px] font-semibold text-gray-500">
                            {insightSevenDay.periodLabel}
                        </Text>
                    </View>
                    <View
                        className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${insightTrendBadge.tone === 'up'
                            ? 'bg-amber-100'
                            : insightTrendBadge.tone === 'down'
                                ? 'bg-green-100'
                                : 'bg-gray-100'
                            }`}
                    >
                        {insightTrendBadge.tone === 'up' ? (
                            <ArrowUpRight size={14} color="#d97706" />
                        ) : insightTrendBadge.tone === 'down' ? (
                            <ArrowDownRight size={14} color="#16a34a" />
                        ) : (
                            <PieChart size={14} color="#6b7280" />
                        )}
                        <Text
                            className={`text-[11px] font-semibold ${insightTrendBadge.tone === 'up'
                                ? 'text-amber-600'
                                : insightTrendBadge.tone === 'down'
                                    ? 'text-green-600'
                                    : 'text-gray-500'
                                }`}
                        >
                            {insightTrendBadge.tone === 'up' ? '+' : ''}
                            {insightTrendBadge.label}
                        </Text>
                    </View>
                </View>

                <Text className="mt-4 text-[13px] font-medium text-gray-500">Pengeluaranmu</Text>
                <Text className="mt-1 text-[36px] font-bold tracking-tight text-gray-900">
                    -Rp{formatAmountIDR(insightSevenDay.total)}
                </Text>
                <Text className="mt-2 text-[12px] font-medium text-gray-500">
                    {insightSevenDay.hasData
                        ? `${insightSevenDay.periodLabel} kamu mencatat ${insightSevenDay.entryCount} transaksi.`
                        : `Belum ada catatan untuk dianalisis di ${insightSevenDay.periodLabel.toLowerCase()}.`}
                </Text>

                <View className="mt-4 flex-row gap-2 flex-wrap">
                    <View className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 flex-1">
                        <Text className="text-[11px] font-medium text-gray-400">Catatan</Text>
                        <Text className="mt-1 text-[16px] font-bold text-gray-900">
                            {insightSevenDay.entryCount}
                        </Text>
                    </View>
                    <View className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 flex-1">
                        <Text className="text-[11px] font-medium text-gray-400">Hari aktif</Text>
                        <Text className="mt-1 text-[16px] font-bold text-gray-900">
                            {insightSevenDay.windowDays
                                ? `${insightSevenDay.activeDays}/${insightSevenDay.windowDays}`
                                : `${insightSevenDay.activeDays} hari`}
                        </Text>
                    </View>
                    <View className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                        <Text className="text-[11px] font-medium text-gray-400">
                            {insightSevenDay.windowDays ? 'Rata-rata/hari' : 'Rata-rata/hari aktif'}
                        </Text>
                        <Text className="mt-1 text-[16px] font-bold leading-tight text-gray-900">
                            -{insightAverageAmountLabel}
                        </Text>
                    </View>
                </View>
            </View>

            {/* WHY SEGMENT */}
            <View className="rounded-[20px] border border-gray-200 bg-white px-4 py-4">
                <View className="flex-row items-center gap-2 mb-3">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <CircleHelp size={18} color="#4f46e5" />
                    </View>
                    <Text className="text-[16px] font-bold text-gray-900">Kenapa segitu?</Text>
                </View>

                {insightWhyCards.length > 0 ? (
                    <View className="flex-col gap-2">
                        {insightWhyCards.map((item) => (
                            <View
                                key={item.key}
                                className="flex-row items-start justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-3"
                            >
                                <View className="flex-1 pr-2">
                                    <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                        {item.label}
                                    </Text>
                                    <Text className="mt-1 text-[14px] font-semibold text-gray-900">
                                        {item.value}
                                    </Text>
                                </View>
                                <Text className="text-[11px] font-medium text-gray-500 mt-1">
                                    {item.isCurrencyDetail ? '-' : ''}
                                    {item.detail}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
                        <Text className="text-[12px] font-medium text-gray-500">
                            Belum cukup data untuk jelasin penyebab pengeluaranmu.
                        </Text>
                    </View>
                )}
            </View>

            {/* TOP CATEGORIES */}
            <View className="rounded-[20px] border border-gray-200 bg-white px-4 py-4">
                <View className="flex-row items-center gap-2 mb-3">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                        <Flame size={18} color="#ea580c" />
                    </View>
                    <Text className="text-[16px] font-bold text-gray-900">Dari mana paling banyak keluar</Text>
                </View>

                {insightSevenDay.topCategories.length > 0 ? (
                    <View className="flex-col gap-3">
                        {insightSevenDay.topCategories.map((item) => (
                            <View key={item.category} className="flex-col gap-1.5">
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-[13px] font-semibold text-gray-900">{item.category}</Text>
                                    <Text className="text-[12px] font-medium text-gray-500">
                                        -Rp{formatAmountIDR(item.amount)} ({item.percentage}%)
                                    </Text>
                                </View>
                                <View className="h-2 rounded-full bg-gray-100 w-full overflow-hidden">
                                    <View
                                        className="h-full rounded-full bg-brand"
                                        style={{ width: `${Math.max(8, item.percentage)}%` }}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
                        <Text className="text-[12px] font-medium text-gray-500">
                            Belum ada pengeluaran untuk ditampilkan.
                        </Text>
                    </View>
                )}
            </View>

            {/* TREND CHART */}
            <View className="rounded-[20px] border border-gray-200 bg-white px-4 py-3.5">
                <View className="flex-row items-center gap-2 mb-1">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-soft">
                        <CalendarDays size={18} color="#4f46e5" />
                    </View>
                    <Text className="text-[16px] font-bold text-gray-900">{trendTitle}</Text>
                </View>
                <Text className="mt-1 text-[12px] font-medium text-gray-500">{trendSubtitle}</Text>

                {isTrendChartOverflowing && (
                    <Text className="mt-2 text-[10px] font-medium text-gray-400">
                        Geser chart ke kanan untuk lihat data yang lebih lama.
                    </Text>
                )}

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-4 pb-1"
                    contentContainerStyle={{ alignItems: 'flex-start', minWidth: '100%', paddingRight: 4, ...(isTrendChartOverflowing ? {} : { justifyContent: 'center' }) }}
                >
                    <View className={`flex-row items-start ${isTrendChartOverflowing ? 'justify-start' : 'justify-center flex-1'}`}>
                        {insightTrendSeriesDisplay.map((bucket, index) => {
                            const isLatest = index === 0;
                            const heightPercentage = insightMaxTrendTotal
                                ? Math.max(16, Math.round((bucket.total / insightMaxTrendTotal) * 100))
                                : 16;

                            // Replicating Web Flex Basis logic for columns
                            const columnWidthStyle = isTrendChartOverflowing ? { width: 56, marginRight: 10 } : { flex: 1, marginHorizontal: 4 };

                            return (
                                <View
                                    key={`${bucket.label}-${index}`}
                                    className="flex-col items-center"
                                    style={columnWidthStyle}
                                >
                                    <View className="h-28 w-full max-w-[56px] items-end justify-end rounded-xl bg-gray-50 px-1.5 pb-1.5">
                                        <View
                                            className={`w-full rounded-lg ${isLatest ? 'bg-brand' : 'bg-brand/35'}`}
                                            style={{ height: `${heightPercentage}%` }}
                                        />
                                    </View>
                                    <Text
                                        className="mt-2 w-full text-center text-[10px] font-semibold text-gray-500 px-0.5"
                                        numberOfLines={1}
                                    >
                                        {bucket.label}
                                    </Text>
                                    <Text
                                        className={`w-full text-center text-[10px] font-semibold ${isLatest ? 'text-brand' : 'text-gray-400'}`}
                                        numberOfLines={1}
                                    >
                                        {bucket.total > 0 ? `Rp${formatAmountCompact(bucket.total)}` : 'Rp0'}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>

            {/* LARGEST ENTRIES */}
            <View className="rounded-[20px] border border-gray-200 bg-white px-4 py-4">
                <Text className="text-[16px] font-bold text-gray-900 mb-3">
                    Transaksi terbesar {insightSevenDay.periodLabel.toLowerCase()}
                </Text>
                {insightSevenDay.largestEntries.length > 0 ? (
                    <View className="flex-col gap-2.5">
                        {insightSevenDay.largestEntries.map((item) => (
                            <View
                                key={item.id}
                                className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
                            >
                                <View className="flex-1 pr-2">
                                    <Text className="text-[14px] font-semibold text-gray-900" numberOfLines={1}>{item.title}</Text>
                                    <Text className="mt-0.5 text-[11px] font-medium text-gray-500" numberOfLines={1}>
                                        {item.dateLabel} • {item.category} • {item.paymentMethod}
                                    </Text>
                                </View>
                                <Text className="text-[13px] font-bold text-gray-900">-Rp{formatAmountIDR(item.amount)}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
                        <Text className="text-[12px] font-medium text-gray-500">
                            Belum ada transaksi yang bisa dirangkum.
                        </Text>
                    </View>
                )}
            </View>

            {/* COACH COPY (Bottom Banner) */}
            <View className="rounded-[20px] border border-gray-200 bg-white px-4 py-4 mb-4">
                <View className="flex-row items-start gap-3">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-soft">
                        <CreditCard size={18} color="#4f46e5" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[15px] font-bold leading-snug text-gray-900">
                            {insightCoachCopy.title}
                        </Text>
                        <Text className="mt-1 text-[12px] font-medium text-gray-500 leading-relaxed">
                            {insightCoachCopy.subtitle}
                        </Text>
                    </View>
                </View>

                <View className="mt-3 flex-col gap-2 sm:flex-row">
                    <Pressable
                        onPress={onPrimaryAction}
                        className="h-10 w-full items-center justify-center rounded-lg bg-brand active:opacity-80"
                    >
                        <Text className="text-[12px] font-semibold text-white">
                            {insightCoachCopy.primaryLabel}
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={onOpenNotes}
                        className="h-10 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 active:bg-gray-100"
                    >
                        <Text className="text-[12px] font-semibold text-gray-600">
                            {insightCoachCopy.secondaryLabel}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
