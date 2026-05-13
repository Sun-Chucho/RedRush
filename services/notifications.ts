/**
 * Push notification service for native builds.
 *
 * Expo Notifications is loaded lazily because importing it on web emits runtime
 * warnings and can interfere with the web app startup path.
 */
import { Platform } from 'react-native';
import { registerPushTokenOnBackend } from './backend';

type ExpoNotifications = typeof import('expo-notifications');

let notificationsPromise: Promise<ExpoNotifications> | null = null;

async function getNativeNotifications(): Promise<ExpoNotifications | null> {
  if (Platform.OS === 'web') return null;

  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications').then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      return Notifications;
    });
  }

  return notificationsPromise;
}

export async function registerForPushNotifications(userId?: string): Promise<string | null> {
  if (!userId || Platform.OS === 'web') return null;

  const Device = await import('expo-device');
  if (!Device.isDevice) return null;

  const Notifications = await getNativeNotifications();
  if (!Notifications) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing === 'granted'
      ? existing
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

  try {
    const Constants = (await import('expo-constants')).default;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as any).easConfig?.projectId;
    const token = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    ).data;
    await registerPushTokenOnBackend(token).catch(() => undefined);
    return token;
  } catch {
    return null;
  }
}

async function scheduleLocalNotification(
  title: string,
  body: string,
  data: Record<string, unknown>,
  androidChannelId?: string
) {
  const Notifications = await getNativeNotifications();
  if (!Notifications) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
      ...(Platform.OS === 'android' && androidChannelId ? { channelId: androidChannelId } : {}),
    },
    trigger: null,
  });
}

export async function sendOrderStatusNotification(
  status: string,
  restaurantName: string,
  riderName?: string,
  estimatedMinutes?: number
) {
  const messages: Record<string, { title: string; body: string }> = {
    accepted: {
      title: 'Order Accepted',
      body: `${restaurantName} confirmed your order and is preparing it.`,
    },
    preparing: {
      title: 'Preparing Your Food',
      body: `${restaurantName} is now cooking your order. Sit tight!`,
    },
    ready: {
      title: 'Order Ready for Pickup',
      body: `Your order from ${restaurantName} is ready. A rider will pick it up shortly.`,
    },
    picked_up: {
      title: 'Rider On The Way',
      body: `${riderName || 'Your rider'} picked up your order.${estimatedMinutes ? ` ~${estimatedMinutes} min away.` : ''}`,
    },
    delivered: {
      title: 'Order Delivered!',
      body: `Your order from ${restaurantName} has arrived. Enjoy your meal!`,
    },
    cancelled: {
      title: 'Order Cancelled',
      body: `Your order from ${restaurantName} was cancelled.`,
    },
  };

  const msg = messages[status];
  if (!msg) return;

  await scheduleLocalNotification(msg.title, msg.body, { type: 'order_status', status }, 'redrush-orders');
}

export async function sendRiderRequestNotification(
  restaurantName: string,
  earnings: number,
  distanceKm?: number
) {
  await scheduleLocalNotification(
    'New Delivery Request!',
    `Pick up from ${restaurantName}.${distanceKm ? ` ${distanceKm.toFixed(1)} km away.` : ''} Earn ~${earnings.toLocaleString()}.`,
    { type: 'rider_request' },
    'redrush-rider'
  );
}

export async function sendNewOrderNotification(
  orderCount: number,
  restaurantName?: string,
  orderTotal?: number
) {
  await scheduleLocalNotification(
    orderCount === 1 ? 'New Order Received!' : `${orderCount} New Orders!`,
    orderTotal
      ? `New order at ${restaurantName || 'your restaurant'} - Total: ${orderTotal.toLocaleString()}. Tap to accept.`
      : `${orderCount} order${orderCount === 1 ? '' : 's'} waiting for confirmation.`,
    { type: 'new_order' },
    'redrush-vendor'
  );
}

export async function sendRiderAssignedNotification(
  restaurantName: string,
  customerAddress: string
) {
  await scheduleLocalNotification(
    'Delivery Assigned',
    `Head to ${restaurantName}, then deliver to ${customerAddress}.`,
    { type: 'rider_assigned' },
    'redrush-rider'
  );
}

export async function sendSupportReplyNotification(message: string) {
  await scheduleLocalNotification('Support Reply', message, { type: 'support' });
}
