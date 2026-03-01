import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock, Moon, ChevronRight } from 'lucide-react-native';

export type ContextBannerVariant = 'recall' | 'nightClose';

interface ContextBannerProps {
    variant: ContextBannerVariant;
    title: string;
    subtitle: string;
    actionLabel: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
    className?: string;
}

function ContextBanner({
    variant,
    title,
    subtitle,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
    className = '',
}: ContextBannerProps) {
    const isRecall = variant === 'recall';

    return (
        <View
            className={`flex-row w-full items-center gap-3 rounded-2xl p-4 ${isRecall ? 'bg-amber-50' : 'bg-blue-50'
                } ${className}`}
        >
            <View
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${isRecall ? 'shadow-amber-200' : 'shadow-blue-200'
                    }`}
            >
                {isRecall ? (
                    <Clock size={20} color="#d97706" />
                ) : (
                    <Moon size={20} color="#2563eb" />
                )}
            </View>

            <View className="flex-1 flex-col">
                <Text className="text-[13px] font-bold tracking-tight text-gray-900">
                    {title}
                </Text>
                <Text className="mt-0.5 text-[12px] leading-snug text-gray-600">
                    {subtitle}
                </Text>

                <View className="mt-2 flex-row items-center gap-2">
                    <Pressable
                        onPress={onAction}
                        disabled={!onAction}
                        className={`flex-row items-center gap-1 rounded-lg px-2 py-1 ${isRecall ? 'bg-amber-100 active:bg-amber-200' : 'bg-blue-100 active:bg-blue-200'
                            } ${!onAction ? 'opacity-50' : ''}`}
                    >
                        <Text className={`text-[12px] font-bold ${isRecall ? 'text-amber-700' : 'text-blue-700'}`}>
                            {actionLabel}
                        </Text>
                        <ChevronRight
                            size={14}
                            color={isRecall ? '#b45309' : '#1d4ed8'}
                        />
                    </Pressable>

                    {secondaryActionLabel && onSecondaryAction ? (
                        <Pressable
                            onPress={onSecondaryAction}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 active:bg-gray-50"
                        >
                            <Text className="text-[12px] font-semibold text-gray-500">
                                {secondaryActionLabel}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

export default memo(ContextBanner, (prev, next) => {
    return (
        prev.variant === next.variant &&
        prev.title === next.title &&
        prev.subtitle === next.subtitle &&
        prev.actionLabel === next.actionLabel &&
        prev.secondaryActionLabel === next.secondaryActionLabel &&
        prev.className === next.className
    );
});
