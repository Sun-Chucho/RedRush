import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushTokenOnBackend } from './backend';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
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

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('redrush-orders', {
      name: 'Order Updates',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#CC0000',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('redrush-rider', {
      name: 'Rider Requests',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 100, 200, 300],
      lightColor: '#CC0000',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('redrush-vendor', {
      name: 'Vendor Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#CC0000',
      sound: 'default',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  await registerPushTokenOnBackend(token).catch(() => undefined);
  return token;
}

// ─── Customer: Order Status Updates ─────────────────────────────────────────

export async function sendOrderStatusNotification(
  status: string,
  restaurantName: string,
  riderName?: string,
  estimatedMinutes?: number
) {
  const messages: Record<string, { title: string; body: string }> = {
    accepted: {
      title: 'Order Accepted',
      body: `${restaurantName} confirmed your order and started preparing it.`,
    },
    preparing: {
      title: 'Preparing Your Food',
      body: `${restaurantName} is now preparing your order. Sit tight!`,
    },
    ready: {
      title: 'Order Ready',
      body: `Your order from ${restaurantName} is ready. A rider will pick it up shortly.`,
    },
    picked_up: {
      title: 'Rider On The Way',
      body: `${riderName || 'Your rider'} picked up your order and is heading to you.${estimatedMinutes ? ` ~${estimatedMinutes} min away.` : ''}`,
    },
    delivered: {
      title: 'Order Delivered!',
      body: `Your order from ${restaurantName} has been delivered. Enjoy your meal!`,
    },
    cancelled: {
      title: 'Order Cancelled',
      body: `Your order from ${restaurantName} was cancelled. You will not be charged.`,
    },
  };

  const msg = messages[status];
  if (!msg) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      data: { type: 'order_status', status },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'redrush-orders' } : {}),
    },
    trigger: null,
  });
}

// ─── Rider: Incoming Delivery Request ────────────────────────────────────────

export async function sendRiderRequestNotification(
  restaurantName: string,
  earnings: number,
  distanceKm?: number
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Delivery Request!',
      body: `Pick up from ${restaurantName}.${distanceKm ? ` ${distanceKm.toFixed(1)} km away.` : ''} Earn up to ${earnings.toLocaleString()}.`,
      data: { type: 'rider_request' },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'redrush-rider' } : {}),
    },
    trigger: null,
  });
}

// ─── Vendor: New Order Alert ─────────────────────────────────────────────────

export async function sendNewOrderNotification(
  orderCount: number,
  restaurantName?: string,
  orderTotal?: number
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: orderCount === 1 ? 'New Order Received!' : `${orderCount} New Orders!`,
      body: orderTotal
        ? `New order for ${restaurantName || 'your restaurant'} — Total: ${orderTotal.toLocaleString()}. Tap to accept.`
        : `${orderCount} order${orderCount === 1 ? '' : 's'} waiting for confirmation.`,
      data: { type: 'new_order' },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'redrush-vendor' } : {}),
    },
    trigger: null,
  });
}

// ─── Rider: Order Assigned ────────────────────────────────────────────────────

export async function sendRiderAssignedNotification(restaurantName: string, customerAddress: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Delivery Assigned',
      body: `Head to ${restaurantName} then deliver to ${customerAddress}.`,
      data: { type: 'rider_assigned' },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'redrush-rider' } : {}),
    },
    trigger: null,
  });
}
