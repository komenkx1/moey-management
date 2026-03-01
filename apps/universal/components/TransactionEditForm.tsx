import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { formatAmountIDR } from '@kemana/core/format';
import { CATEGORIES, type PaymentMethod } from '@kemana/core/types';
import type { Entry } from '@kemana/core/types';

interface TransactionEditFormProps {
    item: Entry;
    displayAmount: number;
    onSave: (entryId: string, updates: Partial<Entry>) => void;
    onCancel: () => void;
    onDelete?: (id: string) => void;
    inferCategory?: (text: string) => string;
}

export default function TransactionEditForm({
    item,
    displayAmount,
    onSave,
    onCancel,
    onDelete,
    inferCategory,
}: TransactionEditFormProps) {
    const [draftTitle, setDraftTitle] = useState(item.text);
    const [draftAmount, setDraftAmount] = useState(String(item.amount));
    const [draftCategory, setDraftCategory] = useState(item.category);
    const [draftPaymentMethod, setDraftPaymentMethod] = useState(item.paymentMethod || '');

    const parsedDraftAmount = useMemo(() => {
        const cleaned = draftAmount.replace(/[^0-9]/g, '');
        return Number(cleaned) || 0;
    }, [draftAmount]);

    const isDirty =
        draftTitle.trim() !== item.text.trim() ||
        parsedDraftAmount !== item.amount ||
        draftCategory !== item.category ||
        draftPaymentMethod !== (item.paymentMethod || '');

    const handleSave = () => {
        if (parsedDraftAmount <= 0) return;
        onSave(item.id, {
            text: draftTitle.trim() || item.text,
            amount: parsedDraftAmount,
            category: draftCategory,
            paymentMethod: (draftPaymentMethod || undefined) as PaymentMethod | undefined,
            updatedAt: new Date().toISOString(),
        });
    };

    const formatAmountDisplay = (val: string) => {
        const num = Number(val.replace(/[^0-9]/g, ''));
        if (num === 0) return '';
        return num.toLocaleString('id-ID');
    };

    return (
        <View className="border-t border-gray-200 bg-gray-50/50 p-4">
            <View className="flex flex-col gap-4">
                {/* Split info (read-only) */}
                {item.split?.shares?.length ? (
                    <View className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5">
                        <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Info Split ({item.split.shares.length} orang)
                        </Text>
                        <View className="mt-1.5 flex-row items-center justify-between">
                            <Text className="text-[12px] font-medium text-gray-500">Kamu Bayar</Text>
                            <Text className="text-[12px] font-semibold text-gray-900">
                                -Rp{formatAmountIDR(displayAmount)}
                            </Text>
                        </View>
                        {item.split.shares.some(s => s.person.toLowerCase() !== 'kamu') && (
                            <View className="mt-1 border-t border-gray-200/50 pt-1">
                                <Text className="text-[11px] font-medium text-gray-400">Dibayarin untuk:</Text>
                                <View className="mt-0.5 flex-row flex-wrap gap-1">
                                    {item.split.shares
                                        .filter(s => s.person.toLowerCase() !== 'kamu')
                                        .slice(0, 3)
                                        .map((s, i) => (
                                            <View key={i} className="rounded-md bg-white/50 px-1.5 py-0.5">
                                                <Text className="text-[10px] font-medium text-gray-500">
                                                    {s.person}: Rp{formatAmountIDR(s.amount)}
                                                </Text>
                                            </View>
                                        ))}
                                    {item.split.shares.length > 4 && (
                                        <View className="rounded-md bg-white/50 px-1.5 py-0.5">
                                            <Text className="text-[10px] font-medium text-gray-500">
                                                +{item.split.shares.length - 4} lainnya
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                ) : null}

                {/* Edit Form Card */}
                <View className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/30 p-3">
                    <View className="flex-row items-center justify-between border-b border-blue-200/40 pb-2">
                        <Text className="text-[13px] font-semibold text-blue-600">Edit Catatan</Text>
                    </View>

                    {/* Title */}
                    <View className="flex flex-col gap-1.5">
                        <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Judul
                        </Text>
                        <TextInput
                            value={draftTitle}
                            onChangeText={setDraftTitle}
                            placeholder="Misal: Makan siang"
                            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-900"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    {/* Amount */}
                    <View className="flex flex-col gap-1.5">
                        <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Jumlah (Rp)
                        </Text>
                        <TextInput
                            value={formatAmountDisplay(draftAmount)}
                            onChangeText={(text) => setDraftAmount(text.replace(/[^0-9]/g, ''))}
                            placeholder="0"
                            keyboardType="numeric"
                            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-semibold text-gray-900"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>


                    {/* Category Picker */}
                    <View className="flex flex-col gap-1.5 mt-1">
                        <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Kategori
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 6 }}
                        >
                            {CATEGORIES.map((cat) => (
                                <Pressable
                                    key={cat}
                                    onPress={() => setDraftCategory(cat)}
                                    className={`rounded-full border px-3 py-1.5 ${draftCategory === cat
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white'
                                        }`}
                                >
                                    <Text
                                        className={`text-[12px] font-medium ${draftCategory === cat
                                            ? 'text-blue-600'
                                            : 'text-gray-500'
                                            }`}
                                    >
                                        {cat}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row items-center justify-between border-t border-gray-200/60 pt-3">
                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={onCancel}
                            className="h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 active:bg-gray-50"
                        >
                            <Text className="text-[13px] font-semibold text-gray-500">Batal</Text>
                        </Pressable>
                        {onDelete && (
                            <Pressable
                                onPress={() => onDelete(item.id)}
                                className="h-10 items-center justify-center rounded-xl border border-red-300 bg-white px-4 active:bg-red-50"
                            >
                                <Text className="text-[13px] font-semibold text-red-500">Hapus</Text>
                            </Pressable>
                        )}
                    </View>
                    <Pressable
                        onPress={handleSave}
                        disabled={!isDirty}
                        className={`h-10 items-center justify-center rounded-xl px-5 ${isDirty
                            ? 'bg-blue-600 active:bg-blue-700'
                            : 'bg-gray-200'
                            }`}
                    >
                        <Text
                            className={`text-[13px] font-semibold ${isDirty ? 'text-white' : 'text-gray-400'
                                }`}
                        >
                            Simpan
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
