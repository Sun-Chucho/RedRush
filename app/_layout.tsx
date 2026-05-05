import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { OrderProvider } from '@/contexts/OrderContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              <OrderProvider>
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
                </Stack>
              </OrderProvider>
            </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
