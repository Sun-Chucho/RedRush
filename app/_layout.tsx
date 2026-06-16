import { Stack, usePathname, useSegments } from 'expo-router';
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

export default function RootLayout() {
  const pathname = usePathname();
  const segments = useSegments();
  const { width, height } = useWindowDimensions();
  const topSegment = segments[0];
  const isAppGroupRoute = typeof topSegment === 'string' && topSegment.startsWith('(');
  const isPublicWebRoute = pathname === '/' || pathname === '/privacy-policy' || pathname === '/terms-of-service' || pathname === '/account-deletion' || pathname === '/support';
  const shouldUsePhoneShell = Platform.OS === 'web' && width >= 768 && (isAppGroupRoute || !isPublicWebRoute);
  const phoneHeight = Math.max(620, Math.min(860, height - 48));

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
                          <View style={[styles.webFrame, shouldUsePhoneShell && styles.webFramePhone]}>
                            <View style={[styles.root, shouldUsePhoneShell && styles.phoneShell, shouldUsePhoneShell && { height: phoneHeight }]}>
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
    backgroundColor: '#110B0B',
    justifyContent: 'center',
    padding: 24,
  },
  root: { 
    flex: 1, 
    width: '100%',
    maxWidth: '100%',
    marginHorizontal: 'auto',
  },
  phoneShell: {
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 34,
    borderWidth: 1,
    maxWidth: 430,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.42,
    shadowRadius: 36,
    width: '100%',
  },
});
