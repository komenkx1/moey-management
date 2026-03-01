import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Dimensions, Keyboard } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Coffee, Utensils, Car, ShoppingBag, Receipt, MoreHorizontal, X, Users, CalendarDays } from 'lucide-react-native';

import {
    formatCurrencyInputDisplay,
    getSplitOtherPeopleInput,
    normalizeSplitPeopleWithLockedSelf,
    parseCurrencyInputToNumber,
    sanitizeCurrencyInput,
    toSplitPeopleInputWithLockedSelf
} from '@/lib/kemana-utils';
import { buildCustomSplit, buildEqualSplit } from '@kemana/core/split';
import type { EntrySplit } from '@kemana/core/types';
import { formatAmountIDR } from '@kemana/core/format';

type TxType = "expense";

export interface AddTransactionSubmitPayload {
    type: TxType;
    amount: number;
    unitAmount?: number;
    quantity?: number;
    category: string;
    title?: string;
    note: string;
    payment?: string;
    date: string;
    split?: EntrySplit;
    rawInput?: string;
}

interface AddTransactionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: AddTransactionSubmitPayload) => void;
    prefill?: Partial<AddTransactionSubmitPayload>;
}

const CATEGORIES = [
    { id: "Makan", icon: Utensils },
    { id: "Transport", icon: Car },
    { id: "Belanja", icon: ShoppingBag },
    { id: "Tagihan", icon: Receipt },
    { id: "Hiburan", icon: Coffee },
    { id: "Lainnya", icon: MoreHorizontal }
] as const;

const PAYMENTS = [
    { value: "Cash", label: "Tunai" },
    { value: "QRIS", label: "QRIS" },
    { value: "Debit", label: "Debit" },
    { value: "Transfer", label: "Transfer" }
] as const;

function getTodayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

function toParserAmountToken(amount: number): string {
    const normalizedAmount = Math.max(0, Math.round(amount));
    if (normalizedAmount >= 1_000 && normalizedAmount % 1_000 === 0) {
        return `${normalizedAmount / 1_000}k`;
    }
    return String(normalizedAmount);
}

export function AddTransactionSheet({ isOpen, onClose, onSave, prefill }: AddTransactionSheetProps) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['90%'], []);

    const [type, setType] = useState<TxType>("expense");
    const [amountStr, setAmountStr] = useState("");
    const [qtyStr, setQtyStr] = useState("1");
    const [category, setCategory] = useState("");
    const [title, setTitle] = useState("");
    const [note, setNote] = useState("");
    const [payment, setPayment] = useState("");
    const [date, setDate] = useState(getTodayISO());
    const [splitEnabled, setSplitEnabled] = useState(false);
    const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
    const [splitPeopleInput, setSplitPeopleInput] = useState("Kamu, Teman");
    const [splitOthersDraft, setSplitOthersDraft] = useState("Teman");
    const [splitCustomDraft, setSplitCustomDraft] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            bottomSheetModalRef.current?.present();

            setType(prefill?.type ?? "expense");
            setAmountStr(prefill?.amount ? String(Math.round(prefill.amount)) : "");
            setQtyStr(String(Math.max(1, Math.round(prefill?.quantity ?? 1))));
            setCategory(prefill?.category ?? "");
            setTitle(prefill?.title ?? prefill?.note ?? "");
            setNote(prefill?.note ?? "");
            setPayment(prefill?.payment ?? "");
            setDate(prefill?.date ?? getTodayISO());
            setSplitEnabled(Boolean(prefill?.split?.shares?.length));
            setSplitMode(prefill?.split?.mode ?? "equal");

            const initialSplitPeopleInput = toSplitPeopleInputWithLockedSelf(
                prefill?.split?.shares?.map((share) => share.person).join(", ") || "Kamu, Teman"
            );
            setSplitPeopleInput(initialSplitPeopleInput);
            setSplitOthersDraft(getSplitOtherPeopleInput(initialSplitPeopleInput));
            setSplitCustomDraft(
                prefill?.split?.shares?.reduce<Record<string, string>>((acc, share) => {
                    acc[share.person] = String(Math.round(share.amount));
                    return acc;
                }, {}) ?? {}
            );
        } else {
            bottomSheetModalRef.current?.dismiss();
            Keyboard.dismiss();
        }
    }, [isOpen, prefill]);

    const unitAmount = useMemo(() => parseCurrencyInputToNumber(amountStr), [amountStr]);
    const quantity = useMemo(() => Math.max(1, Number.parseInt(qtyStr.replace(/\D/g, ""), 10) || 1), [qtyStr]);
    const totalAmount = useMemo(() => unitAmount * quantity, [quantity, unitAmount]);
    const splitPeople = useMemo(() => normalizeSplitPeopleWithLockedSelf(splitPeopleInput), [splitPeopleInput]);
    const splitCustomShares = useMemo(
        () =>
            splitPeople.map((person) => ({
                person,
                amount: parseCurrencyInputToNumber(splitCustomDraft[person] ?? "")
            })),
        [splitCustomDraft, splitPeople]
    );
    const splitCustomTotal = useMemo(() => splitCustomShares.reduce((sum, share) => sum + share.amount, 0), [splitCustomShares]);
    const splitCustomDiff = splitCustomTotal - totalAmount;

    useEffect(() => {
        setSplitCustomDraft((prev) => {
            const next: Record<string, string> = {};
            for (const person of splitPeople) {
                next[person] = prev[person] ?? "";
            }

            const changed =
                Object.keys(next).length !== Object.keys(prev).length ||
                Object.entries(next).some(([person, amount]) => prev[person] !== amount);

            return changed ? next : prev;
        });
    }, [splitPeople]);

    const splitDraft = useMemo(() => {
        if (!splitEnabled || splitPeople.length < 2 || totalAmount <= 0) {
            return undefined;
        }

        if (splitMode === "custom") {
            const validated = buildCustomSplit(totalAmount, splitCustomShares);
            if (!validated) {
                return undefined;
            }
            return { mode: "custom", payer: "Kamu", shares: validated } satisfies EntrySplit;
        }

        return { mode: "equal", payer: "Kamu", shares: buildEqualSplit(totalAmount, splitPeople) } satisfies EntrySplit;
    }, [splitCustomShares, splitEnabled, splitMode, splitPeople, totalAmount]);

    const handleAmountChange = (text: string) => {
        const sanitized = sanitizeCurrencyInput(text);
        setAmountStr(sanitized);
    };

    const handleQtyChange = (text: string) => {
        const sanitized = text.replace(/\D/g, "");
        setQtyStr(sanitized.length ? sanitized : "1");
    };

    const handleSave = () => {
        if (!category || totalAmount <= 0) return;
        if (splitEnabled && splitPeople.length < 2) return;
        if (splitEnabled && splitMode === "custom" && splitCustomDiff !== 0) return;

        const normalizedTitle = title.trim();
        const normalizedNote = note.trim();
        const textTitle = normalizedTitle || category;
        const rawInputLabel = normalizedTitle || normalizedNote || category;
        const splitCount = splitEnabled ? splitPeople.length : 0;
        const splitToken = splitCount > 1 ? ` ${splitCount}p` : "";
        const rawInput = rawInputLabel.length > 0
            ? `${rawInputLabel} ${quantity > 1 ? `${quantity}x ` : ""}${toParserAmountToken(unitAmount)}${splitToken}`.trim()
            : undefined;

        onSave({
            type,
            amount: totalAmount,
            unitAmount,
            quantity,
            category,
            title: normalizedTitle || undefined,
            note: normalizedNote,
            payment: payment || undefined,
            date,
            split: splitDraft,
            rawInput
        });
        bottomSheetModalRef.current?.dismiss();
    };

    const isCustomSplitInvalid = splitEnabled && splitMode === "custom" && splitCustomDiff !== 0;

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
                        <Text className="text-[20px] font-bold text-gray-900">Catat pengeluaran</Text>
                        {prefill ? (
                            <Text className="mt-0.5 text-[12px] font-medium text-gray-400">Isi otomatis dari saran pintar</Text>
                        ) : null}
                    </View>
                    <Pressable
                        onPress={() => bottomSheetModalRef.current?.dismiss()}
                        className="rounded-full bg-gray-50 p-2 active:bg-gray-100"
                    >
                        <X size={20} color="#6b7280" strokeWidth={2.5} />
                    </Pressable>
                </View>

                <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
                    {/* AMOUNT INPUT */}
                    <View className="items-center px-5 pt-5 pb-3">
                        <Text className="text-[13px] font-semibold text-gray-500">
                            {quantity > 1 ? "Nominal per item" : "Jumlah"}
                        </Text>
                        <View className="mt-1 flex-row items-center justify-center gap-1">
                            <Text className="text-[24px] font-bold text-gray-900 mt-1">Rp</Text>
                            <TextInput
                                value={formatCurrencyInputDisplay(amountStr)}
                                onChangeText={handleAmountChange}
                                placeholder="0"
                                keyboardType="numeric"
                                placeholderTextColor="#d1d5db"
                                className="min-w-[120px] max-w-[220px] text-center text-[40px] font-bold text-gray-900 leading-none"
                            />
                        </View>
                        <View className="mt-3 flex-row items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                            <Text className="text-[11px] font-semibold text-gray-400">Qty</Text>
                            <TextInput
                                value={qtyStr}
                                onChangeText={handleQtyChange}
                                keyboardType="numeric"
                                className="w-11 text-center text-[13px] font-semibold text-gray-900 p-0 m-0"
                            />
                            <Text className="text-[11px] font-medium text-gray-400">item</Text>
                        </View>
                        {quantity > 1 && (
                            <Text className="mt-2 text-[12px] font-medium text-gray-500">
                                Total Rp{formatAmountIDR(totalAmount)} ({quantity} x Rp{formatAmountIDR(unitAmount)})
                            </Text>
                        )}
                    </View>

                    {/* CATEGORY GRID */}
                    <View className="px-5 mt-2 flex-row flex-wrap justify-between gap-y-4">
                        {CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const isSelected = category === cat.id;
                            return (
                                <Pressable
                                    key={cat.id}
                                    onPress={() => setCategory(cat.id)}
                                    className="w-[23%] items-center gap-1.5 mt-1"
                                >
                                    <View
                                        className={`h-[52px] w-[52px] items-center justify-center rounded-[16px] border ${isSelected
                                                ? "border-brand bg-brand shadow-sm"
                                                : "border-gray-200 bg-gray-50"
                                            }`}
                                    >
                                        <Icon size={24} color={isSelected ? "#ffffff" : "#6b7280"} strokeWidth={2.4} />
                                    </View>
                                    <Text
                                        className={`text-[11px] font-semibold text-center ${isSelected ? "text-gray-900" : "text-gray-400"
                                            }`}
                                    >
                                        {cat.id}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* TEXT INPUTS */}
                    <View className="mx-5 mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5">
                        <Text className="text-[12px] font-semibold text-gray-500">Nama catatan</Text>
                        <BottomSheetTextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Misal: makan siang"
                            placeholderTextColor="#9ca3af"
                            className="mt-2 text-[15px] font-semibold text-gray-900 p-0"
                        />
                        <View className="mt-3 border-t border-gray-200 mb-2" />
                        <Text className="text-[12px] font-semibold text-gray-500">Catatan</Text>
                        <BottomSheetTextInput
                            value={note}
                            onChangeText={setNote}
                            placeholder="Tulis detail singkat (opsional)"
                            placeholderTextColor="#9ca3af"
                            className="mt-2 text-[15px] font-medium text-gray-900 p-0"
                        />
                    </View>

                    {/* PAYMENT METHOD */}
                    <View className="mx-5 mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                        <Text className="text-[12px] font-semibold text-gray-500">Metode bayar</Text>
                        <View className="mt-2.5 flex-row flex-wrap gap-2">
                            {PAYMENTS.map((method) => (
                                <Pressable
                                    key={method.value}
                                    onPress={() => setPayment(method.value)}
                                    className={`rounded-full border px-4 py-2 ${payment === method.value
                                            ? "border-brand bg-brand/10"
                                            : "border-gray-200 bg-gray-50"
                                        }`}
                                >
                                    <Text className={`text-[12px] font-semibold ${payment === method.value ? "text-brand" : "text-gray-500"
                                        }`}>
                                        {method.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* DATE PICKER (Simplified to Text Input for native compatibility for now) */}
                    <View className="mx-5 mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                        <Text className="text-[12px] font-semibold text-gray-500">Tanggal (YYYY-MM-DD)</Text>
                        <View className="mt-2 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3 h-11">
                            <BottomSheetTextInput
                                value={date}
                                onChangeText={setDate}
                                className="flex-1 text-[15px] text-gray-900 p-0 m-0"
                                keyboardType="numbers-and-punctuation"
                            />
                            <CalendarDays size={18} color="#6b7280" />
                        </View>
                    </View>

                    {/* SPLIT */}
                    <View className="mx-5 mt-4 mb-4 rounded-2xl border border-gray-200 bg-white p-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                                <Users size={16} color="#6b7280" />
                                <Text className="text-[12px] font-semibold text-gray-500">Split transaksi</Text>
                            </View>
                            <Text className="text-[11px] font-medium text-gray-400">
                                {splitEnabled ? `${splitPeople.length} orang` : "Opsional"}
                            </Text>
                        </View>

                        <View className="mt-2 flex-row items-center gap-2">
                            <Pressable
                                onPress={() => setSplitEnabled(false)}
                                className={`h-9 items-center justify-center rounded-xl border px-3 ${!splitEnabled ? "border-brand bg-brand/10" : "border-gray-200 bg-gray-50"
                                    }`}
                            >
                                <Text className={`text-[12px] font-semibold ${!splitEnabled ? "text-brand" : "text-gray-500"}`}>Tanpa split</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => { setSplitEnabled(true); setSplitMode("equal"); }}
                                className={`h-9 items-center justify-center rounded-xl border px-3 ${splitEnabled && splitMode === "equal" ? "border-brand bg-brand/10" : "border-gray-200 bg-gray-50"
                                    }`}
                            >
                                <Text className={`text-[12px] font-semibold ${splitEnabled && splitMode === "equal" ? "text-brand" : "text-gray-500"}`}>Bagi rata</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => { setSplitEnabled(true); setSplitMode("custom"); }}
                                className={`h-9 items-center justify-center rounded-xl border px-3 ${splitEnabled && splitMode === "custom" ? "border-brand bg-brand/10" : "border-gray-200 bg-gray-50"
                                    }`}
                            >
                                <Text className={`text-[12px] font-semibold ${splitEnabled && splitMode === "custom" ? "text-brand" : "text-gray-500"}`}>Custom</Text>
                            </Pressable>
                        </View>

                        {splitEnabled && (
                            <View className="mt-3 flex-col gap-2">
                                <View className="flex-row items-center gap-2">
                                    <View className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1">
                                        <Text className="text-[11px] font-semibold text-gray-900">Kamu</Text>
                                    </View>
                                    <Text className="text-[11px] font-medium text-gray-400">Dikunci otomatis</Text>
                                </View>
                                <Text className="text-[11px] font-medium text-gray-400">Tambah orang pakai koma. Contoh: Budi, Cici, Deni.</Text>

                                <BottomSheetTextInput
                                    value={splitOthersDraft}
                                    onChangeText={(rawOthers) => {
                                        setSplitOthersDraft(rawOthers);
                                        setSplitPeopleInput(toSplitPeopleInputWithLockedSelf(rawOthers));
                                    }}
                                    onBlur={() => {
                                        setSplitOthersDraft(getSplitOtherPeopleInput(splitPeopleInput));
                                    }}
                                    placeholder="Contoh: Budi, Cici"
                                    className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-[14px] text-gray-900"
                                />

                                {splitMode === "custom" && (
                                    <View className="mt-2 flex-col gap-2">
                                        {splitPeople.map((person) => (
                                            <View key={person} className="flex-row items-center gap-2">
                                                <Text className="w-24 text-[12px] font-medium text-gray-500" numberOfLines={1}>{person}</Text>
                                                <BottomSheetTextInput
                                                    value={formatCurrencyInputDisplay(splitCustomDraft[person] ?? "")}
                                                    keyboardType="numeric"
                                                    onChangeText={(val) => setSplitCustomDraft(prev => ({ ...prev, [person]: sanitizeCurrencyInput(val) }))}
                                                    placeholder="0"
                                                    className="h-9 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-[13px] text-gray-900"
                                                />
                                            </View>
                                        ))}
                                        <Text className={`text-[12px] font-medium ${splitCustomDiff === 0 ? "text-green-600" : "text-amber-600"}`}>
                                            {splitCustomDiff === 0
                                                ? "Nominal split sudah pas."
                                                : splitCustomDiff < 0
                                                    ? `Masih kurang Rp${formatAmountIDR(Math.abs(splitCustomDiff))}`
                                                    : `Kelebihan Rp${formatAmountIDR(splitCustomDiff)}`}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                </BottomSheetScrollView>

                {/* BOTTOM FLOATING SAVE BUTTON */}
                <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 px-5 py-4 pb-8">
                    <Pressable
                        onPress={handleSave}
                        disabled={totalAmount === 0 || !category || (splitEnabled && splitPeople.length < 2) || isCustomSplitInvalid}
                        className={`w-full items-center justify-center rounded-2xl py-4 flex-row ${(totalAmount === 0 || !category || (splitEnabled && splitPeople.length < 2) || isCustomSplitInvalid)
                                ? "bg-brand/50"
                                : "bg-brand active:bg-brand-pressed"
                            }`}
                    >
                        <Text className="text-[16px] font-semibold text-white">Simpan catatan</Text>
                    </Pressable>
                </View>

            </View>
        </BottomSheetModal>
    );
}
