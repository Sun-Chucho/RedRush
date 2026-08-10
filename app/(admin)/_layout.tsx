import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors, FontSize, FontWeight } from '@/constants/theme';
import { useThemeMode } from '@/contexts/ThemeContext';

export default function AdminLayout() {
  useThemeMode();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const useSidebar = width >= 900;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: useSidebar ? 'left' : 'bottom',
        tabBarLabelPosition: useSidebar ? 'beside-icon' : 'below-icon',
        tabBarItemStyle: useSidebar ? styles.sidebarItem : undefined,
        sceneStyle: useSidebar ? styles.desktopScene : styles.mobileScene,
        tabBarStyle: useSidebar ? styles.sidebar : {
          height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
          paddingHorizontal: 16,
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <MaterialIcons name="dashboard" size={size} color={color} /> }} />
      <Tabs.Screen name="users" options={{ title: 'Users', tabBarIcon: ({ color, size }) => <MaterialIcons name="people" size={size} color={color} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color, size }) => <MaterialIcons name="receipt-long" size={size} color={color} /> }} />
      <Tabs.Screen name="support" options={{ title: 'Support', tabBarIcon: ({ color, size }) => <MaterialIcons name="support-agent" size={size} color={color} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: ({ color, size }) => <MaterialIcons name="bar-chart" size={size} color={color} /> }} />
      <Tabs.Screen name="dispatch" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  desktopScene: { backgroundColor: Colors.background, width: '100%', maxWidth: 1440, alignSelf: 'center', paddingHorizontal: 24 },
  mobileScene: { backgroundColor: Colors.background },
  sidebar: { width: 228, height: '100%', paddingHorizontal: 12, paddingTop: 28, paddingBottom: 20, backgroundColor: Colors.surface, borderRightWidth: 1, borderRightColor: Colors.border },
  sidebarItem: { height: 56, maxHeight: 56, borderRadius: 12, marginVertical: 3 },
});
