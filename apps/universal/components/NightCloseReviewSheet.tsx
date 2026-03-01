import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Check, Plus, X } from 'lucide-react-native';
import { formatAmountIDR } from '@kemana/core/format';
import type { NightCloseTopCategory } from '@/app/night-close';

interface NightCloseReviewSheetProps {
    isOpen: boolean;
    dateLabel: string;
    total: number;
    count: number;
    promptLine: string;
    topCategory: NightCloseTopCategory | null;
    onClose: () => void;
    onDone: () => void;
    onAddEntry: () => void;
}

export function NightCloseReviewSheet({
    isOpen,
    dateLabel,
    total,
    count,
    promptLine,
    topCategory,
    onClose,
    onDone,
    onAddEntry
}: NightCloseReviewSheetProps) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['70%'], []);

    useEffect(() => {
        if (isOpen) {
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.dismiss();
        }
    }, [isOpen]);

    const renderBackdrop = useCallback(
        (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
        []
    );

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            onDismiss={onClose}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: '#ffffff', borderRadius: 24 }}
            handleIndicatorStyle={{ backgroundColor: '#e5e7eb', width: 48, height: 6 }}
        >
            <View className="flex-1">
                {/* HEADER */}
                <View className="flex-row items-center justify-between px-5 pb-2 pt-1 border-b border-white">
                    <View>
                        <Text className="text-[20px] font-bold text-gray-900">Tutup hari ini</Text>
                        <Text className="mt-0.5 text-[12px] font-medium text-gray-500">{dateLabel}</Text>
                    </View>
                    <Pressable
                        onPress={() => bottomSheetModalRef.current?.dismiss()}
                        className="rounded-full bg-gray-50 p-2 active:bg-gray-100"
                    >
                        <X size={20} color="#6b7280" strokeWidth={2.5} />
                    </Pressable>
                </View>

                <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 }}>

                    <View className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <Text className="text-[12px] font-semibold text-gray-500">Ringkasan hari ini</Text>
                        <Text className="mt-2 text-[24px] font-bold tracking-tight text-gray-900">
                            Rp{formatAmountIDR(total)}
                        </Text>
                        <Text className="mt-1 text-[13px] font-medium text-gray-500">{count} catatan</Text>

                        {topCategory && (
                            <View className="mt-3 flex-row items-center rounded-full border border-gray-200 bg-white px-3 py-1 self-start">
                                <Text className="text-[12px] font-semibold text-gray-800">
                                    Kategori terbesar: {topCategory.name} ({topCategory.percent}%)
                                </Text>
                            </View>
                        )}
                    </View>

                    <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <Text className="text-[13px] font-medium leading-relaxed text-gray-600">
                            {promptLine}
                        </Text>
                    </View>

                </BottomSheetScrollView>

                {/* BOTTOM FIXED BUTTONS */}
                <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-5 py-4 pb-8">
                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={onAddEntry}
                            className="flex-1 h-11 flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white active:border-brand"
                        >
                            <Plus size={16} color="#374151" />
                            <Text className="text-[13px] font-semibold text-gray-900">Tambah catatan</Text>
                        </Pressable>

                        <Pressable
                            onPress={onDone}
                            className="flex-1 h-11 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:bg-brand-pressed shadow-sm"
                        >
                            <Check size={16} color="#ffffff" />
                            <Text className="text-[13px] font-semibold text-white">Selesai</Text>
                        </Pressable>
                    </View>
                </View>

            </View>
        </BottomSheetModal>
    );
}
