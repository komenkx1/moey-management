import { memo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { NotebookPen } from 'lucide-react-native';
import { TransactionCard } from './TransactionCard';
import type { Entry } from '@kemana/core/types';
import { useExpandedIds } from '@/store/kemana/hooks-granular';

interface HomeRecentActivitySectionProps {
    entries: Entry[];
    onSaveEntry?: (entryId: string, updates: Partial<Entry>) => void;
    onDeleteEntry?: (id: string) => void;
    onViewAll?: () => void;
    inferCategoryFromText?: (text: string) => Entry['category'];
}

function HomeRecentActivitySection({
    entries,
    onSaveEntry,
    onDeleteEntry,
    onViewAll,
    inferCategoryFromText,
}: HomeRecentActivitySectionProps) {
    const { expandedIds, setExpandedIds } = useExpandedIds();

    const handleToggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, [setExpandedIds]);

    return (
        <View className="flex flex-col gap-3">
            <Text className="text-[16px] font-bold text-gray-900">Aktivitas terbaru</Text>

            <View className="flex flex-col gap-3">
                {entries.slice(0, 5).map((entry) => (
                    <TransactionCard
                        key={entry.id}
                        item={entry}
                        isExpanded={expandedIds.has(entry.id)}
                        onToggleExpand={() => handleToggleExpand(entry.id)}
                        inferCategory={inferCategoryFromText}
                        onSave={onSaveEntry}
                        onDelete={onDeleteEntry}
                    />
                ))}
            </View>

            {entries.length === 0 ? (
                <View className="flex flex-col items-center justify-center py-8">
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                        <NotebookPen color="#9CA3AF" size={32} />
                    </View>
                    <Text className="text-base font-bold text-gray-900 mb-1">
                        Belum ada catatan
                    </Text>
                    <Text className="text-sm text-gray-500">
                        Yuk mulai catat pengeluaranmu
                    </Text>
                </View>
            ) : entries.length > 5 ? (
                <View className="mt-2">
                    <Pressable
                        onPress={onViewAll}
                        className="h-11 w-full items-center justify-center rounded-xl bg-blue-600 active:opacity-80"
                    >
                        <Text className="text-[14px] font-semibold text-white">
                            Lihat semua catatan
                        </Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
    );
}

export default memo(HomeRecentActivitySection, (prev, next) => {
    const prevItems = prev.entries.slice(0, 5);
    const nextItems = next.entries.slice(0, 5);

    if (prevItems.length !== nextItems.length) return false;
    if (prev.entries.length !== next.entries.length) return false;

    for (let i = 0; i < prevItems.length; i++) {
        if (prevItems[i].id !== nextItems[i].id || prevItems[i].updatedAt !== nextItems[i].updatedAt) {
            return false;
        }
    }
    return true;
});
