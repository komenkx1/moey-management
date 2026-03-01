import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { initDatabase } from '@kemana/storage';
import { useStorageInit } from '@/hooks/useStorageInit';
import { useStorageState } from '@/store/kemana/hooks-granular';
import '../global.css'; // NativeWind styles

export default function RootLayout() {
  const { isStorageReady } = useStorageState();

  useEffect(() => {
    // Initialize database structure on app start
    initDatabase();
  }, []);

  // Hydrate store from SQLite and auto-save changes
  useStorageInit();

  if (!isStorageReady) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
