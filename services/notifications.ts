import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(userId?: string): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulators/emulators can't receive push notifications
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('redrush', {
      name: 'RedRush Orders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#CC0000',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('redrush-rider', {
      name: 'RedRush Rider Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#22C55E',
      sound: 'default',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    // Save token to Firestore if userId provided
    if (userId && pushToken) {
      await updateDoc(doc(db, 'users', userId), {
        pushToken,
        pushTokenUpdatedAt: new Date().toISOString(),
      }).catch(() => undefined);
    }

    return pushToken;
  } catch {
    return null;
  }
}

// ── Local notification helpers ────────────────────────────────────────────────

export async function sendOrderStatusNotification(status: string, restaurantName: string) {
  const messages: Record<string, { title: string; body: string }> = {
    accepted: {
      title: 'Order Accepted!',
      body: `${restaurantName} confirmed your order and is preparing it now.`,
    },
    preparing: {
      title: 'Being Prepared',
      body: `${restaurantName} is cooking your food. Hang tight!`,
    },
    ready: {
      title: 'Food is Ready!',
      body: `Your order from ${restaurantName} is ready. A rider will pick it up shortly.`,
    },
    picked_up: {
      title: 'Rider On the Way!',
      body: `Your order has been picked up and is heading to you.`,
    },
    delivered: {
      title: 'Order Delivered!',
      body: `Your order from ${restaurantName} has arrived. Enjoy your meal!`,
    },
    cancelled: {
      title: 'Order Cancelled',
      body: `Your order from ${restaurantName} was cancelled. You will be refunded if charged.`,
    },
  };

  const msg = messages[status];
  if (!msg) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      sound: 'default',
      data: { type: 'order_status', status },
      ...(Platform.OS === 'android' ? { channelId: 'redrush' } : {}),
    },
    trigger: null, // Send immediately
  });
}

export async function sendRiderRequestNotification(restaurantName: string, earnings: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Delivery Request!',
      body: `Pick up from ${restaurantName}. Earn ₦${earnings.toLocaleString()}`,
      sound: 'default',
      data: { type: 'rider_request' },
      ...(Platform.OS === 'android' ? { channelId: 'redrush-rider' } : {}),
    },
    trigger: null,
  });
}

export async function sendNewOrderNotification(orderCount: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New Order Received!',
      body: `You have ${orderCount} new order${orderCount > 1 ? 's' : ''} waiting for your confirmation.`,
      sound: 'default',
      data: { type: 'new_order' },
      ...(Platform.OS === 'android' ? { channelId: 'redrush' } : {}),
    },
    trigger: null,
  });
}
