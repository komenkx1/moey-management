import React, { memo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Coffee, Utensils, Car, ShoppingBag, Receipt, MoreHorizontal } from 'lucide-react-native';
import { formatAmountIDR } from '@kemana/core/format';

export interface QuickRecallItem {
    id: string;
    category: string;
    title: string;
    amount: number;
}

interface QuickRecallChipsProps {
    items: QuickRecallItem[];
    onSelect?: (item: QuickRecallItem) => void;
    className?: string;
}

const CategoryIcons: Record<string, any> = {
    Makan: Utensils,
    Transport: Car,
    Belanja: ShoppingBag,
    Tagihan: Receipt,
    Hiburan: Coffee,
    Lainnya: MoreHorizontal
};

function QuickRecallChips({ items, onSelect, className = '' }: QuickRecallChipsProps) {
    if (!items || items.length === 0) return null;

    return (
        <View className={`flex-col gap-2.5 ${className}`}>
            <View className="flex-col gap-0.5 px-1">
                <Text className="text-[14px] font-bold tracking-tight text-gray-900">Catat lagi cepat</Text>
                <Text className="text-[12px] font-medium text-gray-500">Saran menyesuaikan kebiasaanmu.</Text>
            </View>

            {/* Horizontal Scrollable Row */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-4 pb-1 pt-1"
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
                {items.map((item) => {
                    const IconComponent = CategoryIcons[item.category] || CategoryIcons['Lainnya'];
                    return (
                        <Pressable
                            key={item.id}
                            onPress={() => onSelect?.(item)}
                            className="flex-col gap-2.5 rounded-[16px] w-[148px] border border-gray-200 bg-white p-3.5 shadow-sm active:border-blue-600 active:bg-blue-50"
                        >
                            <View className="flex-row items-center gap-2">
                                <View className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                                    <IconComponent color="#6B7280" size={16} />
                                </View>
                                <Text className="flex-1 text-[11px] font-medium uppercase tracking-wider text-gray-400" numberOfLines={1}>
                                    {item.category}
                                </Text>
                            </View>
                            <View className="flex-col gap-0.5 mt-0.5">
                                <Text className="text-[14px] font-semibold text-gray-900" numberOfLines={1}>
                                    {item.title}
                                </Text>
                                <Text className="mt-0.5 text-[15px] font-bold text-gray-900" numberOfLines={1}>
                                    -Rp{formatAmountIDR(item.amount)}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

export default memo(QuickRecallChips, (prev, next) => {
    if (prev.items.length !== next.items.length) return false;
    for (let i = 0; i < prev.items.length; i++) {
        if (prev.items[i].id !== next.items[i].id) return false;
    }
    return prev.className === next.className;
});
