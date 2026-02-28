# Phase 2.5: React Native Web Migration Guide

## Tanggal: 28 Februari 2026

## Prinsip Utama: Write Once, Run Everywhere

### Core Philosophy
1. **Universal codebase** - Satu kode untuk Web, iOS, Android
2. **95%+ code sharing** - Business logic, state, API, UI components
3. **Platform-specific when needed** - Conditional code untuk fitur native
4. **NativeWind styling** - Tailwind syntax untuk semua platform
5. **Expo ecosystem** - Tooling modern, fast iteration

---

## 1. Why React Native Web?

### Current State (Next.js)
```
apps/web/               # Next.js PWA
├── Good: SSR, SEO, fast web
├── Bad: Web only, no native app
└── Problem: Need to rebuild for mobile

Future: Maintain 2 codebases (web + mobile)
```

### Target State (React Native Web)
```
apps/universal/         # Expo + React Native Web
├── Good: Web + iOS + Android from 1 codebase
├── Good: Native performance on mobile
├── Good: 95% code sharing
└── Trade-off: Slightly larger web bundle

Future: Maintain 1 codebase for 3 platforms
```

### Benefits
- ✅ Edit once, update 3 platforms
- ✅ Native mobile performance
- ✅ Push notifications (mobile)
- ✅ App Store + Play Store presence
- ✅ Better iOS support (no PWA limitations)
- ✅ Shared design system
- ✅ Faster feature development

### Trade-offs
- ⚠️ Web bundle ~400KB (vs 200KB Next.js)
- ⚠️ No SSR (SPA only, but fine for app)
- ⚠️ Learning curve (React Native APIs)
- ⚠️ Migration effort (4 weeks)

---

## 2. Architecture Overview

### Monorepo Structure
```
kemana/
├── apps/
│   ├── universal/              # NEW: Expo app (web + iOS + Android)
│   │   ├── app/               # Expo Router (file-based routing)
│   │   │   ├── (tabs)/       # Tab navigator
│   │   │   │   ├── index.tsx      # Home
│   │   │   │   ├── notes.tsx      # Notes
│   │   │   │   ├── insight.tsx    # Insight
│   │   │   │   └── account.tsx    # Account
│   │   │   ├── auth/          # Auth screens
│   │   │   └── _layout.tsx    # Root layout
│   │   ├── src/
│   │   │   ├── components/    # Universal UI components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── store/         # Zustand stores
│   │   │   └── lib/           # Utils
│   │   ├── assets/            # Images, fonts
│   │   ├── app.json           # Expo config
│   │   ├── package.json
│   │   └── tailwind.config.js # NativeWind config
│   │
│   └── web/                   # OLD: Keep for reference, delete after migration
│
├── packages/
│   ├── core/                  # ✅ Reuse 100%
│   │   ├── parser/
│   │   ├── split/
│   │   └── types/
│   │
│   ├── storage/               # ⚠️ Adapt for React Native
│   │   ├── db.ts             # Dexie → SQLite adapter
│   │   ├── index.ts          # Same interface
│   │   └── habits.ts         # Same logic
│   │
│   └── ui/                    # NEW: Shared UI primitives (optional)
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
```


### Code Sharing Breakdown
```
Layer                    Sharing    Notes
─────────────────────────────────────────────────────────
Business Logic           100%       packages/core (no changes)
State Management         100%       Zustand works in RN
API/Supabase            100%       Same client
Storage Interface        100%       Same API, different impl
Navigation              100%       Expo Router (file-based)
UI Components            95%       Rebuild with RN primitives
Styling                  95%       NativeWind (Tailwind syntax)
Gestures                 90%       RN Gesture Handler
Platform Features        50%       Conditional imports
─────────────────────────────────────────────────────────
Overall                  ~95%       Excellent code reuse
```

---

## 3. Technology Stack

### Core Framework
- **Expo SDK 51+** - React Native framework with batteries included
- **React Native Web** - Run RN components on web
- **Expo Router** - File-based routing (like Next.js App Router)

### Styling
- **NativeWind v4** - Tailwind CSS for React Native
- **React Native Reanimated** - Smooth animations
- **React Native Gesture Handler** - Native gestures

### Storage
- **Expo SQLite** - Local database (replaces Dexie)
- **AsyncStorage** - Key-value storage (replaces localStorage)

### Navigation
- **Expo Router** - File-based routing with deep linking

### Build & Deploy
- **EAS Build** - Cloud build service (iOS + Android)
- **Vercel** - Web deployment (same as current)

---

## 4. Migration Strategy

### Phase 1: Setup (Week 1)

#### 4.1 Create Expo Project
```bash
# Create new Expo app with tabs template
npx create-expo-app@latest apps/universal --template tabs

cd apps/universal

# Install dependencies
npx expo install expo-router
npx expo install react-native-safe-area-context
npx expo install react-native-screens
npx expo install expo-splash-screen
npx expo install expo-status-bar
```

#### 4.2 Install NativeWind
```bash
# Install NativeWind v4
npm install nativewind
npm install --save-dev tailwindcss

# Initialize Tailwind
npx tailwindcss init
```

#### 4.3 Configure NativeWind
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#your-brand-color',
        background: '#ffffff',
        foreground: '#000000',
        // Copy colors from current Tailwind config
      }
    }
  },
  plugins: []
}
```

```javascript
// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }]
    ],
    plugins: [
      'nativewind/babel',
      'react-native-reanimated/plugin'
    ]
  };
};
```

#### 4.4 Setup Monorepo Links
```json
// apps/universal/package.json
{
  "dependencies": {
    "@kemana/core": "workspace:*",
    "@kemana/storage": "workspace:*"
  }
}
```

#### 4.5 Install Additional Dependencies
```bash
# Gestures & Animations
npx expo install react-native-gesture-handler
npx expo install react-native-reanimated

# Storage
npx expo install expo-sqlite
npx expo install @react-native-async-storage/async-storage

# Supabase
npm install @supabase/supabase-js

# State Management
npm install zustand

# Date utilities
npm install date-fns

# Icons (optional)
npx expo install @expo/vector-icons
```


### Phase 2: Storage Adapter (Week 1)

#### 4.6 Create SQLite Adapter

```typescript
// packages/storage/db.native.ts
import * as SQLite from 'expo-sqlite';
import type { Entry, CategoryRules } from '@kemana/core/types';

const db = SQLite.openDatabaseSync('kemana.db');

// Initialize tables
export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      amount INTEGER NOT NULL,
      raw_input TEXT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT NOT NULL,
      payment_method TEXT,
      parse_warnings TEXT,
      split TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date DESC);
    CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at DESC);
    
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL,
      match TEXT NOT NULL,
      category TEXT NOT NULL,
      UNIQUE(pattern, match)
    );
    
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// Entries operations
export async function loadEntries(): Promise<Entry[]> {
  const result = db.getAllSync<Entry>('SELECT * FROM entries ORDER BY created_at DESC');
  return result.map(row => ({
    ...row,
    parseWarnings: row.parse_warnings ? JSON.parse(row.parse_warnings) : undefined,
    split: row.split ? JSON.parse(row.split) : undefined
  }));
}

export async function saveEntries(entries: Entry[]): Promise<void> {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM entries');
    
    const stmt = db.prepareSync(`
      INSERT INTO entries (
        id, text, amount, raw_input, date, category, source,
        payment_method, parse_warnings, split, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const entry of entries) {
      stmt.executeSync([
        entry.id,
        entry.text,
        entry.amount,
        entry.rawInput || null,
        entry.date,
        entry.category,
        entry.source,
        entry.paymentMethod || null,
        entry.parseWarnings ? JSON.stringify(entry.parseWarnings) : null,
        entry.split ? JSON.stringify(entry.split) : null,
        entry.createdAt,
        entry.updatedAt
      ]);
    }
    
    stmt.finalizeSync();
  });
}

// Rules operations
export async function loadRules(): Promise<CategoryRules> {
  const result = db.getAllSync<CategoryRules[number]>('SELECT * FROM rules');
  return result;
}

export async function saveRules(rules: CategoryRules): Promise<void> {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM rules');
    
    const stmt = db.prepareSync(`
      INSERT INTO rules (pattern, match, category) VALUES (?, ?, ?)
    `);
    
    for (const rule of rules) {
      stmt.executeSync([rule.pattern, rule.match, rule.category]);
    }
    
    stmt.finalizeSync();
  });
}

// Export same interface as Dexie version
export { initDatabase as db };
```

#### 4.7 Platform-Specific Exports

```typescript
// packages/storage/index.ts
export * from './habits';
export * from './day-key';

// Platform-specific db import
export { db, loadEntries, saveEntries, loadRules, saveRules } from './db';
```

```typescript
// packages/storage/db.ts (web version - keep existing Dexie)
// No changes needed

// packages/storage/db.native.ts (mobile version - new SQLite)
// Created above
```


### Phase 3: UI Components Migration (Week 2-3)

#### 4.8 Component Conversion Guide

```typescript
// BEFORE (Next.js + Tailwind)
import Link from 'next/link';

export function TransactionCard({ entry, onEdit, onDelete }) {
  return (
    <div className="flex flex-col p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">{entry.text}</h3>
        <span className="text-sm text-gray-500">{entry.date}</span>
      </div>
      
      <div className="flex gap-2 mt-2">
        <button 
          onClick={onEdit}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Edit
        </button>
        <button 
          onClick={onDelete}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// AFTER (React Native Web + NativeWind)
import { View, Text, Pressable } from 'react-native';

export function TransactionCard({ entry, onEdit, onDelete }) {
  return (
    <View className="flex flex-col p-4 bg-white rounded-lg shadow-md">
      <View className="flex flex-row justify-between items-center">
        <Text className="text-lg font-bold">{entry.text}</Text>
        <Text className="text-sm text-gray-500">{entry.date}</Text>
      </View>
      
      <View className="flex flex-row gap-2 mt-2">
        <Pressable 
          onPress={onEdit}
          className="px-4 py-2 bg-blue-500 rounded"
        >
          <Text className="text-white">Edit</Text>
        </Pressable>
        <Pressable 
          onPress={onDelete}
          className="px-4 py-2 bg-red-500 rounded"
        >
          <Text className="text-white">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

#### 4.9 Conversion Cheat Sheet

| Next.js/HTML | React Native | Notes |
|--------------|--------------|-------|
| `<div>` | `<View>` | Container |
| `<span>`, `<p>`, `<h1>` | `<Text>` | All text |
| `<button>` | `<Pressable>` | Touchable |
| `<input>` | `<TextInput>` | Text input |
| `<img>` | `<Image>` | Images |
| `<a>` / `<Link>` | `<Link>` (expo-router) | Navigation |
| `onClick` | `onPress` | Event handler |
| `onChange` | `onChangeText` | Input change |
| `className` | `className` | Same! (NativeWind) |

#### 4.10 Input Components

```typescript
// Input.tsx
import { TextInput, View, Text } from 'react-native';
import { forwardRef } from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  secureTextEntry?: boolean;
  className?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <View className="flex flex-col gap-1">
        {label && (
          <Text className="text-sm font-medium text-gray-700">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          className={`
            px-4 py-3 border border-gray-300 rounded-lg
            bg-white text-base
            ${className}
          `}
          placeholderTextColor="#9CA3AF"
          {...props}
        />
      </View>
    );
  }
);
```

#### 4.11 Button Component

```typescript
// Button.tsx
import { Pressable, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  disabled,
  loading,
  className
}: ButtonProps) {
  const variantStyles = {
    primary: 'bg-brand',
    secondary: 'bg-gray-200',
    danger: 'bg-red-500'
  };
  
  const textStyles = {
    primary: 'text-white',
    secondary: 'text-gray-900',
    danger: 'text-white'
  };
  
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`
        px-4 py-3 rounded-lg items-center justify-center
        ${variantStyles[variant]}
        ${disabled ? 'opacity-50' : ''}
        ${className}
      `}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#000' : '#fff'} />
      ) : (
        <Text className={`font-semibold ${textStyles[variant]}`}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}
```


### Phase 4: Navigation & Routing (Week 3)

#### 4.12 Expo Router Setup

```typescript
// app/_layout.tsx (Root layout)
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDatabase } from '@kemana/storage';
import '../global.css'; // NativeWind styles

export default function RootLayout() {
  useEffect(() => {
    // Initialize database on app start
    initDatabase();
  }, []);
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
    </Stack>
  );
}
```

```typescript
// app/(tabs)/_layout.tsx (Tab navigator)
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Home, FileText, BarChart3, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#your-brand-color',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Catatan',
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="insight"
        options={{
          title: 'Insight',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}
```

#### 4.13 Screen Examples

```typescript
// app/(tabs)/index.tsx (Home screen)
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QuickAddComposer } from '@/components/QuickAddComposer';
import { RecentActivity } from '@/components/RecentActivity';
import { DailySummary } from '@/components/DailySummary';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-2xl font-bold mb-4">KeMana</Text>
          
          <QuickAddComposer />
          
          <DailySummary className="mt-4" />
          
          <RecentActivity className="mt-4" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

```typescript
// app/(tabs)/notes.tsx (Notes screen)
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEntriesStore } from '@/store/entries';
import { TransactionCard } from '@/components/TransactionCard';
import { DateFilter } from '@/components/DateFilter';

export default function NotesScreen() {
  const entries = useEntriesStore(state => state.entries);
  const filter = useEntriesStore(state => state.filter);
  
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <DateFilter />
        
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TransactionCard entry={item} />
          )}
          contentContainerClassName="p-4"
        />
      </View>
    </SafeAreaView>
  );
}
```

#### 4.14 Navigation Helpers

```typescript
// src/lib/navigation.ts
import { useRouter, useSegments } from 'expo-router';

export function useAppNavigation() {
  const router = useRouter();
  const segments = useSegments();
  
  return {
    // Navigate to screen
    goToHome: () => router.push('/'),
    goToNotes: () => router.push('/notes'),
    goToInsight: () => router.push('/insight'),
    goToAccount: () => router.push('/account'),
    
    // Auth navigation
    goToLogin: () => router.push('/auth/login'),
    goToCallback: () => router.push('/auth/callback'),
    
    // Current route
    currentRoute: segments[segments.length - 1] || 'index'
  };
}
```


### Phase 5: Gestures & Animations (Week 3)

#### 4.15 Swipe to Delete (React Native Version)

```typescript
// src/components/SwipeableTransactionCard.tsx
import { View, Text, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';

interface SwipeableTransactionCardProps {
  entry: Entry;
  onDelete: () => void;
  children: React.ReactNode;
}

export function SwipeableTransactionCard({
  entry,
  onDelete,
  children
}: SwipeableTransactionCardProps) {
  const translateX = useSharedValue(0);
  const deleteButtonOpacity = useSharedValue(0);
  
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow left swipe (negative translation)
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -80);
        deleteButtonOpacity.value = Math.min(Math.abs(event.translationX) / 80, 1);
      }
    })
    .onEnd(() => {
      // Snap to revealed or closed
      if (translateX.value < -40) {
        translateX.value = withSpring(-80);
        deleteButtonOpacity.value = withSpring(1);
      } else {
        translateX.value = withSpring(0);
        deleteButtonOpacity.value = withSpring(0);
      }
    });
  
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));
  
  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: deleteButtonOpacity.value
  }));
  
  const handleDelete = () => {
    // Animate out then delete
    translateX.value = withSpring(-300, {}, () => {
      runOnJS(onDelete)();
    });
  };
  
  return (
    <View className="relative">
      {/* Delete button background */}
      <Animated.View 
        style={deleteButtonStyle}
        className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 items-center justify-center rounded-r-lg"
      >
        <Pressable onPress={handleDelete} className="items-center justify-center">
          <Trash2 color="white" size={24} />
        </Pressable>
      </Animated.View>
      
      {/* Card content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
```

#### 4.16 Bottom Sheet (React Native Version)

```typescript
// src/components/BottomSheet.tsx
import { View, Pressable, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  
  useEffect(() => {
    if (isOpen) {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300
      });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT);
    }
  }, [isOpen]);
  
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        translateY.value = withSpring(SCREEN_HEIGHT, {}, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0);
      }
    });
  
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));
  
  if (!isOpen) return null;
  
  return (
    <View className="absolute inset-0">
      {/* Backdrop */}
      <Pressable 
        onPress={onClose}
        className="absolute inset-0 bg-black/50"
      />
      
      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View 
          style={[sheetStyle, { paddingBottom: insets.bottom }]}
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
        >
          {/* Drag handle */}
          <View className="items-center py-3">
            <View className="w-12 h-1 bg-gray-300 rounded-full" />
          </View>
          
          {/* Content */}
          <View className="px-4 pb-4">
            {children}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
```


### Phase 6: Platform-Specific Features (Week 4)

#### 4.17 Platform Detection

```typescript
// src/lib/platform.ts
import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isMobile = isIOS || isAndroid;

// Conditional imports
export async function getPlatformFeatures() {
  if (isMobile) {
    // Import mobile-only features
    const Notifications = await import('expo-notifications');
    const Haptics = await import('expo-haptics');
    return { Notifications, Haptics };
  }
  
  return { Notifications: null, Haptics: null };
}
```

#### 4.18 Push Notifications (Mobile Only)

```typescript
// src/lib/notifications.ts
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export async function setupNotifications() {
  if (Platform.OS === 'web') {
    console.log('Notifications not supported on web');
    return;
  }
  
  // Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Notification permission denied');
    return;
  }
  
  // Configure notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true
    })
  });
  
  // Get push token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id'
  });
  
  return token.data;
}

export async function scheduleNightCloseReminder() {
  if (Platform.OS === 'web') return;
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tutup hari',
      body: 'Sudah catat semua pengeluaran hari ini?',
      data: { type: 'night_close' }
    },
    trigger: {
      hour: 20,
      minute: 0,
      repeats: true
    }
  });
}
```

#### 4.19 Haptic Feedback (Mobile Only)

```typescript
// src/lib/haptics.ts
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
  if (Platform.OS === 'web') return;
  
  switch (type) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
  }
}

// Usage in components
export function useHapticFeedback() {
  const onSuccess = () => triggerHaptic('success');
  const onError = () => triggerHaptic('error');
  const onPress = () => triggerHaptic('light');
  
  return { onSuccess, onError, onPress };
}
```

#### 4.20 Safe Area Handling

```typescript
// All screens should use SafeAreaView
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Screen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Content */}
    </SafeAreaView>
  );
}

// For iOS notch/island
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Component() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Content */}
    </View>
  );
}
```

#### 4.21 Keyboard Handling

```typescript
// src/components/KeyboardAvoidingView.tsx
import { KeyboardAvoidingView as RNKeyboardAvoidingView, Platform } from 'react-native';

export function KeyboardAvoidingView({ children }) {
  return (
    <RNKeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      {children}
    </RNKeyboardAvoidingView>
  );
}
```


---

## 5. Deployment Strategy (Parallel + Gradual Migration)

### 5.1 Overview

**Strategy:** Keep Next.js PWA running while building and testing RN Web, then gradually switch.

```
Current State:
kemana.app → Next.js PWA (Vercel)

During Migration (Week 1-6):
kemana.app → Next.js PWA (keep running)
beta.kemana.app → React Native Web (new, testing)

After Migration (Week 7+):
kemana.app → React Native Web (replace)
```

### 5.2 Timeline & Phases

#### Phase 1: Build (Week 1-4)
```
Status: Next.js PWA tetap live di kemana.app
Action: Build React Native Web di local/staging
Users: No impact, continue using Next.js PWA
```

#### Phase 2: Beta Deployment (Week 5)
```
Status: Deploy RN Web to beta.kemana.app
Action: 
  1. Create new Vercel project: kemana-universal
  2. Deploy to beta.kemana.app subdomain
  3. Internal testing
  4. Fix critical bugs
Users: Can optionally try beta version
```

#### Phase 3: Beta Testing (Week 6)
```
Status: Both versions running
Action:
  1. Add banner on kemana.app:
     "🎉 Try our new native app: beta.kemana.app"
  2. Collect user feedback
  3. Monitor metrics (performance, errors)
  4. Fix issues
Users: Can choose to test beta or stay on stable
```

#### Phase 4: Soft Launch (Week 7)
```
Status: Prepare for switch
Action:
  1. Show modal on kemana.app about upgrade
  2. Communicate changes to users
  3. Final testing
  4. Prepare rollback plan
Users: Notified about upcoming change
```

#### Phase 5: Full Switch (Week 8)
```
Status: Switch kemana.app to RN Web
Action:
  1. Reassign kemana.app domain to kemana-universal project
  2. Redirect beta.kemana.app → kemana.app
  3. Keep Next.js project as backup (don't delete)
  4. Monitor closely for 48 hours
Users: Automatically use new version
```

#### Phase 6: Stabilization (Week 9-10)
```
Status: Monitor and optimize
Action:
  1. Fix any reported issues
  2. Optimize performance
  3. Collect user feedback
  4. Keep Next.js backup active
Users: Using new version, can report issues
```

#### Phase 7: Cleanup (Week 11+)
```
Status: Deprecate old version
Action:
  1. If stable (error rate < 1%, no critical bugs)
  2. Delete Next.js Vercel project
  3. Remove beta subdomain
Users: Fully migrated to RN Web
```

### 5.3 Vercel Configuration

#### Current Project (Keep Running)
```json
// apps/web/vercel.json (Next.js)
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}

Project name: kemana-web
Domain: kemana.app
Status: Keep active until Week 11
```

#### New Project (React Native Web)
```json
// apps/universal/vercel.json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}

Project name: kemana-universal
Domains:
  - Week 5-7: beta.kemana.app
  - Week 8+: kemana.app
```

### 5.4 Domain Setup Steps

#### Week 5: Setup Beta Subdomain
```bash
# 1. Add DNS record (your domain provider)
Type: CNAME
Name: beta
Value: cname.vercel-dns.com
TTL: 3600

# 2. In Vercel dashboard (kemana-universal project)
Settings → Domains → Add Domain
Enter: beta.kemana.app
Verify and assign
```

#### Week 8: Switch Main Domain
```bash
# In Vercel dashboard:

# 1. Remove kemana.app from kemana-web project
Project: kemana-web
Settings → Domains → kemana.app → Remove

# 2. Add kemana.app to kemana-universal project
Project: kemana-universal
Settings → Domains → Add Domain
Enter: kemana.app
Verify and assign

# 3. Redirect beta subdomain
Project: kemana-universal
Settings → Domains → beta.kemana.app
Redirect to: kemana.app (301 permanent)
```

### 5.5 User Communication

#### Week 5-6: Beta Banner (Optional)
```typescript
// Show on kemana.app (Next.js)
<div className="bg-blue-50 border-b border-blue-200 p-3">
  <div className="max-w-4xl mx-auto flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-2xl">🎉</span>
      <div>
        <p className="font-semibold text-blue-900">
          Try our new native app!
        </p>
        <p className="text-sm text-blue-700">
          Faster, smoother, better experience
        </p>
      </div>
    </div>
    <div className="flex gap-2">
      <a 
        href="https://beta.kemana.app"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Try Beta
      </a>
      <button className="px-4 py-2 text-blue-600">
        Dismiss
      </button>
    </div>
  </div>
</div>
```

#### Week 7: Upgrade Modal
```typescript
// Show on kemana.app (Next.js) before switch
<Modal>
  <div className="p-6 max-w-md">
    <h2 className="text-2xl font-bold mb-4">
      We've upgraded KeMana! 🚀
    </h2>
    
    <div className="space-y-2 mb-6">
      <p className="text-gray-700">New features:</p>
      <ul className="space-y-1 text-gray-600">
        <li>✓ Native iOS & Android apps</li>
        <li>✓ Smoother gestures & animations</li>
        <li>✓ Better performance</li>
        <li>✓ Push notifications (coming soon)</li>
      </ul>
    </div>
    
    <p className="text-sm text-gray-500 mb-6">
      Your data is safe and will migrate automatically.
      No action needed from you.
    </p>
    
    <button className="w-full py-3 bg-brand text-white rounded-lg">
      Continue to New Version
    </button>
  </div>
</Modal>
```

### 5.6 Data Migration (Automatic)

**Good news:** No manual data migration needed!

```typescript
// User data stays in browser/device
// Same storage interface, automatic migration

Next.js PWA (Old):
- IndexedDB via Dexie
- localStorage for settings

React Native Web (New):
- Web: IndexedDB via SQLite adapter (same structure)
- Mobile: SQLite native

Migration: Seamless!
- Same database schema
- Same data structure
- User opens app → data already there
```

### 5.7 Rollback Plan

#### Quick Rollback (< 5 minutes)

**If critical issues found after switch:**

```bash
# In Vercel dashboard:

# 1. Remove kemana.app from kemana-universal
Project: kemana-universal
Settings → Domains → kemana.app → Remove

# 2. Re-add kemana.app to kemana-web
Project: kemana-web
Settings → Domains → Add Domain
Enter: kemana.app

# Done! Users see old Next.js version
# No data loss (data is local)
```

#### Rollback Triggers

Rollback if:
- Error rate > 5%
- Critical bug affecting core features
- Performance degradation > 50%
- User complaints > 10% of active users

### 5.8 Monitoring & Metrics

#### Track During Migration

**Next.js (Old - kemana.app):**
```
- Daily active users
- Page load time (target: < 1s)
- Error rate (target: < 1%)
- Bounce rate
```

**RN Web (New - beta.kemana.app):**
```
- Daily active users
- App load time (target: < 2s)
- Error rate (target: < 1%)
- Gesture performance (60fps)
- User feedback/ratings
```

#### Success Criteria (Before Full Switch)

- [ ] Error rate < 1%
- [ ] Load time < 2s (p95)
- [ ] No critical bugs
- [ ] Positive user feedback (if beta tested)
- [ ] All core features working
- [ ] Gestures smooth (60fps)

### 5.9 Cost Implications

**Vercel Costs:**
```
Current (1 project):
- Free tier: OK
- Pro tier: $20/month

During Migration (2 projects, Week 5-10):
- Free tier: OK (both fit in free tier)
- Pro tier: $20/month (no extra cost)

After Migration (1 project):
- Free tier: OK
- Pro tier: $20/month

Total extra cost: $0 ✅
```

---

## 6. Build & Deployment Commands

### 6.1 Development

```bash
# Start development server
npx expo start

# Run on specific platform
npx expo start --web        # Web browser
npx expo start --ios        # iOS simulator
npx expo start --android    # Android emulator

# Clear cache if needed
npx expo start --clear
```

### 6.1 Development

```bash
# Start development server
npx expo start

# Run on specific platform
npx expo start --web        # Web browser
npx expo start --ios        # iOS simulator
npx expo start --android    # Android emulator

# Clear cache if needed
npx expo start --clear
```

### 6.2 Web Deployment (Vercel)

#### Beta Deployment (Week 5)
```bash
# Export web build
npx expo export --platform web

# Deploy to Vercel (beta subdomain)
vercel --prod

# Or use Vercel GitHub integration (recommended)
# Push to main branch → auto deploy to beta.kemana.app
```

#### Production Deployment (Week 8)
```bash
# Same process, just reassign domain in Vercel dashboard
# No code changes needed
```

### 6.3 EAS Build Setup

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure
```

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-asc-app-id",
        "appleTeamId": "your-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### 6.4 Build Commands

```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Build for both
eas build --platform all --profile production

# Submit to stores (Week 8+)
eas submit --platform ios
eas submit --platform android
```

### 6.5 App Store Assets

#### iOS (App Store Connect)
- App Icon: 1024x1024px
- Screenshots:
  - iPhone 6.7": 1290x2796px (3 required)
  - iPhone 6.5": 1284x2778px
  - iPad Pro 12.9": 2048x2732px
- Privacy Policy URL
- Support URL

#### Android (Google Play Console)
- App Icon: 512x512px
- Feature Graphic: 1024x500px
- Screenshots:
  - Phone: 1080x1920px (2-8 required)
  - Tablet: 1920x1080px (optional)
- Privacy Policy URL

---

## 6. Testing Strategy

### 6.1 Unit Tests (Reuse from Next.js)

```bash
# packages/core tests work as-is
npm test

# Run tests in watch mode
npm test -- --watch
```

### 6.2 Component Tests

```typescript
// src/components/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <Button onPress={() => {}}>Click me</Button>
    );
    expect(getByText('Click me')).toBeTruthy();
  });
  
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button onPress={onPress}>Click me</Button>
    );
    
    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### 6.3 E2E Tests (Detox)

```bash
# Install Detox
npm install --save-dev detox

# Initialize Detox
npx detox init
```

```typescript
// e2e/quickAdd.test.ts
describe('Quick Add Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });
  
  it('should add entry via quick add', async () => {
    await element(by.id('quick-add-input')).typeText('kopi 15k');
    await element(by.id('quick-add-submit')).tap();
    
    await expect(element(by.text('kopi'))).toBeVisible();
    await expect(element(by.text('15.000'))).toBeVisible();
  });
});
```

### 6.4 Manual Testing Checklist

**Web:**
- [ ] Quick Add works
- [ ] Navigation works
- [ ] Gestures work (swipe, drag)
- [ ] Responsive layout
- [ ] PWA install prompt

**iOS:**
- [ ] Quick Add works
- [ ] Navigation works
- [ ] Gestures feel native
- [ ] Safe area respected (notch/island)
- [ ] Keyboard handling
- [ ] Push notifications
- [ ] Haptic feedback

**Android:**
- [ ] Quick Add works
- [ ] Navigation works
- [ ] Gestures feel native
- [ ] Back button handling
- [ ] Keyboard handling
- [ ] Push notifications
- [ ] Haptic feedback

---

## 7. Performance Optimization

### 7.1 List Virtualization

```typescript
// Use FlatList for long lists
import { FlatList } from 'react-native';

<FlatList
  data={entries}
  keyExtractor={item => item.id}
  renderItem={({ item }) => <TransactionCard entry={item} />}
  initialNumToRender={20}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
/>
```

### 7.2 Image Optimization

```typescript
// Use optimized image loading
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

### 7.3 Bundle Size Optimization

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable tree shaking
config.transformer.minifierConfig = {
  compress: {
    drop_console: true, // Remove console.log in production
  },
};

module.exports = config;
```

### 7.4 Lazy Loading

```typescript
// Lazy load heavy components
import { lazy, Suspense } from 'react';
import { ActivityIndicator } from 'react-native';

const InsightChart = lazy(() => import('./InsightChart'));

export function InsightTab() {
  return (
    <Suspense fallback={<ActivityIndicator />}>
      <InsightChart />
    </Suspense>
  );
}
```


---

## 8. Migration Checklist (Updated with Deployment)

### Week 1: Setup & Foundation
- [ ] Create Expo project with tabs template
- [ ] Install NativeWind and configure
- [ ] Install dependencies (gestures, animations, storage)
- [ ] Setup monorepo links to packages/core
- [ ] Create SQLite adapter for storage
- [ ] Test basic navigation works on all platforms
- [ ] Setup EAS Build account
- [ ] **Create new Vercel project: kemana-universal**

### Week 2: Core Screens
- [ ] Port Home screen (Quick Add + Recent Activity)
- [ ] Port Notes screen (Transaction List)
- [ ] Port Insight screen (Charts + Stats)
- [ ] Port Account screen (Profile placeholder)
- [ ] Test all screens on web, iOS, Android
- [ ] Verify business logic works (parser, split, etc)

### Week 3: Components & Gestures
- [ ] Port TransactionCard with swipe-to-delete
- [ ] Port Bottom sheets (Add, Bulk, Data Tools)
- [ ] Port Forms (Quick Add, Edit, Split)
- [ ] Port Filters (Date range, Category)
- [ ] Test gestures feel native on all platforms
- [ ] Add haptic feedback (mobile only)

### Week 4: Polish & Platform-Specific
- [ ] iOS safe area handling
- [ ] Android back button handling
- [ ] Keyboard avoiding views
- [ ] Push notification setup (mobile)
- [ ] PWA manifest (web)
- [ ] App icons and splash screens
- [ ] Test on real devices (iOS + Android)
- [ ] **Configure vercel.json for web export**

### Week 5: Beta Deployment
- [ ] **Setup beta.kemana.app subdomain (DNS)**
- [ ] **Deploy RN Web to beta.kemana.app**
- [ ] Run unit tests (packages/core)
- [ ] Manual testing on all platforms
- [ ] Fix critical bugs
- [ ] Internal testing (team)
- [ ] **Monitor beta metrics (errors, performance)**

### Week 6: Beta Testing & Feedback
- [ ] **Add beta banner on kemana.app (optional)**
- [ ] Invite beta users (optional)
- [ ] Collect user feedback
- [ ] Fix reported issues
- [ ] Performance optimization
- [ ] **Verify success criteria met**

### Week 7: Soft Launch Preparation
- [ ] **Create upgrade modal for kemana.app**
- [ ] Final testing on all platforms
- [ ] Prepare user communication
- [ ] Document rollback procedure
- [ ] **Backup Next.js project settings**
- [ ] Build production apps (EAS)

### Week 8: Full Switch
- [ ] **Reassign kemana.app to kemana-universal**
- [ ] **Redirect beta.kemana.app → kemana.app**
- [ ] **Keep kemana-web project as backup**
- [ ] Monitor closely for 48 hours
- [ ] Fix any critical issues immediately
- [ ] Submit iOS to App Store
- [ ] Submit Android to Play Store

### Week 9-10: Stabilization
- [ ] Monitor error rates (target < 1%)
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Fix non-critical issues
- [ ] Optimize performance
- [ ] **Keep Next.js backup active**

### Week 11+: Cleanup
- [ ] Verify stability (2+ weeks no critical issues)
- [ ] **Delete kemana-web Vercel project**
- [ ] **Remove beta subdomain**
- [ ] Update documentation
- [ ] Celebrate successful migration! 🎉

---

## 9. Common Issues & Solutions

### Issue 1: NativeWind styles not working

**Solution:**
```bash
# Clear cache and restart
npx expo start --clear

# Verify babel.config.js has nativewind plugin
# Verify tailwind.config.js content paths are correct
```

### Issue 2: SQLite not working on web

**Solution:**
```typescript
// Use platform-specific imports
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Use Dexie (IndexedDB)
  import('./db.web');
} else {
  // Use SQLite
  import('./db.native');
}
```

### Issue 3: Gestures not working on web

**Solution:**
```javascript
// metro.config.js
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json', 'mjs'];

// Install web-specific gesture handler
npm install react-native-gesture-handler@latest
```

### Issue 4: Build fails on EAS

**Solution:**
```bash
# Check eas.json configuration
# Verify app.json has correct bundle identifiers
# Check for native module compatibility

# View build logs
eas build:list
```

### Issue 5: Deep linking not working

**Solution:**
```json
// app.json
{
  "expo": {
    "scheme": "kemana",
    "web": {
      "bundler": "metro"
    }
  }
}
```

---

## 10. Post-Migration Maintenance

### Dual Codebase Period (Optional)

If you want to keep Next.js PWA running during migration:

```
apps/
├── web/           # Next.js (keep running)
└── universal/     # React Native Web (new)

Timeline:
Week 1-4: Migrate to universal
Week 5: Soft launch universal (beta)
Week 6-8: Monitor, fix bugs
Week 9: Full launch universal
Week 10: Deprecate Next.js PWA
```

### Single Codebase (Recommended)

Replace Next.js immediately:

```
apps/
└── universal/     # React Native Web (only)

Timeline:
Week 1-4: Migrate
Week 5: Deploy to all platforms
Week 6+: Maintain single codebase
```

---

## 11. Success Metrics

### Technical Metrics
- Bundle size (web): < 500KB gzipped
- App size (iOS): < 50MB
- App size (Android): < 30MB
- Cold start time: < 2 seconds
- Navigation transition: < 300ms
- Gesture response: < 16ms (60fps)

### User Metrics
- Crash-free rate: > 99.5%
- App Store rating: > 4.5 stars
- Play Store rating: > 4.5 stars
- Retention (Day 7): > 40%
- Retention (Day 30): > 20%

### Development Metrics
- Code sharing: > 95%
- Build time (EAS): < 15 minutes
- Deploy time (web): < 5 minutes
- Hot reload time: < 2 seconds

---

## 12. Resources & Documentation

### Official Docs
- Expo: https://docs.expo.dev
- React Native: https://reactnative.dev
- NativeWind: https://www.nativewind.dev
- Expo Router: https://docs.expo.dev/router/introduction

### Community
- Expo Discord: https://chat.expo.dev
- React Native Discord: https://discord.gg/react-native
- Stack Overflow: [react-native] tag

### Tools
- Expo Snack: https://snack.expo.dev (online playground)
- React Native Directory: https://reactnative.directory (packages)
- EAS Build: https://expo.dev/eas (cloud builds)

---

## Conclusion

Migration ke React Native Web memberikan:
1. ✅ 95%+ code sharing (edit 1x, update 3 platform)
2. ✅ Native mobile performance
3. ✅ App Store + Play Store presence
4. ✅ Push notifications untuk habit loop
5. ✅ Better iOS support (no PWA limitations)
6. ✅ Faster feature development (1x effort)

Timeline: 4 minggu migration + 5 minggu auth = 9 minggu total ke production

Next step: Mulai Week 1 setup setelah design ini approved! 🚀
