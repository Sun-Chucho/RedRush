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
import {
  sendOrderStatusNotification,
  sendNewOrderNotification,
  sendRiderRequestNotification,
} from '@/services/notifications';

interface OrderContextType {
  orders: Order[];
  activeOrder: Order | null;
  placeOrder: (
    items: CartItem[],
    restaurantId: string,
    restaurantName: string,
    address: string,
    paymentMethod: string,
    deliveryFee: number,
    serviceCharge?: number,
    discount?: number,
    promoCode?: string
  ) => Promise<Order>;
  updateOrderStatus: (
    orderId: string,
    status: Order['status'],
    extra?: Partial<Pick<Order, 'riderId' | 'riderName' | 'prepTime' | 'deliveryTime'>>
  ) => Promise<void>;
  assignRider: (orderId: string, riderId: string, riderName: string) => Promise<void>;
  getOrderById: (id: string) => Order | undefined;
  setPrepAndDeliveryTime: (orderId: string, prepMinutes: number, deliveryMinutes: number) => Promise<void>;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

function toIsoDate(value: unknown, fallback = Date.now()) {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
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
    riderPhone: data.riderPhone as string | undefined,
    customerPhone: data.customerPhone as string | undefined,
    prepTime: data.prepTime as number | undefined,
    deliveryTime: data.deliveryTime as number | undefined,
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
  const [prevOrderStatuses, setPrevOrderStatuses] = useState<Record<string, string>>({});
  const vendorRestaurant = getVendorRestaurant();
  const vendorRestaurantId = vendorRestaurant?.id;

  // ─── Firestore real-time subscription ───────────────────────────────────
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
      setActiveOrder(prev => (prev ? liveOrders.find(o => o.id === prev.id) || prev : prev));
    };

    const unsubscribes = orderQueries.map((q, index) =>
      onSnapshot(
        q,
        snapshot => {
          snapshots.set(index, snapshot.docs.map(doc => orderFromDoc(doc.id, doc.data() as Partial<Order> & Record<string, unknown>)));
          publish();
        },
        () => {
          snapshots.set(index, []);
          publish();
        }
      )
    );

    return () => unsubscribes.forEach(u => u());
  }, [user, user?.id, user?.role, vendorRestaurantId]);

  // ─── Supabase initial fetch ──────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    fetchSupabaseOrders(user, vendorRestaurantId)
      .then(nextOrders => {
        if (!isMounted || nextOrders === null) return;
        setSupabaseOrders(nextOrders);
        setActiveOrder(prev => (prev ? nextOrders.find(o => o.id === prev.id) || prev : prev));
      })
      .catch(() => {
        if (isMounted) setSupabaseOrders(null);
      });
    return () => { isMounted = false; };
  }, [user, user?.id, user?.role, vendorRestaurantId]);

  // ─── Push notification triggers on status changes ────────────────────────
  const visibleOrders = supabaseOrders || orders;

  useEffect(() => {
    if (!user || !visibleOrders.length) return;

    visibleOrders.forEach(order => {
      const prevStatus = prevOrderStatuses[order.id];
      if (prevStatus && prevStatus !== order.status) {
        // Customer receives order status updates
        if (user.role === 'customer' && order.customerId === user.id) {
          sendOrderStatusNotification(
            order.status,
            order.restaurantName,
            order.riderName,
            order.deliveryTime
          ).catch(() => undefined);
        }

        // Vendor receives notification when order becomes pending
        if (user.role === 'vendor' && order.restaurantId === vendorRestaurantId && order.status === 'pending') {
          sendNewOrderNotification(1, order.restaurantName, order.total).catch(() => undefined);
        }

        // Rider receives notification when order becomes ready (nearby)
        if (user.role === 'rider' && order.status === 'ready' && !order.riderId) {
          sendRiderRequestNotification(
            order.restaurantName,
            Math.max(900, Math.round(order.deliveryFee * 0.8))
          ).catch(() => undefined);
        }
      }
    });

    const statusMap: Record<string, string> = {};
    visibleOrders.forEach(o => { statusMap[o.id] = o.status; });
    setPrevOrderStatuses(statusMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleOrders, user?.role]);

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
    if (!user) throw new Error('Please sign in before placing an order.');

    try {
      const supabaseOrder = await createSupabaseOrder({
        restaurantId,
        address,
        paymentMethod,
        promoCode,
        items: items.map(item => ({ menuItemId: item.menuItem.id, quantity: item.quantity })),
      });

      if (supabaseOrder) {
        setSupabaseOrders(prev =>
          uniqueOrdersById([supabaseOrder, ...(prev || []).filter(o => o.id !== supabaseOrder.id)])
        );
        setActiveOrder(supabaseOrder);
        return supabaseOrder;
      }

      const createdOrder = await createOrderOnBackend<Partial<Order> & Record<string, unknown>>({
        restaurantId, address, paymentMethod, promoCode,
        items: items.map(item => ({ menuItemId: item.menuItem.id, quantity: item.quantity })),
      });
      const savedOrder = orderFromDoc(String(createdOrder.id || ''), createdOrder);
      setOrders(prev => uniqueOrdersById([savedOrder, ...prev.filter(o => o.id !== savedOrder.id)]));
      setActiveOrder(savedOrder);
      return savedOrder;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unable to place order.');
    }
  }, [user]);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: Order['status'],
    extra: Partial<Pick<Order, 'riderId' | 'riderName' | 'prepTime' | 'deliveryTime'>> = {}
  ) => {
    const optimisticExtra = status === 'picked_up' && user
      ? { riderId: user.id, riderName: user.name, riderPhone: user.phone, ...extra }
      : extra;

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...optimisticExtra, status } : o));
    setSupabaseOrders(prev => prev
      ? prev.map(o => o.id === orderId ? { ...o, ...optimisticExtra, status } : o)
      : prev
    );
    if (activeOrder?.id === orderId) {
      setActiveOrder(prev => prev ? { ...prev, ...optimisticExtra, status } : null);
    }

    if (await updateSupabaseOrderStatus(orderId, status)) {
      const refreshed = await fetchSupabaseOrders(user, vendorRestaurantId);
      if (refreshed !== null) setSupabaseOrders(refreshed);
      return;
    }

    await updateOrderStatusOnBackend({ orderId, status });
  }, [activeOrder?.id, user, vendorRestaurantId]);

  const assignRider = useCallback(async (orderId: string, riderId: string, riderName: string) => {
    await updateOrderStatus(orderId, 'picked_up', { riderId, riderName });
  }, [updateOrderStatus]);

  const setPrepAndDeliveryTime = useCallback(async (
    orderId: string,
    prepMinutes: number,
    deliveryMinutes: number
  ) => {
    const estimatedDelivery = new Date(Date.now() + (prepMinutes + deliveryMinutes) * 60000).toISOString();

    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, prepTime: prepMinutes, deliveryTime: deliveryMinutes, estimatedDelivery }
        : o
    ));
    setSupabaseOrders(prev => prev
      ? prev.map(o =>
          o.id === orderId
            ? { ...o, prepTime: prepMinutes, deliveryTime: deliveryMinutes, estimatedDelivery }
            : o
        )
      : prev
    );
    if (activeOrder?.id === orderId) {
      setActiveOrder(prev =>
        prev ? { ...prev, prepTime: prepMinutes, deliveryTime: deliveryMinutes, estimatedDelivery } : null
      );
    }

    // Persist to backend
    await updateOrderStatusOnBackend({ orderId, status: undefined as unknown as Order['status'], prepTime: prepMinutes, deliveryTime: deliveryMinutes, estimatedDelivery } as Parameters<typeof updateOrderStatusOnBackend>[0]).catch(() => undefined);
  }, [activeOrder?.id]);

  const getOrderById = useCallback((id: string) => visibleOrders.find(o => o.id === id), [visibleOrders]);

  const value = useMemo(() => ({
    orders: visibleOrders,
    activeOrder,
    placeOrder,
    updateOrderStatus,
    assignRider,
    getOrderById,
    setPrepAndDeliveryTime,
  }), [visibleOrders, activeOrder, placeOrder, updateOrderStatus, assignRider, getOrderById, setPrepAndDeliveryTime]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}
