import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Download, Upload, FileSpreadsheet, FileJson, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

interface DataToolsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    replaceOnImport: boolean;
    onReplaceOnImportChange: (next: boolean) => void;
    onExportJson: () => void;
    onExportCsv: () => void;
    onImportFile: (rawText: string, fileName: string) => void;
    importMessage?: string | null;
}

export function DataToolsSheet({
    isOpen,
    onClose,
    replaceOnImport,
    onReplaceOnImportChange,
    onExportJson,
    onExportCsv,
    onImportFile,
    importMessage
}: DataToolsSheetProps) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['70%'], []);

    useEffect(() => {
        if (isOpen) {
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.dismiss();
        }
    }, [isOpen]);

    const handlePickDocument = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'text/csv', 'text/plain', '*/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const rawText = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'utf8' });
                onImportFile(rawText, asset.name);
            }
        } catch (err) {
            console.log('Document picker error:', err);
        }
    }, [onImportFile]);

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
                        <Text className="text-[20px] font-bold text-gray-900">Data &amp; tools</Text>
                        <Text className="mt-0.5 text-[12px] font-medium text-gray-400">
                            Backup dan pulihkan catatan di perangkat ini.
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => bottomSheetModalRef.current?.dismiss()}
                        className="rounded-full bg-gray-50 p-2 active:bg-gray-100"
                    >
                        <X size={20} color="#6b7280" strokeWidth={2.5} />
                    </Pressable>
                </View>

                <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }}>

                    <View className="rounded-2xl border border-gray-200 bg-white p-4">
                        <Text className="text-[13px] font-semibold text-gray-900">Export</Text>
                        <View className="mt-3 flex-row gap-2.5">
                            <Pressable
                                onPress={onExportJson}
                                className="flex-1 h-11 flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 active:bg-gray-100"
                            >
                                <FileJson size={16} color="#374151" />
                                <Text className="text-[13px] font-semibold text-gray-700">JSON</Text>
                            </Pressable>
                            <Pressable
                                onPress={onExportCsv}
                                className="flex-1 h-11 flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 active:bg-gray-100"
                            >
                                <FileSpreadsheet size={16} color="#374151" />
                                <Text className="text-[13px] font-semibold text-gray-700">CSV</Text>
                            </Pressable>
                        </View>
                    </View>

                    <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                        <Text className="text-[13px] font-semibold text-gray-900">Import</Text>
                        <Text className="mt-1 text-[12px] font-medium text-gray-500">
                            File yang didukung: JSON backup atau CSV export KeMana.
                        </Text>

                        <View className="mt-4 flex-row items-center gap-3">
                            <Switch
                                value={replaceOnImport}
                                onValueChange={onReplaceOnImportChange}
                                trackColor={{ false: '#e5e7eb', true: '#818cf8' }}
                                thumbColor={replaceOnImport ? '#4f46e5' : '#f9fafb'}
                                ios_backgroundColor="#e5e7eb"
                            />
                            <Text className="text-[12px] font-medium text-gray-600">
                                Ganti semua data saat import
                            </Text>
                        </View>

                        <Pressable
                            onPress={handlePickDocument}
                            className="mt-4 flex-row h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand active:bg-brand-pressed"
                        >
                            <Upload size={16} color="#ffffff" />
                            <Text className="text-[13px] font-semibold text-white">Pilih file import</Text>
                        </Pressable>
                    </View>

                    {importMessage && (
                        <View className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                            <Text className="text-[12px] font-medium text-gray-500">{importMessage}</Text>
                        </View>
                    )}

                    <View className="mt-4 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                        <Download size={16} color="#9ca3af" />
                        <Text className="text-[12px] font-medium text-gray-500 flex-1">
                            Simpan backup rutin sebelum ubah data besar.
                        </Text>
                    </View>

                </BottomSheetScrollView>
            </View>
        </BottomSheetModal>
    );
}
