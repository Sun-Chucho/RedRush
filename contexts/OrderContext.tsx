import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Order } from '@/constants/mockData';
import { CartItem } from './CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurants } from '@/hooks/useRestaurants';
import { db } from '@/services/firebase';
import { createOrderOnBackend, updateOrderStatusOnBackend } from '@/services/backend';
import {
  createSupabaseOrder,
  fetchSupabaseOrders,
  updateSupabaseOrderStatus,
} from '@/services/supabaseOrders';

interface OrderContextType {
  orders: Order[];
  activeOrder: Order | null;
  placeOrder: (items: CartItem[], restaurantId: string, restaurantName: string, address: string, paymentMethod: string, deliveryFee: number, serviceCharge?: number, discount?: number, promoCode?: string) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status'], extra?: Partial<Pick<Order, 'riderId' | 'riderName'>>) => Promise<void>;
  assignRider: (orderId: string, riderId: string, riderName: string) => Promise<void>;
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
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    restaurantId: data.restaurantId || '',
    restaurantName: data.restaurantName || 'Restaurant',
    items: Array.isArray(data.items) ? data.items : [],
    subtotal: Number(data.subtotal || 0),
    total: Number(data.total || 0),
    deliveryFee: Number(data.deliveryFee || 0),
    status: data.status || 'pending',
    paymentMethod: data.paymentMethod || 'Cash on Delivery',
    address: data.address || '',
    createdAt: toIsoDate(data.createdAt || data.createdAtIso),
    estimatedDelivery: toIsoDate(data.estimatedDelivery, Date.now() + 40 * 60000),
    serviceCharge: Number(data.serviceCharge || 0),
    discount: Number(data.discount || 0),
    promoCode: data.promoCode,
    riderId: data.riderId,
    riderName: data.riderName,
    acceptedAt: data.acceptedAt ? toIsoDate(data.acceptedAt) : undefined,
    preparingAt: data.preparingAt ? toIsoDate(data.preparingAt) : undefined,
    readyAt: data.readyAt ? toIsoDate(data.readyAt) : undefined,
    pickedUpAt: data.pickedUpAt ? toIsoDate(data.pickedUpAt) : undefined,
    deliveredAt: data.deliveredAt ? toIsoDate(data.deliveredAt) : undefined,
    cancelledAt: data.cancelledAt ? toIsoDate(data.cancelledAt) : undefined,
  };
}

function uniqueOrdersById(orders: Order[]) {
  const seen = new Set<string>();

  return orders.filter(order => {
    if (seen.has(order.id)) return false;
    seen.add(order.id);
    return true;
  });
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { getVendorRestaurant } = useRestaurants();
  const [orders, setOrders] = useState<Order[]>([]);
  const [supabaseOrders, setSupabaseOrders] = useState<Order[] | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const vendorRestaurant = getVendorRestaurant();
  const vendorRestaurantId = vendorRestaurant?.id;

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setActiveOrder(null);
      return;
    }

    const ordersRef = collection(db, 'orders');
    const orderQueries =
      user.role === 'customer'
        ? [query(ordersRef, where('customerId', '==', user.id))]
        : user.role === 'vendor'
          ? vendorRestaurantId
            ? [query(ordersRef, where('restaurantId', '==', vendorRestaurantId))]
            : []
          : user.role === 'rider'
            ? [
                query(ordersRef, where('status', '==', 'ready')),
                query(ordersRef, where('riderId', '==', user.id)),
              ]
            : [ordersRef];

    if (!orderQueries.length) {
      setOrders([]);
      setActiveOrder(null);
      return;
    }

    const snapshots = new Map<number, Order[]>();

    const publish = () => {
      const liveOrders = uniqueOrdersById(
        Array.from(snapshots.values())
          .flat()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );

      setOrders(liveOrders);
      setActiveOrder(prev => (prev ? liveOrders.find(order => order.id === prev.id) || prev : prev));
    };

    const unsubscribes = orderQueries.map((ordersQuery, index) => onSnapshot(
      ordersQuery,
      snapshot => {
        snapshots.set(index, snapshot.docs.map(orderDoc => orderFromDoc(orderDoc.id, orderDoc.data() as Partial<Order> & Record<string, unknown>)));
        publish();
      },
      () => {
        snapshots.set(index, []);
        publish();
      }
    ));

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user, user?.id, user?.role, vendorRestaurantId]);

  useEffect(() => {
    let isMounted = true;

    fetchSupabaseOrders(user, vendorRestaurantId)
      .then(nextOrders => {
        if (!isMounted || nextOrders === null) return;
        setSupabaseOrders(nextOrders);
        setActiveOrder(prev => (prev ? nextOrders.find(order => order.id === prev.id) || prev : prev));
      })
      .catch(() => {
        if (isMounted) setSupabaseOrders(null);
      });

    return () => {
      isMounted = false;
    };
  }, [user, user?.id, user?.role, vendorRestaurantId]);

  const visibleOrders = supabaseOrders || orders;

  const placeOrder = useCallback(async (
    items: CartItem[],
    restaurantId: string,
    restaurantName: string,
    address: string,
    paymentMethod: string,
    deliveryFee: number,
    serviceCharge = 0,
    discount = 0,
    promoCode?: string
  ): Promise<Order> => {
    if (!user) {
      throw new Error('Please sign in before placing an order.');
    }

    try {
      const supabaseOrder = await createSupabaseOrder({
        restaurantId,
        address,
        paymentMethod,
        promoCode,
        items: items.map(item => ({ menuItemId: item.menuItem.id, quantity: item.quantity })),
      });

      if (supabaseOrder) {
        setSupabaseOrders(prev => uniqueOrdersById([supabaseOrder, ...(prev || []).filter(order => order.id !== supabaseOrder.id)]));
        setActiveOrder(supabaseOrder);
        return supabaseOrder;
      }

      const createdOrder = await createOrderOnBackend<Partial<Order> & Record<string, unknown>>({
        restaurantId,
        address,
        paymentMethod,
        promoCode,
        items: items.map(item => ({ menuItemId: item.menuItem.id, quantity: item.quantity })),
      });
      const savedOrder = orderFromDoc(String(createdOrder.id || ''), createdOrder);
      setOrders(prev => uniqueOrdersById([savedOrder, ...prev.filter(order => order.id !== savedOrder.id)]));
      setActiveOrder(savedOrder);
      return savedOrder;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unable to place order.');
    }
  }, [user]);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: Order['status'],
    extra: Partial<Pick<Order, 'riderId' | 'riderName'>> = {}
  ) => {
    const optimisticExtra = status === 'picked_up' && user
      ? { riderId: user.id, riderName: user.name, ...extra }
      : extra;

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...optimisticExtra, status } : o));
    setSupabaseOrders(prev => prev ? prev.map(o => o.id === orderId ? { ...o, ...optimisticExtra, status } : o) : prev);
    if (activeOrder?.id === orderId) {
      setActiveOrder(prev => prev ? { ...prev, ...optimisticExtra, status } : null);
    }

    if (await updateSupabaseOrderStatus(orderId, status)) {
      const refreshedOrders = await fetchSupabaseOrders(user, vendorRestaurantId);
      if (refreshedOrders !== null) setSupabaseOrders(refreshedOrders);
      return;
    }

    await updateOrderStatusOnBackend({ orderId, status });
  }, [activeOrder?.id, user, vendorRestaurantId]);

  const assignRider = useCallback(async (orderId: string, riderId: string, riderName: string) => {
    await updateOrderStatus(orderId, 'picked_up', { riderId, riderName });
  }, [updateOrderStatus]);

  const getOrderById = useCallback((id: string) => visibleOrders.find(o => o.id === id), [visibleOrders]);

  const value = useMemo(
    () => ({ orders: visibleOrders, activeOrder, placeOrder, updateOrderStatus, assignRider, getOrderById }),
    [visibleOrders, activeOrder, placeOrder, updateOrderStatus, assignRider, getOrderById]
  );

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}
