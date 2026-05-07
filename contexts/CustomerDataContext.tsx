import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { MOCK_RESTAURANTS } from '@/constants/mockData';
import { db } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';

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
  setDefaultAddress: (addressId: string) => void;
  addSavedAddress: (address: Omit<SavedAddress, 'id'>) => void;
  setDefaultPaymentMethod: (paymentMethodId: string) => void;
  toggleFavouriteRestaurant: (restaurantId: string) => void;
  redeemPromoCode: (code: string) => PromoCode | null;
  addReview: (review: Omit<CustomerReview, 'id' | 'createdAt'>) => void;
  updateNotificationSetting: (key: keyof NotificationSettings, value: boolean) => void;
  enablePushNotifications: () => Promise<boolean>;
  sendLocalNotification: (title: string, body: string) => Promise<void>;
}

export const CustomerDataContext = createContext<CustomerDataContextType | undefined>(undefined);

const defaultAddress: SavedAddress = {
  id: 'home',
  label: 'Home',
  details: '45 Saka Tinubu Street, Victoria Island',
  isDefault: true,
};

const defaultPaymentMethods: SavedPaymentMethod[] = [
  { id: 'momo', label: 'MTN Mobile Money', detail: 'Pay with MTN MoMo', type: 'mobile_money', isDefault: true },
  { id: 'airtel', label: 'Airtel Money', detail: 'Pay with Airtel Money', type: 'mobile_money' },
  { id: 'card', label: 'Debit/Credit Card', detail: 'Add card at checkout', type: 'card' },
  { id: 'cash', label: 'Cash on Delivery', detail: 'Pay when your food arrives', type: 'cash' },
];

const defaultPromoCodes: PromoCode[] = [
  {
    id: 'welcome20',
    code: 'WELCOME20',
    title: '20% off your next order',
    description: 'Valid on food subtotal before delivery and service charges.',
    discountPercent: 20,
    expiresAt: '2026-12-31',
  },
  {
    id: 'rush10',
    code: 'RUSH10',
    title: '10% rush-hour discount',
    description: 'Use on lunch and dinner orders above the minimum restaurant order.',
    discountPercent: 10,
    expiresAt: '2026-09-30',
  },
];

const defaultReviews: CustomerReview[] = [
  {
    id: 'review-r1',
    restaurantId: 'r1',
    restaurantName: 'Chicken Republic',
    rating: 5,
    comment: 'Fast delivery and the food arrived hot.',
    createdAt: '2026-05-04T16:00:00Z',
  },
];

const defaultNotificationSettings: NotificationSettings = {
  orderUpdates: true,
  promos: true,
  account: true,
  pushEnabled: false,
};

function createSeedData() {
  return {
    savedAddresses: [defaultAddress],
    paymentMethods: defaultPaymentMethods,
    favouriteRestaurantIds: MOCK_RESTAURANTS.filter(r => r.isOpen).slice(0, 2).map(r => r.id),
    promoCodes: defaultPromoCodes,
    reviews: defaultReviews,
    notificationSettings: defaultNotificationSettings,
  };
}

function normalizeArray<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function CustomerDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([defaultAddress]);
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>(defaultPaymentMethods);
  const [favouriteRestaurantIds, setFavouriteRestaurantIds] = useState<string[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(defaultPromoCodes);
  const [reviews, setReviews] = useState<CustomerReview[]>(defaultReviews);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);

  useEffect(() => {
    if (!user) {
      const seed = createSeedData();
      setSavedAddresses(seed.savedAddresses);
      setPaymentMethods(seed.paymentMethods);
      setFavouriteRestaurantIds(seed.favouriteRestaurantIds);
      setPromoCodes(seed.promoCodes);
      setReviews(seed.reviews);
      setNotificationSettings(seed.notificationSettings);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const seed = createSeedData();
      const ref = doc(db, 'users', user.id, 'profileData', 'customer');
      const snapshot = await getDoc(ref);
      const data = snapshot.exists() ? snapshot.data() : {};

      if (cancelled) return;

      setSavedAddresses(normalizeArray<SavedAddress>(data.savedAddresses, seed.savedAddresses));
      setPaymentMethods(normalizeArray<SavedPaymentMethod>(data.paymentMethods, seed.paymentMethods));
      setFavouriteRestaurantIds(normalizeArray<string>(data.favouriteRestaurantIds, seed.favouriteRestaurantIds));
      setPromoCodes(normalizeArray<PromoCode>(data.promoCodes, seed.promoCodes));
      setReviews(normalizeArray<CustomerReview>(data.reviews, seed.reviews));
      setNotificationSettings({ ...seed.notificationSettings, ...(data.notificationSettings as Partial<NotificationSettings> | undefined) });

      if (!snapshot.exists()) {
        await setDoc(ref, { ...seed, updatedAt: serverTimestamp() });
      }
    };

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persist = (patch: Record<string, unknown>) => {
    if (!user) return;
    setDoc(doc(db, 'users', user.id, 'profileData', 'customer'), { ...patch, updatedAt: serverTimestamp() }, { merge: true }).catch(() => undefined);
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
    updateNotificationSetting('pushEnabled', true);
    return true;
  };

  const sendLocalNotification = async (title: string, body: string) => {
    if (!notificationSettings.pushEnabled) return;
    persist({
      lastNotification: {
        title,
        body,
        createdAt: new Date().toISOString(),
      },
    });
  };

  const value = useMemo(
    () => ({
      savedAddresses,
      paymentMethods,
      favouriteRestaurantIds,
      promoCodes,
      reviews,
      notificationSettings,
      setDefaultAddress,
      addSavedAddress,
      setDefaultPaymentMethod,
      toggleFavouriteRestaurant,
      redeemPromoCode,
      addReview,
      updateNotificationSetting,
      enablePushNotifications,
      sendLocalNotification,
    }),
    [savedAddresses, paymentMethods, favouriteRestaurantIds, promoCodes, reviews, notificationSettings]
  );

  return <CustomerDataContext.Provider value={value}>{children}</CustomerDataContext.Provider>;
}
