import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { MenuItem } from '@/constants/mockData';

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

const CART_STORAGE_KEY = 'redrush-cart-v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const total = items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
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
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items, restaurantId, restaurantName })
    ).catch(() => undefined);
  }, [hydrated, items, restaurantId, restaurantName]);

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
    AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => undefined);
  };

  return (
    <CartContext.Provider value={{ items, restaurantId, restaurantName, total, itemCount, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}
