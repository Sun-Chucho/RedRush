import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { OrderProvider } from '@/contexts/OrderContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotifications } from '@/services/notifications';

function NotificationBootstrap() {
  const router = useRouter();
  const notifListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Register device for push notifications
    registerForPushNotifications().catch(() => undefined);

    // Listen for incoming notifications while app is open
    notifListener.current = Notifications.addNotificationReceivedListener(_notification => {
      // Notification received while app is foregrounded — handler set in notifications.ts
    });

    // Handle tapping a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data?.type === 'order_status' && data?.orderId) {
        router.push(`/order/${data.orderId}`);
      }
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              <OrderProvider>
                <NotificationBootstrap />
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
