/**
 * Push notification service for native builds.
 *
 * Expo Notifications is loaded lazily because importing it on web emits runtime
 * warnings and can interfere with the web app startup path.
 */
import { Platform } from 'react-native';
import { registerPushTokenOnBackend } from './backend';

type ExpoNotifications = {
  AndroidImportance: { HIGH: number; MAX: number };
  getExpoPushTokenAsync: (options?: { projectId?: string }) => Promise<{ data: string }>;
  getPermissionsAsync: () => Promise<{ status: string; canAskAgain?: boolean }>;
  requestPermissionsAsync: () => Promise<{ status: string; canAskAgain?: boolean }>;
  scheduleNotificationAsync: (request: {
    content: Record<string, unknown>;
    trigger: null;
  }) => Promise<unknown>;
  setNotificationChannelAsync: (channelId: string, channel: {
    name: string;
    importance: number;
    vibrationPattern?: number[];
    lightColor?: string;
    sound?: string;
  }) => Promise<unknown>;
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner: boolean;
      shouldShowList: boolean;
    }>;
  }) => void;
  addNotificationResponseReceivedListener: (listener: (response: {
    notification: { request: { content: { data?: Record<string, unknown> } } };
  }) => void) => { remove: () => void };
};

let notificationsPromise: Promise<ExpoNotifications> | null = null;
let expoGoPromise: Promise<boolean> | null = null;

async function isExpoGo() {
  if (Platform.OS === 'web') return false;
  if (!expoGoPromise) {
    expoGoPromise = import('expo-constants')
      .then(({ default: Constants }) => Constants.appOwnership === 'expo')
      .catch(() => false);
  }
  return expoGoPromise;
}

async function getNativeNotifications(): Promise<ExpoNotifications | null> {
  if (Platform.OS === 'web') return null;
  if (await isExpoGo()) return null;

  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications').then((NotificationsModule) => {
      const Notifications = NotificationsModule as unknown as ExpoNotifications;
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

export type PushRegistrationOutcome = {
  enabled: boolean;
  token: string | null;
  reason?: 'web' | 'expo_go' | 'simulator' | 'denied' | 'error';
  canAskAgain?: boolean;
  message?: string;
};

async function configureAndroidChannels(Notifications: ExpoNotifications) {
  if (Platform.OS !== 'android') return;
  // Android 13 does not present the runtime notification prompt reliably until
  // the app has created at least one notification channel.
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

export async function requestPushNotificationRegistration(
  userId?: string,
  requestPermission = true
): Promise<PushRegistrationOutcome> {
  if (!userId) return { enabled: false, token: null, reason: 'error', message: 'Sign in before enabling notifications.' };
  if (Platform.OS === 'web') return { enabled: false, token: null, reason: 'web', message: 'Background push notifications are not available on web yet.' };
  if (await isExpoGo()) return { enabled: false, token: null, reason: 'expo_go', message: 'Install the RedRush test or Play Store build to enable notifications. Expo Go does not support RedRush push notifications.' };

  const Device = await import('expo-device');
  if (!Device.isDevice) return { enabled: false, token: null, reason: 'simulator', message: 'Push notifications require a physical phone.' };

  const Notifications = await getNativeNotifications();
  if (!Notifications) return { enabled: false, token: null, reason: 'error', message: 'Notification services are unavailable in this build.' };

  try {
    await configureAndroidChannels(Notifications);
  } catch (error) {
    console.warn('[notifications] Channel setup failed:', error);
    return { enabled: false, token: null, reason: 'error', message: 'RedRush could not prepare Android notifications. Please restart the app and try again.' };
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === 'granted'
    ? existing
    : requestPermission && existing.canAskAgain !== false
      ? await Notifications.requestPermissionsAsync()
      : existing;

  if (permission.status !== 'granted') {
    return {
      enabled: false,
      token: null,
      reason: 'denied',
      canAskAgain: permission.canAskAgain !== false,
      message: permission.canAskAgain === false
        ? 'Notifications are blocked for RedRush. Open phone settings and allow notifications.'
        : requestPermission
          ? 'Notification permission was not allowed.'
          : 'Notification permission has not been granted yet.',
    };
  }

  try {
    const Constants = (await import('expo-constants')).default;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as any).easConfig?.projectId;
    const token = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    ).data;
    await registerPushTokenOnBackend(token);
    return { enabled: true, token };
  } catch (error) {
    console.warn('[notifications] Push registration failed:', error);
    return { enabled: false, token: null, reason: 'error', message: 'Permission was granted, but RedRush could not register this phone. Check your internet connection and try again.' };
  }
}

export async function registerForPushNotifications(
  userId?: string,
  options: { requestPermission?: boolean } = {}
): Promise<string | null> {
  const result = await requestPushNotificationRegistration(userId, options.requestPermission ?? true);
  return result.token;
}

export function subscribeToNotificationResponses(
  onResponse: (data: Record<string, unknown>) => void
) {
  let remove: (() => void) | undefined;
  let active = true;

  void getNativeNotifications().then(Notifications => {
    if (!active || !Notifications) return;
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      onResponse(response.notification.request.content.data || {});
    });
    remove = () => subscription.remove();
  });

  return () => {
    active = false;
    remove?.();
  };
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
