import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, Keyboard } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { formatAmountIDR } from '@kemana/core/format';

export interface BulkPreviewLine {
    line: string;
    ok: boolean;
    reason?: string;
    amount?: number;
}

interface BulkInputSheetProps {
    isOpen: boolean;
    onClose: () => void;
    input: string;
    onInputChange: (value: string) => void;
    preview: BulkPreviewLine[];
    validCount: number;
    onSave: () => void;
}

export function BulkInputSheet({
    isOpen,
    onClose,
    input,
    onInputChange,
    preview,
    validCount,
    onSave
}: BulkInputSheetProps) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['85%'], []);

    useEffect(() => {
        if (isOpen) {
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.dismiss();
            Keyboard.dismiss();
        }
    }, [isOpen]);

    const totalLines = preview.length;
    const invalidLines = preview.filter((item) => !item.ok).slice(0, 3);
    const validPreviewLines = preview.filter((line) => line.ok).slice(0, 2);

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
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
        >
            <View className="flex-1">
                {/* HEADER */}
                <View className="flex-row items-center justify-between px-5 pb-2 pt-1 border-b border-white">
                    <View>
                        <Text className="text-[20px] font-bold text-gray-900">Catat banyak sekaligus</Text>
                        <Text className="mt-0.5 text-[12px] font-medium text-gray-400">
                            Satu baris untuk satu catatan. Format tetap cepat.
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => bottomSheetModalRef.current?.dismiss()}
                        className="rounded-full bg-gray-50 p-2 active:bg-gray-100"
                    >
                        <X size={20} color="#6b7280" strokeWidth={2.5} />
                    </Pressable>
                </View>

                <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">

                    <BottomSheetTextInput
                        value={input}
                        onChangeText={onInputChange}
                        multiline
                        textAlignVertical="top"
                        className="min-h-[180px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-900 leading-relaxed"
                        placeholder={"Contoh:\nkopi 18\nparkir 4k\nmakan siang 25k 2p"}
                        placeholderTextColor="#9ca3af"
                    />

                    <View className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                        <Text className="text-[12px] font-semibold text-gray-500">
                            Valid {validCount}/{totalLines || 0} baris
                        </Text>

                        {totalLines > 0 && (
                            <View className="mt-2 flex-col gap-1.5">
                                {validPreviewLines.map((line, idx) => (
                                    <Text
                                        key={`ok-${idx}`}
                                        className="text-[12px] font-medium text-gray-500"
                                        numberOfLines={1}
                                    >
                                        {line.line} • Rp{formatAmountIDR(line.amount ?? 0)}
                                    </Text>
                                ))}

                                {invalidLines.map((line, idx) => (
                                    <Text key={`invalid-${idx}`} className="text-[12px] font-medium text-red-500">
                                        {line.line} {line.reason ? `• ${line.reason}` : ""}
                                    </Text>
                                ))}
                            </View>
                        )}
                    </View>
                </BottomSheetScrollView>

                {/* BOTTOM FLOATING SAVE BUTTON */}
                <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-5 py-4 pb-8">
                    <Pressable
                        onPress={() => {
                            if (validCount > 0) {
                                onSave();
                                bottomSheetModalRef.current?.dismiss();
                            }
                        }}
                        disabled={validCount === 0}
                        className={`w-full items-center justify-center rounded-2xl py-4 flex-row ${validCount === 0 ? "bg-brand/50" : "bg-brand active:bg-brand-pressed"
                            }`}
                    >
                        <Text className="text-[16px] font-semibold text-white">Simpan {validCount || 0} catatan</Text>
                    </Pressable>
                </View>

            </View>
        </BottomSheetModal>
    );
}
