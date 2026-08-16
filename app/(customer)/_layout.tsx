import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Colors, FontSize, FontWeight, createThemedStyles } from '@/constants/theme';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/hooks/useLanguage';

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const { itemCount } = useCart();
  return (
    <View>
      <MaterialIcons name="shopping-cart" size={size} color={color} />
      {itemCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CustomerLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
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
      <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="cart" options={{ title: t('cart'), tabBarIcon: ({ color, size }) => <CartTabIcon color={color} size={size} /> }} />
      <Tabs.Screen name="orders" options={{ title: t('orders'), tabBarIcon: ({ color, size }) => <MaterialIcons name="receipt-long" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = createThemedStyles(() => ({
  desktopScene: { backgroundColor: Colors.background, width: '100%', maxWidth: 1440, alignSelf: 'center', paddingHorizontal: 24 },
  mobileScene: { backgroundColor: Colors.background },
  sidebar: {
    width: 228,
    height: '100%',
    paddingHorizontal: 12,
    paddingTop: 28,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  sidebarItem: { height: 56, maxHeight: 56, borderRadius: 12, marginVertical: 3 },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: Colors.primary, borderRadius: 999,
    minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: FontWeight.bold },
}));
