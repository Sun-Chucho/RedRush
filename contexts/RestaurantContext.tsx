/**
 * RestaurantContext — Supabase-only restaurant & menu management
 * Firebase/Firestore removed completely.
 */
import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { MenuItem, Restaurant } from '@/constants/mockData';
import {
  Category,
  createSupabaseMenuItem,
  deleteSupabaseMenuItem,
  ensureSupabaseVendorRestaurant,
  fetchSupabaseCategories,
  fetchSupabaseRestaurants,
  RestaurantLocationInput,
  updateSupabaseMenuItem,
  updateSupabaseVendorRestaurantProfile,
  updateSupabaseVendorRestaurantLocation,
} from '@/services/supabaseRestaurants';
import { useAuth } from '@/hooks/useAuth';
import { withTimeout } from '@/services/asyncUtils';

type MenuItemInput = Omit<MenuItem, 'id'>;
type MenuItemUpdate = Partial<MenuItemInput>;

interface RestaurantContextType {
  restaurants: Restaurant[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  getRestaurantById: (id: string) => Restaurant | undefined;
  getVendorRestaurant: () => Restaurant | undefined;
  ensureVendorRestaurant: () => Promise<string>;
  updateVendorRestaurantLocation: (location: RestaurantLocationInput) => Promise<void>;
  updateVendorRestaurantProfile: (patch: Partial<Omit<Restaurant, 'id' | 'menu' | 'categories'>>) => Promise<void>;
  createMenuItem: (restaurantId: string, item: MenuItemInput) => Promise<void>;
  updateMenuItem: (restaurantId: string, itemId: string, item: MenuItemUpdate) => Promise<void>;
  deleteMenuItem: (restaurantId: string, itemId: string) => Promise<void>;
  refreshRestaurants: () => Promise<void>;
}

export const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRestaurants = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, nextCategories] = await withTimeout(Promise.all([
        fetchSupabaseRestaurants(),
        fetchSupabaseCategories(),
      ]), 10000, 'Restaurants took too long to load.');
      setRestaurants(data);
      setCategories(nextCategories);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load restaurants.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const getRestaurantById = useCallback(
    (id: string) => restaurants.find(r => r.id === id),
    [restaurants]
  );

  const getVendorRestaurant = useCallback(() => {
    if (!user) return undefined;
    return (
      restaurants.find(r => r.id === user.restaurantId) ||
      restaurants.find(r => r.ownerId === user.id)
    );
  }, [restaurants, user]);

  const ensureVendorRestaurant = useCallback(async () => {
    if (!user || user.role !== 'vendor') {
      throw new Error('Only vendor accounts can manage restaurants.');
    }
    const existing = getVendorRestaurant();
    if (existing) return existing.id;

    const id = await ensureSupabaseVendorRestaurant(user);
    if (!id) throw new Error('Unable to create restaurant profile.');
    await loadRestaurants();
    return id;
  }, [getVendorRestaurant, loadRestaurants, user]);

  const updateVendorRestaurantLocation = useCallback(async (location: RestaurantLocationInput) => {
    const restaurantId = await ensureVendorRestaurant();
    await updateSupabaseVendorRestaurantLocation(restaurantId, location);
    await loadRestaurants();
  }, [ensureVendorRestaurant, loadRestaurants]);

  const updateVendorRestaurantProfile = useCallback(async (patch: Partial<Omit<Restaurant, 'id' | 'menu' | 'categories'>>) => {
    const restaurantId = await ensureVendorRestaurant();
    await updateSupabaseVendorRestaurantProfile(restaurantId, patch);
    await loadRestaurants();
  }, [ensureVendorRestaurant, loadRestaurants]);

  const createMenuItem = useCallback(async (restaurantId: string, item: MenuItemInput) => {
    await createSupabaseMenuItem(restaurantId, item);
    await loadRestaurants();
  }, [loadRestaurants]);

  const updateMenuItem = useCallback(async (restaurantId: string, itemId: string, item: MenuItemUpdate) => {
    await updateSupabaseMenuItem(restaurantId, itemId, item);
    await loadRestaurants();
  }, [loadRestaurants]);

  const deleteMenuItem = useCallback(async (restaurantId: string, itemId: string) => {
    await deleteSupabaseMenuItem(restaurantId, itemId);
    await loadRestaurants();
  }, [loadRestaurants]);

  const value = useMemo(() => ({
    restaurants,
    categories,
    isLoading,
    error,
    getRestaurantById,
    getVendorRestaurant,
    ensureVendorRestaurant,
    updateVendorRestaurantLocation,
    updateVendorRestaurantProfile,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    refreshRestaurants: loadRestaurants,
  }), [
    restaurants, categories, isLoading, error,
    getRestaurantById, getVendorRestaurant, ensureVendorRestaurant,
    updateVendorRestaurantLocation, updateVendorRestaurantProfile,
    createMenuItem, updateMenuItem, deleteMenuItem, loadRestaurants,
  ]);

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}
