import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { MenuItem } from '@/constants/mockData';
import { useAuth } from '@/hooks/useAuth';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
}

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  total: number;
  itemCount: number;
  addItem: (item: MenuItem, restaurantId: string, restaurantName: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_PREFIX = 'redrush-cart-v2';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = `${CART_STORAGE_PREFIX}:${user?.id || 'guest'}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const total = items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setHydrated(false);
    setItems([]);
    setRestaurantId(null);
    setRestaurantName(null);
    AsyncStorage.getItem(storageKey)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw) as {
          items?: CartItem[];
          restaurantId?: string | null;
          restaurantName?: string | null;
        };
        if (Array.isArray(saved.items)) setItems(saved.items);
        setRestaurantId(saved.restaurantId || null);
        setRestaurantName(saved.restaurantName || null);
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ items, restaurantId, restaurantName })
    ).catch(() => undefined);
  }, [hydrated, items, restaurantId, restaurantName, storageKey]);

  const addItem = (menuItem: MenuItem, resId: string, resName: string) => {
    if (restaurantId && restaurantId !== resId) {
      setItems([{ menuItem, quantity: 1, restaurantId: resId, restaurantName: resName }]);
      setRestaurantId(resId);
      setRestaurantName(resName);
      return;
    }
    setRestaurantId(resId);
    setRestaurantName(resName);
    setItems(prev => {
      const existing = prev.find(i => i.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem, quantity: 1, restaurantId: resId, restaurantName: resName }];
    });
  };

  const removeItem = (itemId: string) => {
    setItems(prev => {
      const updated = prev.filter(i => i.menuItem.id !== itemId);
      if (updated.length === 0) {
        setRestaurantId(null);
        setRestaurantName(null);
      }
      return updated;
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems(prev => prev.map(i => i.menuItem.id === itemId ? { ...i, quantity } : i));
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
    setRestaurantName(null);
    AsyncStorage.removeItem(storageKey).catch(() => undefined);
  };

  return (
    <CartContext.Provider value={{ items, restaurantId, restaurantName, total, itemCount, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}
