/**
 * Push notification service — real Expo push tokens + in-app Firestore records
 */
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─── Push Token Registration ──────────────────────────────────────────────────

/**
 * Request notification permission and register the Expo push token.
 * Persists the token to /pushTokens/{userId} and marks the user doc.
 */
export async function registerForPushNotifications(userId?: string): Promise<string | null> {
  // Web and Expo Go don't support real push notifications
  if (Platform.OS === 'web') return null;

  try {
    const Notifications = await import('expo-notifications');

    // Configure how notifications are presented
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Request permission
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
    });
    const token = tokenData.data;

    // Persist token to Firestore
    if (userId && token) {
      const now = new Date().toISOString();

      await Promise.all([
        setDoc(
          doc(db, 'pushTokens', userId),
          { userId, token, platform: Platform.OS, updatedAt: now },
          { merge: true }
        ),
        setDoc(
          doc(db, 'users', userId),
          { pushToken: token, pushTokenUpdatedAt: now, notificationsMode: 'push' },
          { merge: true }
        ),
      ]).catch(() => undefined);
    }

    return token;
  } catch {
    // Gracefully degrade — no push in Expo Go or web
    return null;
  }
}

// ─── Notification Senders ─────────────────────────────────────────────────────

/**
 * Record an order status change notification in Firestore.
 * When server-side functions are available they should send the actual push;
 * this creates the Firestore event record for the admin log.
 */
export async function sendOrderStatusNotification(status: string, restaurantName: string) {
  const label = status.replace(/_/g, ' ');
  await recordSystemEvent('order_status', {
    title: 'Order update',
    body: `${restaurantName} — your order is now: ${label}.`,
    status,
    restaurantName,
  });
}

export async function sendRiderRequestNotification(restaurantName: string, earnings: number) {
  await recordSystemEvent('rider_request', {
    title: 'New delivery request',
    body: `Pick up from ${restaurantName}. Est. earnings: ${earnings.toLocaleString()}.`,
    restaurantName,
    earnings,
  });
}

export async function sendNewOrderNotification(orderCount: number) {
  await recordSystemEvent('new_order', {
    title: 'New order received',
    body: `${orderCount} order${orderCount === 1 ? '' : 's'} waiting for confirmation.`,
    orderCount,
  });
}

// ─── Local Notifications ─────────────────────────────────────────────────────

/**
 * Schedule an immediate local notification (visible even without a push token).
 */
export async function scheduleLocalNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // Immediate
    });
  } catch {
    // Gracefully ignore in environments that don't support local notifications
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function recordSystemEvent(type: string, payload: Record<string, unknown>) {
  await setDoc(
    doc(db, 'systemEvents', `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    { type, ...payload, createdAt: new Date().toISOString() }
  ).catch(() => undefined);
}
