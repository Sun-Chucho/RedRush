import { isSupabaseConfigured, supabase } from './supabase';
import type {
  SavedAddress,
  SavedPaymentMethod,
  PromoCode,
  CustomerReview,
  NotificationSettings,
} from '@/contexts/CustomerDataContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function shouldUseSupabaseCustomerData(): boolean {
  return isSupabaseConfigured;
}

export interface SupabaseCustomerProfileData {
  savedAddresses: SavedAddress[];
  paymentMethods: SavedPaymentMethod[];
  favouriteRestaurantIds: string[];
  promoCodes: PromoCode[];
  reviews: CustomerReview[];
  notificationSettings: NotificationSettings;
  searchHistory: SearchHistoryItem[];
}

export interface SearchHistoryItem {
  query: string;
  createdAt: string;
}

// ── Load ─────────────────────────────────────────────────────────────────────

export async function loadSupabaseCustomerData(
  userId: string
): Promise<SupabaseCustomerProfileData | null> {
  if (!shouldUseSupabaseCustomerData()) return null;

  const { data, error } = await supabase!
    .from('customer_profile_data')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;

  // Not found – will be created on first save
  if (!data) return null;

  const notificationSettings = (data.notification_settings as (NotificationSettings & { searchHistory?: SearchHistoryItem[] })) || {
    orderUpdates: true,
    promos: true,
    account: true,
    pushEnabled: false,
  };

  return {
    savedAddresses: Array.isArray(data.saved_addresses) ? data.saved_addresses : [],
    paymentMethods: Array.isArray(data.payment_methods) ? data.payment_methods : [],
    favouriteRestaurantIds: Array.isArray(data.favourite_restaurant_ids)
      ? data.favourite_restaurant_ids
      : [],
    promoCodes: Array.isArray(data.promo_codes) ? data.promo_codes : [],
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    notificationSettings,
    searchHistory: Array.isArray(notificationSettings.searchHistory) ? notificationSettings.searchHistory : [],
  };
}

// ── Save (upsert) ────────────────────────────────────────────────────────────

export async function saveSupabaseCustomerData(
  userId: string,
  patch: Partial<SupabaseCustomerProfileData>
): Promise<boolean> {
  if (!shouldUseSupabaseCustomerData()) return false;

  const row: Record<string, unknown> = { user_id: userId };

  if (patch.savedAddresses !== undefined) row.saved_addresses = patch.savedAddresses;
  if (patch.paymentMethods !== undefined) row.payment_methods = patch.paymentMethods;
  if (patch.favouriteRestaurantIds !== undefined) row.favourite_restaurant_ids = patch.favouriteRestaurantIds;
  if (patch.promoCodes !== undefined) row.promo_codes = patch.promoCodes;
  if (patch.reviews !== undefined) row.reviews = patch.reviews;
  if (patch.notificationSettings !== undefined) row.notification_settings = patch.notificationSettings;

  const { error } = await supabase!
    .from('customer_profile_data')
    .upsert(row, { onConflict: 'user_id' });

  return !error;
}

// ── Save last notification ───────────────────────────────────────────────────

export async function saveSupabaseLastNotification(
  userId: string,
  notification: { title: string; body: string; createdAt: string }
): Promise<boolean> {
  if (!shouldUseSupabaseCustomerData()) return false;

  const { error } = await supabase!
    .from('customer_profile_data')
    .upsert(
      { user_id: userId, last_notification: notification },
      { onConflict: 'user_id' }
    );

  return !error;
}

export async function saveSupabaseSearchHistory(
  userId: string,
  searchHistory: SearchHistoryItem[]
): Promise<boolean> {
  if (!shouldUseSupabaseCustomerData()) return false;

  const { data } = await supabase!
    .from('customer_profile_data')
    .select('notification_settings')
    .eq('user_id', userId)
    .maybeSingle();

  const currentSettings = (data?.notification_settings || {}) as Record<string, unknown>;
  const { error } = await supabase!
    .from('customer_profile_data')
    .upsert(
      {
        user_id: userId,
        notification_settings: {
          orderUpdates: true,
          promos: true,
          account: true,
          pushEnabled: false,
          ...currentSettings,
          searchHistory,
        },
      },
      { onConflict: 'user_id' }
    );

  return !error;
}

// ── Push token registration ──────────────────────────────────────────────────

export async function registerSupabasePushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web' | 'unknown' = 'unknown'
): Promise<boolean> {
  if (!shouldUseSupabaseCustomerData()) return false;

  const { error } = await supabase!
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform },
      { onConflict: 'user_id,token' }
    );

  return !error;
}
