import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { requestPushNotificationRegistration, PushRegistrationOutcome } from '@/services/notifications';
import {
  loadSupabaseCustomerData,
  saveSupabaseCustomerData,
  saveSupabaseLastNotification,
  saveSupabaseSearchHistory,
  SearchHistoryItem,
} from '@/services/supabaseCustomerData';

export interface SavedAddress {
  id: string;
  label: string;
  details: string;
  isDefault?: boolean;
}

export interface SavedPaymentMethod {
  id: string;
  label: string;
  detail: string;
  type: 'mobile_money' | 'card' | 'cash';
  isDefault?: boolean;
}

export interface PromoCode {
  id: string;
  code: string;
  title: string;
  description: string;
  discountPercent: number;
  expiresAt: string;
  used?: boolean;
}

export interface CustomerReview {
  id: string;
  restaurantId: string;
  restaurantName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface NotificationSettings {
  orderUpdates: boolean;
  promos: boolean;
  account: boolean;
  pushEnabled: boolean;
}

interface CustomerDataContextType {
  savedAddresses: SavedAddress[];
  paymentMethods: SavedPaymentMethod[];
  favouriteRestaurantIds: string[];
  promoCodes: PromoCode[];
  reviews: CustomerReview[];
  notificationSettings: NotificationSettings;
  searchHistory: SearchHistoryItem[];
  setDefaultAddress: (addressId: string) => void;
  addSavedAddress: (address: Omit<SavedAddress, 'id'>) => void;
  setDefaultPaymentMethod: (paymentMethodId: string) => void;
  toggleFavouriteRestaurant: (restaurantId: string) => void;
  redeemPromoCode: (code: string) => PromoCode | null;
  addReview: (review: Omit<CustomerReview, 'id' | 'createdAt'>) => void;
  updateNotificationSetting: (key: keyof NotificationSettings, value: boolean) => void;
  enablePushNotifications: () => Promise<PushRegistrationOutcome>;
  sendLocalNotification: (title: string, body: string) => Promise<void>;
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
}

export const CustomerDataContext = createContext<CustomerDataContextType | undefined>(undefined);

const defaultAddress: SavedAddress[] = [];
const defaultPaymentMethods: SavedPaymentMethod[] = [];
const defaultPromoCodes: PromoCode[] = [];

const defaultReviews: CustomerReview[] = [];

const defaultNotificationSettings: NotificationSettings = {
  orderUpdates: true,
  promos: true,
  account: true,
  pushEnabled: false,
};

function createSeedData() {
  return {
    savedAddresses: defaultAddress,
    paymentMethods: defaultPaymentMethods,
    favouriteRestaurantIds: [],
    promoCodes: defaultPromoCodes,
    reviews: defaultReviews,
    notificationSettings: defaultNotificationSettings,
    searchHistory: [],
  };
}

function normalizeArray<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function CustomerDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(defaultAddress);
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>(defaultPaymentMethods);
  const [favouriteRestaurantIds, setFavouriteRestaurantIds] = useState<string[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(defaultPromoCodes);
  const [reviews, setReviews] = useState<CustomerReview[]>(defaultReviews);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    if (!user) {
      const seed = createSeedData();
      setSavedAddresses(seed.savedAddresses);
      setPaymentMethods(seed.paymentMethods);
      setFavouriteRestaurantIds(seed.favouriteRestaurantIds);
      setPromoCodes(seed.promoCodes);
      setReviews(seed.reviews);
      setNotificationSettings(seed.notificationSettings);
      setSearchHistory(seed.searchHistory);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const seed = createSeedData();

      // Try Supabase first
      const supabaseData = await loadSupabaseCustomerData(user.id);
      if (supabaseData && !cancelled) {
        setSavedAddresses(supabaseData.savedAddresses);
        setPaymentMethods(supabaseData.paymentMethods);
        setFavouriteRestaurantIds(supabaseData.favouriteRestaurantIds);
        setPromoCodes(supabaseData.promoCodes);
        setReviews(supabaseData.reviews);
        setNotificationSettings({ ...seed.notificationSettings, ...supabaseData.notificationSettings });
        setSearchHistory(supabaseData.searchHistory);
        return;
      }

      // No Supabase data yet — use seed defaults
      if (cancelled) return;
      setSavedAddresses(seed.savedAddresses);
      setPaymentMethods(seed.paymentMethods);
      setFavouriteRestaurantIds(seed.favouriteRestaurantIds);
      setPromoCodes(seed.promoCodes);
      setReviews(seed.reviews);
      setNotificationSettings(seed.notificationSettings);
      setSearchHistory(seed.searchHistory);
    };

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persist = (patch: Record<string, unknown>) => {
    if (!user) return;

    // Save to Supabase
    const supabasePatch: Record<string, unknown> = {};
    if (patch.savedAddresses !== undefined) supabasePatch.savedAddresses = patch.savedAddresses;
    if (patch.paymentMethods !== undefined) supabasePatch.paymentMethods = patch.paymentMethods;
    if (patch.favouriteRestaurantIds !== undefined) supabasePatch.favouriteRestaurantIds = patch.favouriteRestaurantIds;
    if (patch.promoCodes !== undefined) supabasePatch.promoCodes = patch.promoCodes;
    if (patch.reviews !== undefined) supabasePatch.reviews = patch.reviews;
    if (patch.notificationSettings !== undefined) supabasePatch.notificationSettings = patch.notificationSettings;

    if (Object.keys(supabasePatch).length) {
      saveSupabaseCustomerData(user.id, supabasePatch as Partial<import('@/services/supabaseCustomerData').SupabaseCustomerProfileData>).catch(() => undefined);
    }

    if (patch.searchHistory !== undefined) {
      saveSupabaseSearchHistory(user.id, patch.searchHistory as SearchHistoryItem[]).catch(() => undefined);
    }

    // Supabase-only — no Firebase fallback
  };

  const setDefaultAddress = (addressId: string) => {
    setSavedAddresses(prev => {
      const next = prev.map(address => ({ ...address, isDefault: address.id === addressId }));
      persist({ savedAddresses: next });
      return next;
    });
  };

  const addSavedAddress = (address: Omit<SavedAddress, 'id'>) => {
    setSavedAddresses(prev => {
      const nextAddress = { ...address, id: `addr-${Date.now()}` };
      const next = address.isDefault
        ? [...prev.map(item => ({ ...item, isDefault: false })), nextAddress]
        : [...prev, nextAddress];
      persist({ savedAddresses: next });
      return next;
    });
  };

  const setDefaultPaymentMethod = (paymentMethodId: string) => {
    setPaymentMethods(prev => {
      const next = prev.map(method => ({ ...method, isDefault: method.id === paymentMethodId }));
      persist({ paymentMethods: next });
      return next;
    });
  };

  const toggleFavouriteRestaurant = (restaurantId: string) => {
    setFavouriteRestaurantIds(prev => {
      const next = prev.includes(restaurantId) ? prev.filter(id => id !== restaurantId) : [...prev, restaurantId];
      persist({ favouriteRestaurantIds: next });
      return next;
    });
  };

  const redeemPromoCode = (code: string) => {
    const normalized = code.trim().toUpperCase();
    const match = promoCodes.find(promo => promo.code === normalized && !promo.used);

    if (!match) return null;

    const next = promoCodes.map(promo => promo.id === match.id ? { ...promo, used: true } : promo);
    setPromoCodes(next);
    persist({ promoCodes: next });
    return match;
  };

  const addReview = (review: Omit<CustomerReview, 'id' | 'createdAt'>) => {
    setReviews(prev => {
      const next = [{ ...review, id: `review-${Date.now()}`, createdAt: new Date().toISOString() }, ...prev];
      persist({ reviews: next });
      return next;
    });
  };

  const updateNotificationSetting = (key: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => {
      const next = { ...prev, [key]: value };
      persist({ notificationSettings: next });
      return next;
    });
  };

  const enablePushNotifications = async () => {
    if (!user) return { enabled: false, token: null, reason: 'error' as const, message: 'Sign in before enabling notifications.' };
    const outcome = await requestPushNotificationRegistration(user.id, true);
    updateNotificationSetting('pushEnabled', outcome.enabled);
    return outcome;
  };

  const sendLocalNotification = async (title: string, body: string) => {
    if (!notificationSettings.pushEnabled) return;
    const notification = { title, body, createdAt: new Date().toISOString() };
    persist({ lastNotification: notification });

    // Also save to Supabase
    if (user) {
      saveSupabaseLastNotification(user.id, notification).catch(() => undefined);
    }
  };

  const addSearchHistory = (query: string) => {
    const normalized = query.trim().replace(/\s+/g, ' ');
    if (normalized.length < 2) return;

    setSearchHistory(prev => {
      const next = [
        { query: normalized, createdAt: new Date().toISOString() },
        ...prev.filter(item => item.query.toLowerCase() !== normalized.toLowerCase()),
      ].slice(0, 10);
      persist({ searchHistory: next });
      return next;
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    persist({ searchHistory: [] });
  };

  const value = useMemo(
    () => ({
      savedAddresses,
      paymentMethods,
      favouriteRestaurantIds,
      promoCodes,
      reviews,
      notificationSettings,
      searchHistory,
      setDefaultAddress,
      addSavedAddress,
      setDefaultPaymentMethod,
      toggleFavouriteRestaurant,
      redeemPromoCode,
      addReview,
      updateNotificationSetting,
      enablePushNotifications,
      sendLocalNotification,
      addSearchHistory,
      clearSearchHistory,
    }),
    [savedAddresses, paymentMethods, favouriteRestaurantIds, promoCodes, reviews, notificationSettings, searchHistory]
  );

  return <CustomerDataContext.Provider value={value}>{children}</CustomerDataContext.Provider>;
}
