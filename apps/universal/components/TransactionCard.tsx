import { View, Text, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS
} from 'react-native-reanimated';
import { Trash2, Utensils, Car, ShoppingBag, Receipt, Coffee, MoreHorizontal } from 'lucide-react-native';
import type { Entry } from '@kemana/core/types';
import { formatAmountIDR } from '@kemana/core/format';
import TransactionEditForm from './transaction/TransactionEditForm';
import { useMemo } from 'react';

export type TransactionItem = Entry;

export interface TransactionCardProps {
    item: TransactionItem;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    inferCategory?: (value: string) => Entry['category'];
    onSave?: (entryId: string, updates: Partial<Entry>) => void;
    onDelete?: (id: string) => void;
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

export function TransactionCard({
    item: entry,
    isExpanded,
    onToggleExpand,
    inferCategory,
    onSave,
    onDelete,
    className = ''
}: TransactionCardProps) {
    const IconComponent = CategoryIcons[entry.category] || CategoryIcons['Lainnya'];

    // Calculate display amount (accounting for split)
    const displayAmount = useMemo(() => {
        if (!entry.split?.shares?.length) {
            return entry.split?.payer && entry.split.payer.toLowerCase() !== 'kamu' ? 0 : entry.amount;
        }
        const myShare = entry.split.shares.find((s) => s.person.toLowerCase() === 'kamu');
        if (myShare?.amount !== undefined) return myShare.amount;
        if (entry.split.payer.toLowerCase() === 'kamu') return entry.amount;
        return 0;
    }, [entry.amount, entry.split]);

    // Swipe to delete translation
    const translateX = useSharedValue(0);
    const deleteButtonOpacity = useSharedValue(0);
    const SWIPE_THRESHOLD = -80;

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .enabled(!isExpanded)
        .onUpdate((event) => {
            if (event.translationX < 0) {
                translateX.value = Math.max(event.translationX, SWIPE_THRESHOLD);
                deleteButtonOpacity.value = Math.min(Math.abs(event.translationX) / Math.abs(SWIPE_THRESHOLD), 1);
            }
        })
        .onEnd(() => {
            if (translateX.value < SWIPE_THRESHOLD / 2) {
                translateX.value = withSpring(SWIPE_THRESHOLD);
                deleteButtonOpacity.value = withSpring(1);
            } else {
                translateX.value = withSpring(0);
                deleteButtonOpacity.value = withSpring(0);
            }
        });

    const handleDelete = () => {
        translateX.value = withSpring(-300, {}, () => {
            if (onDelete) {
                runOnJS(onDelete)(entry.id);
            }
        });
    };

    const recoverSwipe = () => {
        translateX.value = withSpring(0);
        deleteButtonOpacity.value = withSpring(0);
    };

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    const deleteBackgroundStyle = useAnimatedStyle(() => ({
        opacity: deleteButtonOpacity.value
    }));

    const formatDateLabel = (date: string) => {
        if (!date) return '';
        try {
            const d = new Date(date);
            return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return date;
        }
    };

    return (
        <View className={`relative overflow-hidden rounded-2xl ${isExpanded ? 'my-1 border border-gray-200 shadow-md' : ''} ${className}`}>
            {/* Background Delete Button */}
            <Animated.View
                className="absolute right-0 top-0 bottom-0 w-24 bg-red-500 rounded-r-2xl justify-center items-end pr-6"
                style={deleteBackgroundStyle}
            >
                <Pressable onPress={handleDelete} className="p-2">
                    <Trash2 color="#ffffff" size={24} />
                </Pressable>
            </Animated.View>

            {/* Main Swipeable Card */}
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={cardStyle}
                    className="bg-white rounded-2xl"
                >
                    <Pressable
                        className="flex-row items-center p-4"
                        onPress={() => {
                            if (translateX.value < 0) {
                                recoverSwipe();
                            } else if (onToggleExpand) {
                                onToggleExpand();
                            }
                        }}
                    >
                        {/* Category Icon */}
                        <View className="bg-gray-100 w-12 h-12 rounded-full items-center justify-center mr-3">
                            <IconComponent color="#6B7280" size={20} />
                        </View>

                        {/* Title & Date */}
                        <View className="flex-1 justify-center min-w-0">
                            <Text className="text-gray-900 font-bold text-[15px]" numberOfLines={1}>
                                {entry.text}
                            </Text>
                            <Text className="text-gray-400 text-[12px] font-medium mt-0.5">
                                {formatDateLabel(entry.createdAt)}
                                {entry.paymentMethod ? ` • ${entry.paymentMethod}` : ''}
                            </Text>
                        </View>

                        {/* Amount & Split Badge */}
                        <View className="items-end pl-2 shrink-0">
                            <Text className="text-gray-900 font-bold text-[15px]">
                                -Rp{formatAmountIDR(displayAmount)}
                            </Text>
                            {entry.split && entry.split.shares && entry.split.shares.length > 0 ? (
                                <View className="bg-gray-100 px-2 py-0.5 rounded-full mt-1">
                                    <Text className="text-gray-600 text-[10px] font-semibold">
                                        Split {entry.split.shares.length}
                                    </Text>
                                </View>
                            ) : entry.source ? (
                                <Text className="text-gray-400 text-[12px] mt-0.5 font-medium max-w-[100px]" numberOfLines={1}>
                                    {entry.source}
                                </Text>
                            ) : null}
                        </View>
                    </Pressable>

                    {/* Expanded Edit Form */}
                    {isExpanded && onSave && (
                        <TransactionEditForm
                            item={entry as any} // Using Type Assertion to bypass web/app strict type definitions temporarily
                            displayAmount={displayAmount}
                            onSave={(updated) => onSave(updated.id, updated)}
                            onCancel={() => onToggleExpand?.()}
                            onDelete={(id) => onDelete?.(id)}
                            inferCategory={inferCategory}
                        />
                    )}
                </Animated.View>
            </GestureDetector>
        </View>
    );
}
