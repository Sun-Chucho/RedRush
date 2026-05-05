import React, { createContext, useState, ReactNode } from 'react';
import { Order, MOCK_ORDERS } from '@/constants/mockData';
import { CartItem } from './CartContext';

interface OrderContextType {
  orders: Order[];
  activeOrder: Order | null;
  placeOrder: (items: CartItem[], restaurantId: string, restaurantName: string, address: string, paymentMethod: string, deliveryFee: number) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  getOrderById: (id: string) => Order | undefined;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const placeOrder = async (
    items: CartItem[],
    restaurantId: string,
    restaurantName: string,
    address: string,
    paymentMethod: string,
    deliveryFee: number
  ): Promise<Order> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const total = items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
    const newOrder: Order = {
      id: 'ord' + Date.now(),
      customerId: 'u1',
      restaurantId,
      restaurantName,
      items: items.map(i => ({ menuItem: i.menuItem, quantity: i.quantity, restaurantId })),
      total: total + deliveryFee,
      deliveryFee,
      status: 'pending',
      paymentMethod,
      address,
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 40 * 60000).toISOString(),
      riderId: 'rd1',
      riderName: 'Chukwudi Eze',
    };
    setOrders(prev => [newOrder, ...prev]);
    setActiveOrder(newOrder);

    // Simulate status progression
    setTimeout(() => {
      setOrders(prev => prev.map(o => o.id === newOrder.id ? { ...o, status: 'accepted' } : o));
      setActiveOrder(prev => prev?.id === newOrder.id ? { ...prev, status: 'accepted' } : prev);
    }, 3000);

    setTimeout(() => {
      setOrders(prev => prev.map(o => o.id === newOrder.id ? { ...o, status: 'preparing' } : o));
      setActiveOrder(prev => prev?.id === newOrder.id ? { ...prev, status: 'preparing' } : prev);
    }, 7000);

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    if (activeOrder?.id === orderId) {
      setActiveOrder(prev => prev ? { ...prev, status } : null);
    }
  };

  const getOrderById = (id: string) => orders.find(o => o.id === id);

  return (
    <OrderContext.Provider value={{ orders, activeOrder, placeOrder, updateOrderStatus, getOrderById }}>
      {children}
    </OrderContext.Provider>
  );
}
