import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Home, FileText, BarChart3, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
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
    </Tabs>
  );
}
