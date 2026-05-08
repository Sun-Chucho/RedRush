import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { OrderProvider } from '@/contexts/OrderContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CustomerDataProvider } from '@/contexts/CustomerDataContext';
import { SupportProvider } from '@/contexts/SupportContext';
import { registerForPushNotifications } from '@/services/notifications';
import { useAuth } from '@/hooks/useAuth';

function NotificationRegistrar() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id).catch(() => undefined);
    }
  }, [user?.id]);
  return null;
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <CurrencyProvider>
              <CartProvider>
                <CustomerDataProvider>
                  <SupportProvider>
                    <OrderProvider>
                      <NotificationRegistrar />
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="onboarding" />
                        <Stack.Screen name="auth" />
                        <Stack.Screen name="(customer)" />
                        <Stack.Screen name="(vendor)" />
                        <Stack.Screen name="(rider)" />
                        <Stack.Screen name="(admin)" />
                        <Stack.Screen name="restaurant/[id]" />
                        <Stack.Screen name="order/[id]" />
                        <Stack.Screen name="checkout" />
                        <Stack.Screen name="support" />
                      </Stack>
                    </OrderProvider>
                  </SupportProvider>
                </CustomerDataProvider>
              </CartProvider>
            </CurrencyProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
