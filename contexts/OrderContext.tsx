
/**
 * OrderContext — Supabase-only order management with real-time subscriptions
 */
import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { Order } from '@/constants/mockData';
import { CartItem } from './CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurants } from '@/hooks/useRestaurants';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import {
  createSupabaseOrder,
  fetchSupabaseOrders,
  updateSupabaseOrderTiming,
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
  isLoading: boolean;
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
  refreshOrders: () => Promise<void>;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

function uniqueById(orders: Order[]): Order[] {
  const seen = new Set<string>();
  return orders.filter(o => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { getVendorRestaurant } = useRestaurants();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prevStatuses, setPrevStatuses] = useState<Record<string, string>>({});

  const vendorRestaurantId = getVendorRestaurant()?.id;

  // ─── Fetch orders from Supabase ─────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    setIsLoading(true);
    try {
      const fetched = await fetchSupabaseOrders(user, vendorRestaurantId);
      if (fetched !== null) {
        setOrders(uniqueById(fetched));
        setActiveOrder(prev =>
          prev ? fetched.find(o => o.id === prev.id) || prev : null
        );
      }
    } catch (err) {
      console.warn('[OrderContext] loadOrders error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, vendorRestaurantId]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      setOrders([]);
      setActiveOrder(null);
    }
  }, [user, loadOrders]);

  // ─── Supabase Realtime subscription ─────────────────────────────────────
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    let filter: string | undefined;

    if (user.role === 'customer') {
      filter = `customer_id=eq.${user.id}`;
    } else if (user.role === 'vendor' && vendorRestaurantId) {
      filter = `restaurant_id=eq.${vendorRestaurantId}`;
    } else if (user.role === 'rider') {
      filter = undefined; // rider watches all orders (ready + assigned)
    }
    // admin watches all

    const channel = supabase
      .channel(`orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(filter ? { filter } : {}),
        },
        () => {
          // Refresh on any order change
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, vendorRestaurantId, loadOrders]);

  // ─── Push notification triggers on status changes ────────────────────────
  useEffect(() => {
    if (!user || !orders.length) return;

    // Capture current statuses for comparison
    const currentStatuses: Record<string, string> = {};
    orders.forEach(o => { currentStatuses[o.id] = o.status; });

    orders.forEach(order => {
      const prev = prevStatuses[order.id];
      if (!prev || prev === order.status) return;

      if (user.role === 'customer' && order.customerId === user.id) {
        sendOrderStatusNotification(
          order.status,
          order.restaurantName,
          order.riderName,
          order.deliveryTime
        ).catch(() => undefined);
      }

      if (
        user.role === 'vendor' &&
        order.restaurantId === vendorRestaurantId &&
        order.status === 'pending'
      ) {
        sendNewOrderNotification(1, order.restaurantName, order.total).catch(() => undefined);
      }

      if (user.role === 'rider' && order.status === 'ready' && !order.riderId) {
        sendRiderRequestNotification(
          order.restaurantName,
          Math.max(900, Math.round(order.deliveryFee * 0.8))
        ).catch(() => undefined);
      }
    });

    setPrevStatuses(currentStatuses);
    // The original comment mentioned prevStatuses in dependencies,
    // but updating it inside useEffect then depending on it causes infinite loops.
    // The effect should run when orders or user.role changes.
    // prevStatuses is handled by updating it at the end of the effect.
  }, [orders, user?.role, vendorRestaurantId]); 

  // ─── Actions ─────────────────────────────────────────────────────────────

  const placeOrder = useCallback(async (
    items: CartItem[],
    restaurantId: string,
    _restaurantName: string,
    address: string,
    paymentMethod: string,
    _deliveryFee: number,
    _serviceCharge = 0,
    _discount = 0,
    promoCode?: string
  ): Promise<Order> => {
    if (!user) throw new Error('Please sign in before placing an order.');
    if (!isSupabaseConfigured) throw new Error('Backend not configured.');

    const order = await createSupabaseOrder({
      restaurantId,
      address,
      paymentMethod,
      promoCode,
      items: items.map(item => ({ menuItemId: item.menuItem.id, quantity: item.quantity })),
    });

    if (!order) throw new Error('Unable to create order.');

    setOrders(prev => uniqueById([order, ...prev.filter(o => o.id !== order.id)]));
    setActiveOrder(order);
    return order;
  }, [user]);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    status: Order['status'],
    extra: Partial<Pick<Order, 'riderId' | 'riderName' | 'prepTime' | 'deliveryTime'>> = {}
  ) => {
    // Optimistic update
    const optimistic = status === 'picked_up' && user
      ? { riderId: user.id, riderName: user.name, riderPhone: user.phone, ...extra }
      : extra;

    const applyOptimistic = (prev: Order[]) =>
      prev.map(o => o.id === orderId ? { ...o, ...optimistic, status } : o);

    setOrders(applyOptimistic);
    if (activeOrder?.id === orderId) {
      setActiveOrder(prev => prev ? { ...prev, ...optimistic, status } : null);
    }

    await updateSupabaseOrderStatus(orderId, status);
    await loadOrders();
  }, [activeOrder?.id, user, loadOrders]);

  const assignRider = useCallback(async (orderId: string, riderId: string, riderName: string) => {
    await updateOrderStatus(orderId, 'picked_up', { riderId, riderName });
  }, [updateOrderStatus]);

  const setPrepAndDeliveryTime = useCallback(async (
    orderId: string,
    prepMinutes: number,
    deliveryMinutes: number
  ) => {
    const estimatedDelivery = new Date(
      Date.now() + (prepMinutes + deliveryMinutes) * 60000
    ).toISOString();

    // Optimistic update
    const applyOpt = (o: Order) =>
      o.id === orderId
        ? { ...o, prepTime: prepMinutes, deliveryTime: deliveryMinutes, estimatedDelivery }
        : o;

    setOrders(prev => prev.map(applyOpt));
    if (activeOrder?.id === orderId) {
      setActiveOrder(prev => (prev ? applyOpt(prev) : null));
    }

    await updateSupabaseOrderTiming(orderId, prepMinutes, deliveryMinutes, estimatedDelivery);
    await loadOrders();
  }, [activeOrder?.id, loadOrders]);

  const getOrderById = useCallback(
    (id: string) => orders.find(o => o.id === id),
    [orders]
  );

  const value = useMemo(() => ({
    orders,
    activeOrder,
    isLoading,
    placeOrder,
    updateOrderStatus,
    assignRider,
    getOrderById,
    setPrepAndDeliveryTime,
    refreshOrders: loadOrders,
  }), [orders, activeOrder, isLoading, placeOrder, updateOrderStatus, assignRider, getOrderById, setPrepAndDeliveryTime, loadOrders]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}
