import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushTokenOnBackend } from './backend';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId?: string): Promise<string | null> {
  if (!userId || (Platform.OS !== 'web' && !Device.isDevice)) {
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  const finalStatus = existing.status === 'granted'
    ? existing.status
    : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#CC0000',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  await registerPushTokenOnBackend(token);
  return token;
}

export async function sendOrderStatusNotification(status: string, restaurantName: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Order update',
      body: `${restaurantName} order status changed to ${status.replace('_', ' ')}.`,
      data: { type: 'order_status', status },
    },
    trigger: null,
  });
}

export async function sendRiderRequestNotification(restaurantName: string, earnings: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New delivery request',
      body: `Pick up from ${restaurantName}. Estimated earnings: ${earnings.toLocaleString()}.`,
      data: { type: 'rider_request' },
    },
    trigger: null,
  });
}

export async function sendNewOrderNotification(orderCount: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New order received',
      body: `${orderCount} order${orderCount === 1 ? '' : 's'} waiting for confirmation.`,
      data: { type: 'new_order' },
    },
    trigger: null,
  });
}
