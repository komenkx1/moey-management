import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { formatAmountIDR } from '@kemana/core/format';
import { buildCustomSplit, buildEqualSplit } from '@kemana/core/split';
import { parseQuickAdd } from '@kemana/core/parser';
import { CATEGORIES, PAYMENT_METHODS } from '@kemana/core/types';
import {
    formatCurrencyInputDisplay,
    getSplitOtherPeopleInput,
    normalizeDateInput,
    normalizeSplitPeopleWithLockedSelf,
    parseCurrencyInputToNumber,
    sanitizeCurrencyInput,
    splitDisplayText,
    toSplitPeopleInputWithLockedSelf
} from '@/lib/kemana-utils';
import { Users, CalendarDays } from 'lucide-react-native';
import { type TransactionItem } from '../TransactionCard';
import {
    getDefaultParserInput,
    getInitialCustomDraft,
    getInitialPeopleText,
    normalizeInputText,
    warningFingerprint,
    buildSplitPeopleText
} from './helpers';

interface TransactionEditFormProps {
    item: TransactionItem;
    displayAmount: number;
    onSave: (updatedItem: TransactionItem) => void;
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
    inferCategory
}: TransactionEditFormProps) {
    const [draftTitle, setDraftTitle] = useState((item as any).title || item.text || '');
    const [draftAmount, setDraftAmount] = useState(String(item.amount));
    const [draftNote, setDraftNote] = useState((item as any).note || '');
    const [draftDate, setDraftDate] = useState(() => normalizeDateInput((item as any).time || item.createdAt) ?? new Date().toISOString().slice(0, 10));
    const [draftCategory, setDraftCategory] = useState(item.category);
    const [draftPaymentMethod, setDraftPaymentMethod] = useState(item.paymentMethod || '');
    const [splitEnabled, setSplitEnabled] = useState(Boolean(item.split?.shares?.length));
    const [splitMode, setSplitMode] = useState<'equal' | 'custom'>(item.split?.mode ?? 'equal');
    const [splitPeopleInput, setSplitPeopleInput] = useState(getInitialPeopleText(item));
    const [splitOthersDraft, setSplitOthersDraft] = useState(getSplitOtherPeopleInput(getInitialPeopleText(item)));
    const [splitCustomDraft, setSplitCustomDraft] = useState<Record<string, string>>(getInitialCustomDraft(item));
    const [draftRawInput, setDraftRawInput] = useState(item.rawInput || getDefaultParserInput(item));
    const [splitError, setSplitError] = useState<string | null>(null);
    const [formatFeedback, setFormatFeedback] = useState<string | null>(null);

    const parsedDraftAmount = useMemo(() => parseCurrencyInputToNumber(draftAmount), [draftAmount]);

    const splitPeople = useMemo(() => {
        return normalizeSplitPeopleWithLockedSelf(splitPeopleInput);
    }, [splitPeopleInput]);

    useEffect(() => {
        setSplitOthersDraft(getSplitOtherPeopleInput(splitPeopleInput));
    }, [splitPeopleInput]);

    const draftSplit = useMemo(() => {
        if (!splitEnabled || splitPeople.length < 1) return undefined;

        if (splitMode === 'equal') {
            return {
                mode: 'equal' as const,
                payer: item.split?.payer ?? 'Kamu',
                shares: buildEqualSplit(parsedDraftAmount, splitPeople)
            };
        }

        const customShares = splitPeople.map((person) => ({
            person,
            amount: parseCurrencyInputToNumber(splitCustomDraft[person] || '0')
        }));
        const validated = buildCustomSplit(parsedDraftAmount, customShares);
        if (!validated) return undefined;

        return {
            mode: 'custom' as const,
            payer: item.split?.payer ?? 'Kamu',
            shares: validated
        };
    }, [parsedDraftAmount, splitCustomDraft, splitEnabled, splitMode, splitPeople, item.split?.payer]);

    const customDiff = useMemo(() => {
        if (!splitEnabled || splitMode !== 'custom' || !draftSplit) return 0;
        const totalShares = draftSplit.shares.reduce((sum, share) => sum + share.amount, 0);
        return totalShares - parsedDraftAmount;
    }, [draftSplit, parsedDraftAmount, splitEnabled, splitMode]);

    const splitDirty = useMemo(() => {
        const currentMode = item.split?.mode ?? 'equal';
        if (splitEnabled !== Boolean(item.split?.shares?.length)) return true;
        if (splitEnabled && splitMode !== currentMode) return true;
        return false;
    }, [item.split, splitEnabled, splitMode]);

    const rawInputDirty = normalizeInputText(draftRawInput) !== normalizeInputText(item.rawInput || '');
    const normalizedRawInput = normalizeInputText(draftRawInput);
    const normalizedItemDate = normalizeDateInput((item as any).time || item.createdAt) ?? new Date().toISOString().slice(0, 10);

    const parserPreview = useMemo(() => {
        if (normalizedRawInput.length === 0) return null;
        return parseQuickAdd(normalizedRawInput, new Date(), 'inline_edit' as any);
    }, [normalizedRawInput]);

    const currentWarningsFingerprint = warningFingerprint(item.parseWarnings);
    const previewWarningsFingerprint = parserPreview?.ok ? warningFingerprint(parserPreview.warnings) : '';

    // Check if what the parser creates perfectly matches our current draft inputs
    const canApplyQuickFormat =
        parserPreview?.ok &&
        (normalizeInputText(parserPreview.value.text) !== normalizeInputText(`${draftTitle} ${draftNote}`) ||
            parserPreview.value.amount !== parsedDraftAmount ||
            previewWarningsFingerprint !== currentWarningsFingerprint);

    const isDirty =
        draftTitle.trim() !== ((item as any).title || item.text || '').trim() ||
        parsedDraftAmount !== item.amount ||
        draftNote !== ((item as any).note || '') ||
        draftDate !== normalizedItemDate ||
        draftCategory !== item.category ||
        draftPaymentMethod !== (item.paymentMethod || '') ||
        splitDirty ||
        rawInputDirty;

    const handleApplyQuickFormat = () => {
        if (!parserPreview || !parserPreview.ok) {
            setFormatFeedback('Format belum dikenali. Lanjut edit manual saja.');
            return;
        }
        if (!canApplyQuickFormat) {
            setFormatFeedback('Isi sudah sesuai.');
            return;
        }

        const parsed = parserPreview.value;
        const parsedDisplay = splitDisplayText(parsed.text);
        setDraftTitle(parsedDisplay.title || draftTitle);
        setDraftNote(parsedDisplay.subtitle ?? '');
        setDraftAmount(String(parsed.amount));
        setDraftRawInput(parsed.rawInput);

        if (parsed.splitCount && parsed.splitCount > 1) {
            const nextPeopleInput = buildSplitPeopleText(parsed.splitCount);
            setSplitEnabled(true);
            setSplitMode('equal');
            setSplitPeopleInput(nextPeopleInput);
            setSplitOthersDraft(getSplitOtherPeopleInput(nextPeopleInput));
        } else {
            const nextPeopleInput = 'Kamu, Teman';
            setSplitEnabled(false);
            setSplitMode('equal');
            setSplitPeopleInput(nextPeopleInput);
            setSplitOthersDraft(getSplitOtherPeopleInput(nextPeopleInput));
        }
        setSplitCustomDraft({});
        setSplitError(null);
        if (inferCategory) {
            setDraftCategory(inferCategory(parsed.text) as any);
        }
        setFormatFeedback('Sudah dipakai. Tekan Simpan kalau sudah pas.');
    };

    const handleSave = () => {
        if (parsedDraftAmount <= 0) {
            setSplitError('Nominal harus lebih dari 0.');
            return;
        }
        if (splitEnabled && splitPeople.length < 2) {
            setSplitError('Split butuh minimal 2 orang.');
            return;
        }
        if (splitEnabled && splitMode === 'custom' && customDiff !== 0) {
            setSplitError(
                customDiff < 0
                    ? `Nominal split kurang Rp${formatAmountIDR(Math.abs(customDiff))}`
                    : `Nominal split lebih Rp${formatAmountIDR(customDiff)}`
            );
            return;
        }

        let nextRawInput = item.rawInput;
        let nextWarnings = item.parseWarnings;
        if (rawInputDirty) {
            if (normalizedRawInput.length === 0) {
                nextRawInput = undefined;
                nextWarnings = undefined;
            } else if (parserPreview && parserPreview.ok) {
                nextRawInput = parserPreview.value.rawInput;
                nextWarnings = parserPreview.warnings;
            }
        }

        onSave({
            ...item,
            text: draftTitle.trim() || (item as any).title || item.text, // Ensure text is sent since it's an Entry
            amount: parsedDraftAmount,
            date: draftDate, // Add standard properties too
            category: draftCategory as any,
            paymentMethod: (draftPaymentMethod || undefined) as any,
            split: draftSplit,
            rawInput: nextRawInput,
            parseWarnings: nextWarnings
        });
    };

    return (
        <View className="border-t border-gray-100 bg-gray-50/50 p-4">
            <View className="flex flex-col gap-4">
                {/* Legacy Split Info - Replicating Web Exactly */}
                {item.split?.shares?.length ? (
                    <View className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5">
                        <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            Info Split ({item.split.shares.length} orang)
                        </Text>
                        <View className="mt-1.5 flex flex-col gap-1">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-[12px] font-medium text-gray-500">Kamu Bayar</Text>
                                <Text className="text-[12px] font-semibold text-gray-900">-Rp{formatAmountIDR(displayAmount)}</Text>
                            </View>
                            {/* Further mapping of split omitted for brevity outside core editing */}
                        </View>
                    </View>
                ) : null}

                {/* Edit Form */}
                <View className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <View className="flex-row items-center justify-between border-b border-blue-200/50 pb-2">
                        <Text className="text-[13px] font-semibold text-blue-600">Edit Catatan</Text>
                    </View>

                    <View className="flex-col gap-3">
                        {/* Quick Format Parser */}
                        <View className="flex-col gap-1.5">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Edit Format
                                </Text>
                                {parserPreview?.ok && canApplyQuickFormat && (
                                    <Text className="text-blue-600 font-medium text-[11px]">Rp{formatAmountIDR(parserPreview.value.amount)}</Text>
                                )}
                            </View>
                            <View className="flex-row gap-2 items-start">
                                <View className="flex-1 flex-col gap-1">
                                    <TextInput
                                        value={draftRawInput}
                                        onChangeText={setDraftRawInput}
                                        placeholder="Contoh: kopi 5x 50k atau mcd 3x 15k 3p"
                                        placeholderTextColor="#9ca3af"
                                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-[13px]"
                                    />
                                    {formatFeedback && (
                                        <Text className="text-[11px] font-medium text-blue-600">{formatFeedback}</Text>
                                    )}
                                </View>
                                {canApplyQuickFormat && parserPreview?.ok ? (
                                    <Pressable
                                        onPress={handleApplyQuickFormat}
                                        className="h-10 shrink-0 justify-center rounded-lg bg-blue-600 px-3 active:bg-blue-700"
                                    >
                                        <Text className="text-[12px] font-semibold text-white">Terapkan</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        </View>

                        {/* Title */}
                        <View className="flex flex-col gap-1.5">
                            <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Judul</Text>
                            <TextInput
                                value={draftTitle}
                                onChangeText={setDraftTitle}
                                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-[13px]"
                            />
                        </View>

                        {/* Amount */}
                        <View className="flex flex-col gap-1.5">
                            <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Jumlah (Rp)</Text>
                            <TextInput
                                keyboardType="numeric"
                                value={formatCurrencyInputDisplay(draftAmount)}
                                onChangeText={(text) => setDraftAmount(sanitizeCurrencyInput(text))}
                                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-[13px] font-medium"
                            />
                        </View>

                        <View className="flex flex-col gap-1.5 mt-1">
                            <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Kategori</Text>
                            <View className="flex-row flex-wrap gap-1.5">
                                {CATEGORIES.map((cat) => (
                                    <Pressable
                                        key={cat}
                                        onPress={() => setDraftCategory(cat)}
                                        className={`rounded-full border px-3 py-1.5 ${draftCategory === cat
                                            ? 'border-blue-600 bg-blue-100'
                                            : 'border-gray-200 bg-white active:bg-gray-100'
                                            }`}
                                    >
                                        <Text className={`text-[12px] font-medium ${draftCategory === cat ? 'text-blue-700' : 'text-gray-500'
                                            }`}>
                                            {cat}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Note */}
                        <View className="flex flex-col gap-1.5 mt-1">
                            <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Catatan</Text>
                            <TextInput
                                value={draftNote}
                                onChangeText={setDraftNote}
                                placeholder="Tambah detail..."
                                placeholderTextColor="#9ca3af"
                                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-[13px]"
                            />
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View className="flex-row items-center justify-between border-t border-gray-200 pt-3 mt-1">
                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={onCancel}
                            className="h-10 justify-center rounded-xl border border-gray-200 bg-white px-4 active:bg-gray-50"
                        >
                            <Text className="text-[13px] font-semibold text-gray-500">Batal</Text>
                        </Pressable>
                        {onDelete ? (
                            <Pressable
                                onPress={() => onDelete(item.id)}
                                className="h-10 justify-center rounded-xl border border-red-200 bg-white px-4 active:bg-red-50"
                            >
                                <Text className="text-[13px] font-semibold text-red-500">Hapus</Text>
                            </Pressable>
                        ) : null}
                    </View>

                    <Pressable
                        onPress={handleSave}
                        disabled={!isDirty || Boolean(splitError) || (splitEnabled && splitMode === 'custom' && customDiff !== 0)}
                        className={`h-10 justify-center rounded-xl px-4 ${!isDirty || Boolean(splitError) || (splitEnabled && splitMode === 'custom' && customDiff !== 0)
                            ? 'bg-gray-200'
                            : 'bg-blue-600 active:bg-blue-700'
                            }`}
                    >
                        <Text className={`text-[13px] font-semibold ${!isDirty || Boolean(splitError) || (splitEnabled && splitMode === 'custom' && customDiff !== 0)
                            ? 'text-gray-400'
                            : 'text-white'
                            }`}>
                            Simpan
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
