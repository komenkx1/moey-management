import { memo } from 'react';
import { View, Text } from 'react-native';
import { formatAmountIDR } from '@kemana/core/format';

interface SummaryHeroCardProps {
    expense: number;
    transactionCount: number;
    averagePerDay: number;
    periodLabel?: string;
    className?: string;
    children?: React.ReactNode;
}

function SummaryHeroCard({
    expense,
    transactionCount,
    averagePerDay,
    periodLabel = 'Bulan ini',
    className = '',
    children,
}: SummaryHeroCardProps) {
    const roundedAveragePerDay = Math.max(0, Math.round(averagePerDay || 0));

    return (
        <View
            className={`relative flex w-full flex-col gap-5 rounded-[24px] bg-white p-5 shadow-sm border border-gray-200 ${className}`}
        >
            <View className="flex flex-col gap-1.5 items-start">
                <View className="rounded-full bg-gray-100 px-3 py-1">
                    <Text className="text-[11px] font-semibold tracking-wide text-gray-500">
                        {periodLabel}
                    </Text>
                </View>
                <View className="mt-1 flex flex-col gap-0">
                    <Text className="text-[14px] font-medium text-gray-500">Pengeluaran</Text>
                    <Text className="text-[32px] font-bold tracking-tight text-gray-900">
                        -Rp{formatAmountIDR(expense)}
                    </Text>
                </View>
            </View>

            <View className="flex flex-row justify-between border-t border-gray-200/60 pt-4">
                <View className="flex flex-col gap-0.5">
                    <Text className="text-[12px] font-medium text-gray-400">Total catatan</Text>
                    <Text className="text-[14px] font-semibold text-gray-900">
                        {transactionCount} catatan
                    </Text>
                </View>
                <View className="flex flex-col gap-0.5 items-end">
                    <Text className="text-[12px] font-medium text-gray-400">Rata-rata harian</Text>
                    <Text className="text-[14px] font-semibold text-gray-900">
                        -Rp{formatAmountIDR(roundedAveragePerDay)}/hari
                    </Text>
                </View>
            </View>

            {children && (
                <View className="flex flex-col gap-3">
                    {children}
                </View>
            )}
        </View>
    );
}

export default memo(SummaryHeroCard, (prev, next) => {
    return (
        prev.expense === next.expense &&
        prev.transactionCount === next.transactionCount &&
        prev.averagePerDay === next.averagePerDay &&
        prev.periodLabel === next.periodLabel &&
        prev.className === next.className
    );
});
