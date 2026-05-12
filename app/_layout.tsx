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
import { Colors } from '@/constants/theme';

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
                          <View style={[styles.webFrame]}>
                            <View style={[styles.root]}>
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
    backgroundColor: '#151010',
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
    minHeight: '100%',
    overflow: 'hidden',
    width: '100%',
  },
});
