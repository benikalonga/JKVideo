import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const restore = useAuthStore(s => s.restore);

  useEffect(() => {
    restore();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#00AEEC',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: { borderTopColor: '#eee' },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '首页',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="video"
          options={{ href: null }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
