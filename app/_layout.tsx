import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
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
import { ThemeToggle } from '@/components/ThemeToggle';

export default function RootLayout() {
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
                          <View style={styles.root}>
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
                            <ThemeToggle style={styles.themeToggle} />
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
  root: { flex: 1 },
  themeToggle: {
    bottom: 92,
    position: 'absolute',
    right: 14,
    zIndex: 100,
  },
});
