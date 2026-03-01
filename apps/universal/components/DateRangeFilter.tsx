import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import {
    FILTER_OPTIONS,
    getDefaultCustomDateRange,
    normalizeCustomDateRange,
    parseDateKey,
    type CustomDateRange,
    type DateFilterPreset
} from '@/lib/kemana-utils';

interface DateRangeFilterProps {
    value: DateFilterPreset;
    onChange: (next: DateFilterPreset) => void;
    options?: Array<{ value: DateFilterPreset; label: string }>;
    customRange?: CustomDateRange | null;
    onCustomRangeChange?: (next: CustomDateRange) => void;
    className?: string;
}

function DateRangeFilter({
    value,
    onChange,
    options = FILTER_OPTIONS,
    customRange,
    onCustomRangeChange,
    className = ''
}: DateRangeFilterProps) {
    const resolvedCustomRange = normalizeCustomDateRange(customRange, new Date());
    const fallbackCustomRange = getDefaultCustomDateRange(new Date());
    const canRenderCustomInputs = value === 'custom' && Boolean(onCustomRangeChange);
    const quickPresetOptions = options.filter((option) => option.value !== 'custom');
    const customOptionLabel = options.find((option) => option.value === 'custom')?.label ?? 'Custom';

    const formatCustomRangeLabel = (range: CustomDateRange) => {
        const startDate = parseDateKey(range.start);
        const endDate = parseDateKey(range.end);
        if (!startDate || !endDate) {
            return `${range.start} - ${range.end}`;
        }

        const formatter = new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short'
        });
        return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
    };

    return (
        <View className={`rounded-[16px] border border-gray-200 bg-white p-1 shadow-sm ${className}`}>
            <View className="flex-row gap-1">
                {quickPresetOptions.map((option) => {
                    const selected = option.value === value;
                    return (
                        <Pressable
                            key={option.value}
                            onPress={() => onChange(option.value)}
                            className={`h-9 flex-1 shrink-0 rounded-[12px] items-center justify-center px-2 active:bg-gray-100 ${selected
                                    ? 'bg-gray-900 shadow-sm'
                                    : 'bg-transparent'
                                }`}
                        >
                            <Text className={`text-[13px] font-semibold ${selected ? 'text-white' : 'text-gray-500'}`}>
                                {option.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {onCustomRangeChange ? (
                <Pressable
                    onPress={() => onChange('custom')}
                    className={`mt-3 flex-row h-9 w-full items-center justify-between rounded-[12px] border px-3 transition-colors ${value === 'custom'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 bg-gray-50 active:border-blue-200'
                        }`}
                >
                    <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                        <CalendarDays size={14} color={value === 'custom' ? '#2563eb' : '#6b7280'} />
                        <Text
                            className={`text-[12px] font-semibold truncate ${value === 'custom' ? 'text-blue-600' : 'text-gray-500'
                                }`}
                            numberOfLines={1}
                        >
                            {value === 'custom'
                                ? `Rentang: ${formatCustomRangeLabel(resolvedCustomRange)}`
                                : `${customOptionLabel} tanggal`}
                        </Text>
                    </View>
                    <View
                        className={`shrink-0 rounded-full px-2 py-0.5 border ${value === 'custom'
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-white border-gray-200 shadow-sm'
                            }`}
                    >
                        <Text className={`text-[10px] font-semibold ${value === 'custom' ? 'text-white' : 'text-gray-400'}`}>
                            {value === 'custom' ? 'Aktif' : 'Pilih'}
                        </Text>
                    </View>
                </Pressable>
            ) : null}

            {/* Note: In React Native, native DatePickers (like @react-native-community/datetimepicker) 
          are typically used instead of HTML <input type="date" />. 
          For now, we'll render a placeholder view to indicate custom selection is active,
          but complex custom inputs may require additional libraries or a modal. */}
            {canRenderCustomInputs ? (
                <View className="mt-2 flex-row items-end gap-2 px-1 pb-1">
                    <View className="flex-1">
                        <Text className="px-1 text-[11px] font-semibold text-gray-400 mb-1">Mulai</Text>
                        <View className="h-9 rounded-[10px] justify-center border border-gray-200 bg-gray-50 px-2.5">
                            <Text className="text-[12px] font-semibold text-gray-900">{resolvedCustomRange.start}</Text>
                        </View>
                    </View>

                    <Text className="pb-2 text-[12px] font-semibold text-gray-400">s/d</Text>

                    <View className="flex-1">
                        <Text className="px-1 text-[11px] font-semibold text-gray-400 mb-1">Sampai</Text>
                        <View className="h-9 rounded-[10px] justify-center border border-gray-200 bg-gray-50 px-2.5">
                            <Text className="text-[12px] font-semibold text-gray-900">{resolvedCustomRange.end}</Text>
                        </View>
                    </View>
                </View>
            ) : null}
        </View>
    );
}

export default memo(DateRangeFilter, (prev, next) => {
    return (
        prev.value === next.value &&
        prev.customRange?.start === next.customRange?.start &&
        prev.customRange?.end === next.customRange?.end &&
        prev.className === next.className
    );
});
