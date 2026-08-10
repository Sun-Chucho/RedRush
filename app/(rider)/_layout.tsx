import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors, FontSize, FontWeight } from '@/constants/theme';

export default function RiderLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const useSidebar = width >= 768;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: useSidebar ? 'left' : 'bottom',
        tabBarLabelPosition: useSidebar ? 'beside-icon' : 'below-icon',
        tabBarActiveBackgroundColor: useSidebar ? Colors.primary + '18' : undefined,
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
        tabBarLabelStyle: { fontSize: useSidebar ? FontSize.sm : FontSize.xs, fontWeight: useSidebar ? FontWeight.semibold : FontWeight.medium },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="deliveries" options={{ title: 'Deliveries', tabBarIcon: ({ color, size }) => <MaterialIcons name="delivery-dining" size={size} color={color} /> }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: ({ color, size }) => <MaterialIcons name="chat" size={size} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color, size }) => <MaterialIcons name="account-balance-wallet" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  desktopScene: { backgroundColor: Colors.background, width: '100%', maxWidth: 1440, alignSelf: 'center', paddingHorizontal: 24 },
  mobileScene: { backgroundColor: Colors.background },
  sidebar: { width: 228, height: '100%', paddingHorizontal: 12, paddingTop: 28, paddingBottom: 20, backgroundColor: Colors.surface, borderRightWidth: 1, borderRightColor: Colors.border },
  sidebarItem: { height: 56, maxHeight: 56, borderRadius: 12, marginVertical: 3 },
});
