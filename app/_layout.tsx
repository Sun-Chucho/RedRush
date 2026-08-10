import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { OrderProvider } from '@/contexts/OrderContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CustomerDataProvider } from '@/contexts/CustomerDataContext';
import { SupportProvider } from '@/contexts/SupportContext';
import { RestaurantProvider } from '@/contexts/RestaurantContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { registerForPushNotifications, subscribeToNotificationResponses } from '@/services/notifications';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
// Register the native rider background-location task at application startup.
import '../services/riderLocationTask';

function AuthenticatedPushRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    registerForPushNotifications(user.id, { requestPermission: false }).catch(() => undefined);
  }, [user?.id]);

  return null;
}

function NativeLocationBootstrap() {
  const { refreshLocationCurrency } = useCurrency();

  useEffect(() => {
    refreshLocationCurrency().catch(() => undefined);
  }, [refreshLocationCurrency]);

  return null;
}

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const topSegment = segments[0];
  const isAppGroupRoute = typeof topSegment === 'string' && topSegment.startsWith('(');
  const isPublicWebRoute = pathname === '/' || pathname === '/privacy-policy' || pathname === '/terms-of-service' || pathname === '/account-deletion' || pathname === '/support';
  const shouldUsePhoneShell = Platform.OS === 'web' && width < 768 && (isAppGroupRoute || !isPublicWebRoute);

  useEffect(() => subscribeToNotificationResponses(data => {
    if (typeof data.orderId === 'string' && data.orderId) {
      router.push(`/order/${data.orderId}`);
    } else if (data.type === 'support') {
      router.push('/support');
    }
  }), [router]);

  return (
    <AlertProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <AuthenticatedPushRegistration />
              <CurrencyProvider>
                <NativeLocationBootstrap />
                <CartProvider>
                  <CustomerDataProvider>
                    <RestaurantProvider>
                      <SupportProvider>
                        <OrderProvider>
                          <View style={[styles.webFrame, shouldUsePhoneShell && styles.webFramePhone]}>
                            <View style={[styles.root, shouldUsePhoneShell && styles.phoneShell]}>
                              <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="index" />
                                <Stack.Screen name="onboarding" />
                                <Stack.Screen name="auth" />
                                <Stack.Screen name="forgot-password" />
                                <Stack.Screen name="reset-password" />
                                <Stack.Screen name="admin" />
                                <Stack.Screen name="(customer)" />
                                <Stack.Screen name="(vendor)" />
                                <Stack.Screen name="(rider)" />
                                <Stack.Screen name="(admin)" />
                                <Stack.Screen name="restaurant/[id]" />
                                <Stack.Screen name="order/[id]" />
                                <Stack.Screen name="checkout" />
                                <Stack.Screen name="support" />
                                <Stack.Screen name="settings" />
                                <Stack.Screen name="privacy-policy" />
                                <Stack.Screen name="terms-of-service" />
                                <Stack.Screen name="account-deletion" />
                                <Stack.Screen name="chat/[orderId]" />
                              </Stack>
                            </View>
                          </View>
                        </OrderProvider>
                      </SupportProvider>
                    </RestaurantProvider>
                  </CustomerDataProvider>
                </CartProvider>
              </CurrencyProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({
  webFrame: { 
    flex: 1, 
    width: '100%',
    backgroundColor: Colors.background,
  },
  webFramePhone: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    justifyContent: 'center',
  },
  root: { 
    flex: 1, 
    width: '100%',
    maxWidth: '100%',
    marginHorizontal: 'auto',
  },
  phoneShell: {
    maxWidth: 430,
    width: '100%',
  },
});
