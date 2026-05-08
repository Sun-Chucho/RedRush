const admin = require('firebase-admin');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const REGION = 'us-central1';
const VALID_ROLES = new Set(['vendor', 'rider']);

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Please sign in first.');
  }
  return request.auth.uid;
}

async function getUser(uid) {
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) {
    throw new HttpsError('failed-precondition', 'User profile is missing.');
  }
  return snap.data();
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) {
    throw new HttpsError('permission-denied', 'You do not have permission for this action.');
  }
}

function cleanString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function centsSafeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
}

async function sendExpoPush(tokens, title, body, data = {}) {
  const messages = [...new Set(tokens.filter(Boolean))].map(to => ({
    to,
    sound: 'default',
    title,
    body,
    data,
  }));

  if (!messages.length) return;

  const chunks = [];
  for (let index = 0; index < messages.length; index += 100) {
    chunks.push(messages.slice(index, index + 100));
  }

  await Promise.all(chunks.map(chunk =>
    fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
      },
      body: JSON.stringify(chunk),
    }).catch(error => console.error('Expo push failed', error))
  ));
}

async function notifyUser(userId, title, body, data = {}) {
  const userSnap = await db.doc(`users/${userId}`).get();
  const tokens = userSnap.exists && Array.isArray(userSnap.data().pushTokens) ? userSnap.data().pushTokens : [];
  await sendExpoPush(tokens, title, body, data);
}

exports.createOrder = onCall({ region: REGION }, async request => {
  const uid = requireAuth(request);
  const user = await getUser(uid);
  requireRole(user, ['customer']);

  const restaurantId = cleanString(request.data.restaurantId);
  const address = cleanString(request.data.address);
  const paymentMethod = cleanString(request.data.paymentMethod, 'Cash on Delivery');
  const promoCode = cleanString(request.data.promoCode).toUpperCase();
  const items = Array.isArray(request.data.items) ? request.data.items : [];

  if (!restaurantId || !address || !items.length) {
    throw new HttpsError('invalid-argument', 'Restaurant, address, and items are required.');
  }

  const restaurantRef = db.doc(`restaurants/${restaurantId}`);
  const restaurantSnap = await restaurantRef.get();
  if (!restaurantSnap.exists) {
    throw new HttpsError('not-found', 'Restaurant not found.');
  }

  const restaurant = restaurantSnap.data();
  if (restaurant.isOpen === false) {
    throw new HttpsError('failed-precondition', 'Restaurant is currently closed.');
  }

  const normalizedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const menuItemId = cleanString(item.menuItemId);
    const quantity = Math.min(20, Math.max(1, centsSafeNumber(item.quantity, 1)));
    if (!menuItemId) continue;

    const menuSnap = await restaurantRef.collection('menu').doc(menuItemId).get();
    if (!menuSnap.exists) {
      throw new HttpsError('not-found', `Menu item ${menuItemId} not found.`);
    }

    const menu = menuSnap.data();
    if (menu.available === false) {
      throw new HttpsError('failed-precondition', `${menu.name || 'Menu item'} is unavailable.`);
    }

    const price = centsSafeNumber(menu.price);
    subtotal += price * quantity;
    normalizedItems.push({
      menuItem: {
        id: menuSnap.id,
        name: cleanString(menu.name, 'Menu item'),
        description: cleanString(menu.description),
        price,
        image: cleanString(menu.image),
        category: cleanString(menu.category, 'Meals'),
        available: menu.available !== false,
        preparationTime: centsSafeNumber(menu.preparationTime, 15),
      },
      quantity,
      restaurantId,
    });
  }

  if (!normalizedItems.length) {
    throw new HttpsError('invalid-argument', 'No valid order items were provided.');
  }

  const minOrder = centsSafeNumber(restaurant.minOrder);
  if (subtotal < minOrder) {
    throw new HttpsError('failed-precondition', `Minimum order is ${minOrder}.`);
  }

  const deliveryFee = centsSafeNumber(restaurant.deliveryFee, 500);
  const serviceCharge = Math.round(subtotal * 0.03);
  const promoDiscounts = { WELCOME20: 20, RUSH10: 10 };
  const discountPercent = promoDiscounts[promoCode] || 0;
  const discount = Math.round(subtotal * (discountPercent / 100));
  const total = Math.max(0, subtotal - discount) + deliveryFee + serviceCharge;
  const orderRef = db.collection('orders').doc();
  const now = new Date();
  const estimatedDelivery = new Date(Date.now() + 40 * 60000);

  const order = {
    customerId: uid,
    customerName: cleanString(user.name, 'Customer'),
    customerPhone: cleanString(user.phone),
    restaurantId,
    restaurantName: cleanString(restaurant.name, 'Restaurant'),
    restaurantOwnerId: cleanString(restaurant.ownerId),
    items: normalizedItems,
    subtotal,
    total,
    deliveryFee,
    serviceCharge,
    discount,
    promoCode: discountPercent ? promoCode : null,
    status: 'pending',
    paymentMethod,
    paymentStatus: paymentMethod.toLowerCase().includes('cash') ? 'collect_on_delivery' : 'pending',
    address,
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: now.toISOString(),
    estimatedDelivery: estimatedDelivery.toISOString(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await orderRef.set(order);

  return { id: orderRef.id, ...order, createdAt: now.toISOString(), updatedAt: now.toISOString() };
});

exports.updateOrderStatus = onCall({ region: REGION }, async request => {
  const uid = requireAuth(request);
  const user = await getUser(uid);
  const orderId = cleanString(request.data.orderId);
  const nextStatus = cleanString(request.data.status);
  const orderRef = db.doc(`orders/${orderId}`);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found.');
  const order = orderSnap.data();
  const patch = { status: nextStatus, updatedAt: FieldValue.serverTimestamp() };

  if (user.role === 'vendor') {
    const restaurantSnap = await db.doc(`restaurants/${order.restaurantId}`).get();
    if (!restaurantSnap.exists || restaurantSnap.data().ownerId !== uid) {
      throw new HttpsError('permission-denied', 'This order belongs to another restaurant.');
    }
    const allowed = {
      pending: ['accepted', 'cancelled'],
      accepted: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
    };
    if (!(allowed[order.status] || []).includes(nextStatus)) {
      throw new HttpsError('failed-precondition', 'Invalid vendor status transition.');
    }
  } else if (user.role === 'rider') {
    if (order.status === 'ready' && nextStatus === 'picked_up') {
      patch.riderId = uid;
      patch.riderName = cleanString(user.name, 'Rider');
    } else if (order.riderId !== uid || !['picked_up', 'delivered'].includes(nextStatus)) {
      throw new HttpsError('permission-denied', 'Invalid rider status transition.');
    }
  } else if (user.role === 'customer') {
    if (order.customerId !== uid || nextStatus !== 'cancelled' || !['pending', 'accepted'].includes(order.status)) {
      throw new HttpsError('permission-denied', 'This order can no longer be cancelled.');
    }
  } else {
    requireRole(user, ['admin']);
  }

  const timestampField = {
    accepted: 'acceptedAt',
    preparing: 'preparingAt',
    ready: 'readyAt',
    picked_up: 'pickedUpAt',
    delivered: 'deliveredAt',
    cancelled: 'cancelledAt',
  }[nextStatus];
  if (timestampField) patch[timestampField] = FieldValue.serverTimestamp();

  await orderRef.update(patch);
  await notifyUser(order.customerId, 'Order update', `${order.restaurantName} order is now ${nextStatus.replace('_', ' ')}.`, {
    type: 'order_status',
    orderId,
    status: nextStatus,
  });

  return { ok: true };
});

exports.requestRole = onCall({ region: REGION }, async request => {
  const uid = requireAuth(request);
  const role = cleanString(request.data.role);
  if (!VALID_ROLES.has(role)) {
    throw new HttpsError('invalid-argument', 'You can only request vendor or rider access.');
  }

  const user = await getUser(uid);
  await db.collection('roleRequests').doc(uid).set({
    userId: uid,
    userName: cleanString(user.name),
    email: cleanString(user.email),
    phone: cleanString(user.phone),
    requestedRole: role,
    status: 'pending',
    notes: cleanString(request.data.notes),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { ok: true };
});

exports.reviewRoleRequest = onCall({ region: REGION }, async request => {
  const uid = requireAuth(request);
  const adminUser = await getUser(uid);
  requireRole(adminUser, ['admin']);

  const requestUserId = cleanString(request.data.userId);
  const decision = cleanString(request.data.decision);
  const requestRef = db.doc(`roleRequests/${requestUserId}`);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) throw new HttpsError('not-found', 'Role request not found.');

  const roleRequest = requestSnap.data();
  if (!['approved', 'rejected'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'Decision must be approved or rejected.');
  }

  await db.runTransaction(async tx => {
    tx.update(requestRef, {
      status: decision,
      reviewedBy: uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (decision === 'approved') {
      tx.update(db.doc(`users/${requestUserId}`), {
        role: roleRequest.requestedRole,
        status: 'active',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  await notifyUser(requestUserId, 'Account review update', `Your ${roleRequest.requestedRole} request was ${decision}.`, {
    type: 'role_request',
    decision,
  });

  return { ok: true };
});

exports.registerPushToken = onCall({ region: REGION }, async request => {
  const uid = requireAuth(request);
  const token = cleanString(request.data.token);
  if (!token || !token.startsWith('ExponentPushToken[')) {
    throw new HttpsError('invalid-argument', 'Invalid Expo push token.');
  }

  await db.doc(`users/${uid}`).set({
    pushTokens: FieldValue.arrayUnion(token),
    pushTokenUpdatedAt: FieldValue.serverTimestamp(),
    notificationsMode: 'expo_push',
  }, { merge: true });

  return { ok: true };
});

exports.notifyReadyOrders = onDocumentUpdated({ region: REGION, document: 'orders/{orderId}' }, async event => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status || after.status !== 'ready') return;

  const riders = await db.collection('users').where('role', '==', 'rider').where('isOnline', '==', true).get();
  const tokens = riders.docs.flatMap(doc => Array.isArray(doc.data().pushTokens) ? doc.data().pushTokens : []);
  await sendExpoPush(tokens, 'New delivery request', `Pick up from ${after.restaurantName}.`, {
    type: 'rider_request',
    orderId: event.params.orderId,
  });
});

exports.cleanupDeliveredRiderLocation = onDocumentUpdated({ region: REGION, document: 'orders/{orderId}' }, async event => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status !== after.status && ['delivered', 'cancelled'].includes(after.status) && after.riderId) {
    await db.doc(`riderLocations/${after.riderId}`).set({
      isOnline: false,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
});

exports.notifyOrderCreated = onDocumentCreated({ region: REGION, document: 'orders/{orderId}' }, async event => {
  const order = event.data.data();
  if (order.restaurantOwnerId) {
    await notifyUser(order.restaurantOwnerId, 'New order received', `${order.customerName} placed an order.`, {
      type: 'new_order',
      orderId: event.params.orderId,
    });
  }
});
