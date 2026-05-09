// Polyfill maybeCompleteAuthSession for expo-web-browser API changes
import * as WebBrowser from 'expo-web-browser';
if (typeof (WebBrowser as any).maybeCompleteAuthSession !== 'function') {
  (WebBrowser as any).maybeCompleteAuthSession = () => ({ type: 'failed', message: 'polyfilled' });
}
import { Stack, usePathname } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
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

export default function RootLayout() {
  const pathname = usePathname();
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/(admin)') || ['/users', '/orders', '/analytics'].includes(pathname);
  const usePhoneShell = Platform.OS === 'web' && !isAdminPath;

  return (
    <AlertProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <CurrencyProvider>
                <CartProvider>
                  <CustomerDataProvider>
                    <RestaurantProvider>
                      <SupportProvider>
                        <OrderProvider>
                          <View style={[styles.webFrame, usePhoneShell && styles.webFramePhone]}>
                            <View style={[styles.root, usePhoneShell && styles.phoneShell]}>
                              <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="index" />
                                <Stack.Screen name="onboarding" />
                                <Stack.Screen name="auth" />
                                <Stack.Screen name="admin" />
                                <Stack.Screen name="(customer)" />
                                <Stack.Screen name="(vendor)" />
                                <Stack.Screen name="(rider)" />
                                <Stack.Screen name="(admin)" />
                                <Stack.Screen name="restaurant/[id]" />
                                <Stack.Screen name="order/[id]" />
                                <Stack.Screen name="checkout" />
                                <Stack.Screen name="support" />
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
  webFrame: { flex: 1 },
  webFramePhone: {
    alignItems: 'center',
    backgroundColor: '#151010',
    justifyContent: 'center',
  },
  root: { flex: 1, width: '100%' },
  phoneShell: {
    maxWidth: 430,
    minHeight: '100%',
    overflow: 'hidden',
    width: '100%',
  },
});
