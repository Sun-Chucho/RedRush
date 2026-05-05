import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Order, MOCK_ORDERS } from '@/constants/mockData';
import { CartItem } from './CartContext';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/services/firebase';

interface OrderContextType {
  orders: Order[];
  activeOrder: Order | null;
  placeOrder: (items: CartItem[], restaurantId: string, restaurantName: string, address: string, paymentMethod: string, deliveryFee: number, serviceCharge?: number) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  getOrderById: (id: string) => Order | undefined;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

function toIsoDate(value: unknown, fallback = Date.now()) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(fallback).toISOString();
}

function orderFromDoc(id: string, data: Partial<Order> & Record<string, unknown>): Order {
  return {
    id,
    customerId: data.customerId || '',
    restaurantId: data.restaurantId || '',
    restaurantName: data.restaurantName || 'Restaurant',
    items: Array.isArray(data.items) ? data.items : [],
    total: Number(data.total || 0),
    deliveryFee: Number(data.deliveryFee || 0),
    status: data.status || 'pending',
    paymentMethod: data.paymentMethod || 'Cash on Delivery',
    address: data.address || '',
    createdAt: toIsoDate(data.createdAt || data.createdAtIso),
    estimatedDelivery: toIsoDate(data.estimatedDelivery, Date.now() + 40 * 60000),
    serviceCharge: Number(data.serviceCharge || 0),
    riderId: data.riderId,
    riderName: data.riderName,
  };
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setActiveOrder(null);
      return;
    }

    const ordersRef = collection(db, 'orders');
    const ordersQuery = user.role === 'customer'
      ? query(ordersRef, where('customerId', '==', user.id))
      : ordersRef;

    const unsubscribe = onSnapshot(
      ordersQuery,
      snapshot => {
        const liveOrders = snapshot.docs
          .map(orderDoc => orderFromDoc(orderDoc.id, orderDoc.data() as Partial<Order> & Record<string, unknown>))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setOrders(liveOrders);
        setActiveOrder(prev => (prev ? liveOrders.find(order => order.id === prev.id) || prev : prev));
      },
      () => {
        setOrders(MOCK_ORDERS);
      }
    );

    return unsubscribe;
  }, [user?.id, user?.role]);

  const placeOrder = async (
    items: CartItem[],
    restaurantId: string,
    restaurantName: string,
    address: string,
    paymentMethod: string,
    deliveryFee: number,
    serviceCharge = 0
  ): Promise<Order> => {
    if (!user) {
      throw new Error('Please sign in before placing an order.');
    }

    const total = items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
    const createdAt = new Date();
    const estimatedDelivery = new Date(Date.now() + 40 * 60000);
    const orderPayload = {
      customerId: user.id,
      customerName: user.name,
      customerPhone: user.phone,
      restaurantId,
      restaurantName,
      items: items.map(i => ({ menuItem: i.menuItem, quantity: i.quantity, restaurantId })),
      total: total + deliveryFee + serviceCharge,
      deliveryFee,
      serviceCharge,
      status: 'pending',
      paymentMethod,
      address,
      createdAt: serverTimestamp(),
      createdAtIso: createdAt.toISOString(),
      estimatedDelivery: estimatedDelivery.toISOString(),
      updatedAt: serverTimestamp(),
    };

    const optimisticOrder: Order = {
      id: 'ord' + Date.now(),
      customerId: user.id,
      restaurantId,
      restaurantName,
      items: orderPayload.items,
      total: orderPayload.total,
      deliveryFee,
      serviceCharge,
      status: 'pending',
      paymentMethod,
      address,
      createdAt: createdAt.toISOString(),
      estimatedDelivery: estimatedDelivery.toISOString(),
    };

    try {
      const orderRef = await addDoc(collection(db, 'orders'), orderPayload);
      const savedOrder = { ...optimisticOrder, id: orderRef.id };
      setOrders(prev => [savedOrder, ...prev.filter(order => order.id !== optimisticOrder.id)]);
      setActiveOrder(savedOrder);
      return savedOrder;
    } catch {
      setOrders(prev => [optimisticOrder, ...prev]);
      setActiveOrder(optimisticOrder);
      return optimisticOrder;
    }
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    if (activeOrder?.id === orderId) {
      setActiveOrder(prev => prev ? { ...prev, status } : null);
    }

    updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: serverTimestamp(),
      ...(status === 'delivered' ? { deliveredAt: serverTimestamp() } : {}),
    }).catch(() => undefined);
  };

  const getOrderById = (id: string) => orders.find(o => o.id === id);

  return (
    <OrderContext.Provider value={{ orders, activeOrder, placeOrder, updateOrderStatus, getOrderById }}>
      {children}
    </OrderContext.Provider>
  );
}
