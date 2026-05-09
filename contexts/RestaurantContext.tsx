import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { MenuItem, MOCK_RESTAURANTS, Restaurant } from '@/constants/mockData';
import { db } from '@/services/firebase';
import {
  createSupabaseMenuItem,
  deleteSupabaseMenuItem,
  ensureSupabaseVendorRestaurant,
  fetchSupabaseRestaurants,
  RestaurantLocationInput,
  shouldUseSupabaseRestaurants,
  updateSupabaseMenuItem,
  updateSupabaseVendorRestaurantLocation,
} from '@/services/supabaseRestaurants';
import { useAuth } from '@/hooks/useAuth';

type MenuItemInput = Omit<MenuItem, 'id'>;
type MenuItemUpdate = Partial<MenuItemInput>;
type RestaurantBase = Omit<Restaurant, 'menu'> & { createdAt?: unknown; updatedAt?: unknown };

interface RestaurantContextType {
  restaurants: Restaurant[];
  isLoading: boolean;
  error: string | null;
  getRestaurantById: (id: string) => Restaurant | undefined;
  getVendorRestaurant: () => Restaurant | undefined;
  ensureVendorRestaurant: () => Promise<string>;
  updateVendorRestaurantLocation: (location: RestaurantLocationInput) => Promise<void>;
  createMenuItem: (restaurantId: string, item: MenuItemInput) => Promise<void>;
  updateMenuItem: (restaurantId: string, itemId: string, item: MenuItemUpdate) => Promise<void>;
  deleteMenuItem: (restaurantId: string, itemId: string) => Promise<void>;
}

export const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80';

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : fallback;
}

function cleanPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function normalizeRestaurant(id: string, data: Record<string, unknown>): RestaurantBase {
  return {
    id,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    name: asString(data.name, 'Restaurant'),
    cuisine: asString(data.cuisine, 'Fast Food'),
    rating: asNumber(data.rating, 0),
    reviewCount: asNumber(data.reviewCount, 0),
    deliveryTime: asString(data.deliveryTime, '25-40 min'),
    deliveryFee: asNumber(data.deliveryFee, 500),
    minOrder: asNumber(data.minOrder, 1000),
    image: asString(data.image, DEFAULT_IMAGE),
    coverImage: asString(data.coverImage, DEFAULT_COVER),
    address: asString(data.address, 'Restaurant address'),
    latitude: asOptionalNumber(data.latitude),
    longitude: asOptionalNumber(data.longitude),
    isOpen: asBoolean(data.isOpen, true),
    distance: asString(data.distance, '0 km'),
    promo: typeof data.promo === 'string' ? data.promo : undefined,
    categories: asStringArray(data.categories, ['Meals', 'Drinks']),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function normalizeMenuItem(id: string, data: Record<string, unknown>): MenuItem {
  return {
    id,
    name: asString(data.name, 'Menu item'),
    description: asString(data.description, ''),
    price: asNumber(data.price, 0),
    image: asString(data.image, DEFAULT_IMAGE),
    category: asString(data.category, 'Meals'),
    available: asBoolean(data.available, true),
    preparationTime: asNumber(data.preparationTime, 15),
  };
}

function toRestaurant(base: RestaurantBase, menu: MenuItem[]): Restaurant {
  const categories = Array.from(new Set([...base.categories, ...menu.map(item => item.category)])).filter(Boolean);

  return {
    ...base,
    menu,
    categories,
  };
}

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [restaurantBases, setRestaurantBases] = useState<RestaurantBase[]>([]);
  const [menuByRestaurantId, setMenuByRestaurantId] = useState<Record<string, MenuItem[]>>({});
  const [supabaseRestaurants, setSupabaseRestaurants] = useState<Restaurant[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (shouldUseSupabaseRestaurants()) {
      fetchSupabaseRestaurants()
        .then(restaurants => {
          if (!isMounted) return;
          setSupabaseRestaurants(restaurants);
          setIsLoading(false);
          setError(null);
        })
        .catch(err => {
          if (!isMounted) return;
          setSupabaseRestaurants(null);
          setError(`Supabase unavailable, using Firebase fallback: ${err.message}`);
        });
    }

    const unsubscribe = onSnapshot(
      collection(db, 'restaurants'),
      snapshot => {
        setRestaurantBases(snapshot.docs.map(item => normalizeRestaurant(item.id, item.data())));
        setIsLoading(false);
        setError(null);
      },
      err => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const restaurantIds = useMemo(() => restaurantBases.map(restaurant => restaurant.id).sort().join('|'), [restaurantBases]);

  useEffect(() => {
    if (!restaurantIds) {
      setMenuByRestaurantId({});
      return undefined;
    }

    const unsubscribes = restaurantBases.map(restaurant =>
      onSnapshot(
        collection(db, 'restaurants', restaurant.id, 'menu'),
        snapshot => {
          const menu = snapshot.docs.map(item => normalizeMenuItem(item.id, item.data()));
          setMenuByRestaurantId(previous => ({ ...previous, [restaurant.id]: menu }));
        },
        err => {
          setError(err.message);
        }
      )
    );

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [restaurantBases, restaurantIds]);

  const liveRestaurants = useMemo(
    () => restaurantBases.map(base => toRestaurant(base, menuByRestaurantId[base.id] || [])),
    [restaurantBases, menuByRestaurantId]
  );

  const restaurants = supabaseRestaurants || liveRestaurants;

  const getRestaurantById = useCallback(
    (id: string) => restaurants.find(restaurant => restaurant.id === id),
    [restaurants]
  );

  const getVendorRestaurant = useCallback(() => {
    if (!user) return undefined;

    return (
      restaurants.find(restaurant => restaurant.id === user.restaurantId) ||
      restaurants.find(restaurant => restaurant.ownerId === user.id)
    );
  }, [restaurants, user]);

  const ensureVendorRestaurant = useCallback(async () => {
    if (!user || user.role !== 'vendor') {
      throw new Error('Only vendor accounts can manage restaurant menus.');
    }

    const ownedRestaurant =
      restaurants.find(restaurant => restaurant.id === user.restaurantId) ||
      restaurants.find(restaurant => restaurant.ownerId === user.id);

    if (ownedRestaurant) return ownedRestaurant.id;

    const supabaseRestaurantId = await ensureSupabaseVendorRestaurant(user);
    if (supabaseRestaurantId) {
      const refreshedRestaurants = await fetchSupabaseRestaurants();
      setSupabaseRestaurants(refreshedRestaurants);
      return supabaseRestaurantId;
    }

    const restaurantId = `vendor-${user.id}`;
    const template = MOCK_RESTAURANTS[0];

    await setDoc(
      doc(db, 'restaurants', restaurantId),
      cleanPayload({
        ownerId: user.id,
        name: user.name || 'My Restaurant',
        cuisine: template.cuisine,
        rating: 0,
        reviewCount: 0,
        deliveryTime: template.deliveryTime,
        deliveryFee: template.deliveryFee,
        minOrder: template.minOrder,
        image: template.image,
        coverImage: template.coverImage,
        address: user.address || 'Restaurant address',
        latitude: template.latitude,
        longitude: template.longitude,
        isOpen: true,
        distance: '0 km',
        promo: undefined,
        categories: ['Meals', 'Drinks'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );

    return restaurantId;
  }, [restaurants, user]);

  const updateVendorRestaurantLocation = useCallback(async (location: RestaurantLocationInput) => {
    if (!user || user.role !== 'vendor') {
      throw new Error('Only vendor accounts can update restaurant location.');
    }

    const restaurantId = await ensureVendorRestaurant();

    if (await updateSupabaseVendorRestaurantLocation(restaurantId, location)) {
      setSupabaseRestaurants(await fetchSupabaseRestaurants());
      return;
    }

    await updateDoc(
      doc(db, 'restaurants', restaurantId),
      cleanPayload({
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        distance: '0 km',
        updatedAt: serverTimestamp(),
      })
    );
  }, [ensureVendorRestaurant, user]);

  const createMenuItem = useCallback(async (restaurantId: string, item: MenuItemInput) => {
    if (await createSupabaseMenuItem(restaurantId, item)) {
      setSupabaseRestaurants(await fetchSupabaseRestaurants());
      return;
    }

    await addDoc(collection(db, 'restaurants', restaurantId, 'menu'), {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, []);

  const updateMenuItem = useCallback(async (restaurantId: string, itemId: string, item: MenuItemUpdate) => {
    if (await updateSupabaseMenuItem(restaurantId, itemId, item)) {
      setSupabaseRestaurants(await fetchSupabaseRestaurants());
      return;
    }

    await updateDoc(doc(db, 'restaurants', restaurantId, 'menu', itemId), {
      ...item,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const deleteMenuItem = useCallback(async (restaurantId: string, itemId: string) => {
    if (await deleteSupabaseMenuItem(restaurantId, itemId)) {
      setSupabaseRestaurants(await fetchSupabaseRestaurants());
      return;
    }

    await deleteDoc(doc(db, 'restaurants', restaurantId, 'menu', itemId));
  }, []);

  const value = useMemo(
    () => ({
      restaurants,
      isLoading,
      error,
      getRestaurantById,
      getVendorRestaurant,
      ensureVendorRestaurant,
      updateVendorRestaurantLocation,
      createMenuItem,
      updateMenuItem,
      deleteMenuItem,
    }),
    [
      restaurants,
      isLoading,
      error,
      getRestaurantById,
      getVendorRestaurant,
      ensureVendorRestaurant,
      updateVendorRestaurantLocation,
      createMenuItem,
      updateMenuItem,
      deleteMenuItem,
    ]
  );

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}
