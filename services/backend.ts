import { httpsCallable } from 'firebase/functions';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, functions } from './firebase';

export type RoleRequestRole = 'vendor' | 'rider';
export type RoleRequestDecision = 'approved' | 'rejected';

export interface CreateOrderInput {
  restaurantId: string;
  address: string;
  paymentMethod: string;
  promoCode?: string;
  items: { menuItemId: string; quantity: number }[];
}

export async function createOrderOnBackend<T = unknown>(payload: CreateOrderInput): Promise<T> {
  const callable = httpsCallable<CreateOrderInput, T>(functions, 'createOrder');
  try {
    const result = await callable(payload);
    return result.data;
  } catch {
    return createOrderInFirestore<T>(payload);
  }
}

export async function updateOrderStatusOnBackend(payload: {
  orderId: string;
  status: string;
}): Promise<void> {
  const callable = httpsCallable<typeof payload, { ok: boolean }>(functions, 'updateOrderStatus');
  try {
    await callable(payload);
  } catch {
    await updateOrderStatusInFirestore(payload.orderId, payload.status);
  }
}

export async function requestRoleOnBackend(role: RoleRequestRole, notes?: string): Promise<void> {
  const callable = httpsCallable<{ role: RoleRequestRole; notes?: string }, { ok: boolean }>(functions, 'requestRole');
  try {
    await callable({ role, notes });
  } catch {
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in first.');
    await setDoc(doc(db, 'roleRequests', user.uid), {
      userId: user.uid,
      userName: user.displayName || 'User',
      email: user.email || '',
      requestedRole: role,
      status: 'pending',
      notes: notes || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

export async function reviewRoleRequestOnBackend(
  userId: string,
  decision: RoleRequestDecision
): Promise<void> {
  const callable = httpsCallable<{ userId: string; decision: RoleRequestDecision }, { ok: boolean }>(
    functions,
    'reviewRoleRequest'
  );
  try {
    await callable({ userId, decision });
  } catch {
    const requestRef = doc(db, 'roleRequests', userId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) throw new Error('Role request not found.');
    const request = requestSnap.data() as { requestedRole?: RoleRequestRole };

    await updateDoc(requestRef, {
      status: decision,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (decision === 'approved' && request.requestedRole) {
      await updateDoc(doc(db, 'users', userId), {
        role: request.requestedRole,
        status: 'active',
        updatedAt: serverTimestamp(),
      });
    }
  }
}

export async function registerPushTokenOnBackend(token: string): Promise<void> {
  const callable = httpsCallable<{ token: string }, { ok: boolean }>(functions, 'registerPushToken');
  try {
    await callable({ token });
  } catch {
    const user = auth.currentUser;
    if (!user) throw new Error('Please sign in first.');
    await setDoc(doc(db, 'users', user.uid), {
      pushTokens: arrayUnion(token),
      pushTokenUpdatedAt: serverTimestamp(),
      notificationsMode: 'expo_push',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

async function createOrderInFirestore<T>(payload: CreateOrderInput): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in first.');

  const profileSnap = await getDoc(doc(db, 'users', user.uid));
  const profile = profileSnap.exists() ? profileSnap.data() : {};
  if (profile.role && profile.role !== 'customer') {
    throw new Error('Only customers can place orders.');
  }

  const restaurantRef = doc(db, 'restaurants', payload.restaurantId);
  const restaurantSnap = await getDoc(restaurantRef);
  if (!restaurantSnap.exists()) throw new Error('Restaurant not found.');

  const restaurant = restaurantSnap.data();
  if (restaurant.isOpen === false) throw new Error('Restaurant is currently closed.');

  const normalizedItems = [];
  let subtotal = 0;

  for (const item of payload.items) {
    const menuItemId = String(item.menuItemId || '');
    const quantity = Math.min(20, Math.max(1, Math.round(Number(item.quantity) || 1)));
    const menuSnap = await getDoc(doc(db, 'restaurants', payload.restaurantId, 'menu', menuItemId));
    if (!menuSnap.exists()) throw new Error('A menu item is no longer available.');
    const menu = menuSnap.data();
    if (menu.available === false) throw new Error(`${menu.name || 'Menu item'} is unavailable.`);

    const price = Math.max(0, Math.round(Number(menu.price) || 0));
    subtotal += price * quantity;
    normalizedItems.push({
      menuItem: {
        id: menuSnap.id,
        name: menu.name || 'Menu item',
        description: menu.description || '',
        price,
        image: menu.image || '',
        category: menu.category || 'Meals',
        available: menu.available !== false,
        preparationTime: Number(menu.preparationTime || 15),
      },
      quantity,
      restaurantId: payload.restaurantId,
    });
  }

  const minOrder = Number(restaurant.minOrder || 0);
  if (subtotal < minOrder) throw new Error(`Minimum order is ${minOrder}.`);

  const deliveryFee = Math.max(0, Math.round(Number(restaurant.deliveryFee) || 500));
  const serviceCharge = Math.round(subtotal * 0.03);
  const promoCode = (payload.promoCode || '').toUpperCase();
  const promoDiscounts: Record<string, number> = { WELCOME20: 20, RUSH10: 10 };
  const discount = Math.round(subtotal * ((promoDiscounts[promoCode] || 0) / 100));
  const now = new Date();
  const estimatedDelivery = new Date(Date.now() + 40 * 60000);
  const orderPayload = {
    customerId: user.uid,
    customerName: profile.name || user.displayName || 'Customer',
    customerPhone: profile.phone || '',
    restaurantId: payload.restaurantId,
    restaurantName: restaurant.name || 'Restaurant',
    restaurantOwnerId: restaurant.ownerId || '',
    items: normalizedItems,
    subtotal,
    total: Math.max(0, subtotal - discount) + deliveryFee + serviceCharge,
    deliveryFee,
    serviceCharge,
    discount,
    promoCode: promoDiscounts[promoCode] ? promoCode : null,
    status: 'pending',
    paymentMethod: payload.paymentMethod,
    paymentStatus: payload.paymentMethod.toLowerCase().includes('cash') ? 'collect_on_delivery' : 'pending',
    address: payload.address,
    createdAt: serverTimestamp(),
    createdAtIso: now.toISOString(),
    estimatedDelivery: estimatedDelivery.toISOString(),
    updatedAt: serverTimestamp(),
  };

  const orderRef = await addDoc(collection(db, 'orders'), orderPayload);
  return { id: orderRef.id, ...orderPayload, createdAt: now.toISOString(), updatedAt: now.toISOString() } as T;
}

async function updateOrderStatusInFirestore(orderId: string, status: string) {
  const user = auth.currentUser;
  const timestampField: Record<string, string | undefined> = {
    accepted: 'acceptedAt',
    preparing: 'preparingAt',
    ready: 'readyAt',
    picked_up: 'pickedUpAt',
    delivered: 'deliveredAt',
    cancelled: 'cancelledAt',
  };
  const patch: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (timestampField[status]) {
    patch[timestampField[status] as string] = serverTimestamp();
  }

  if (status === 'picked_up' && user) {
    const profileSnap = await getDoc(doc(db, 'users', user.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};
    patch.riderId = user.uid;
    patch.riderName = profile.name || user.displayName || 'Rider';
  }

  await updateDoc(doc(db, 'orders', orderId), patch);
}
