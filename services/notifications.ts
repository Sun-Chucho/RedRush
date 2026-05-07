import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function registerForPushNotifications(userId?: string): Promise<string | null> {
  if (userId) {
    await setDoc(
      doc(db, 'users', userId),
      {
        notificationsMode: 'in_app',
        pushToken: null,
        pushTokenUpdatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => undefined);
  }

  return null;
}

export async function sendOrderStatusNotification(status: string, restaurantName: string) {
  await recordInAppNotification('order_status', {
    status,
    title: 'Order update',
    body: `${restaurantName} order status changed to ${status.replace('_', ' ')}.`,
  });
}

export async function sendRiderRequestNotification(restaurantName: string, earnings: number) {
  await recordInAppNotification('rider_request', {
    title: 'New delivery request',
    body: `Pick up from ${restaurantName}. Estimated earnings: ${earnings.toLocaleString()}.`,
  });
}

export async function sendNewOrderNotification(orderCount: number) {
  await recordInAppNotification('new_order', {
    title: 'New order received',
    body: `${orderCount} order${orderCount === 1 ? '' : 's'} waiting for confirmation.`,
  });
}

async function recordInAppNotification(type: string, payload: Record<string, unknown>) {
  await setDoc(
    doc(db, 'systemEvents', `notification-${Date.now()}`),
    {
      type,
      ...payload,
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  ).catch(() => undefined);
}
