import { MenuItem, Restaurant } from '@/constants/mockData';
import { isSupabaseConfigured, supabase } from './supabase';

export type Category = {
  id: string;
  name: string;
  image: string;
};

type RestaurantRow = {
  id: string;
  owner_id: string | null;
  name: string | null;
  cuisine: string | null;
  rating: number | null;
  review_count: number | null;
  delivery_time: string | null;
  delivery_fee: number | null;
  min_order: number | null;
  image: string | null;
  cover_image: string | null;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_open: boolean | null;
  distance: string | null;
  promo: string | null;
  categories: string[] | null;
};

type MenuItemRow = {
  id: string;
  restaurant_id: string;
  name: string | null;
  description: string | null;
  price: number | null;
  image: string | null;
  category: string | null;
  available: boolean | null;
  preparation_time: number | null;
};

type MenuItemInput = Omit<MenuItem, 'id'>;
type MenuItemUpdate = Partial<MenuItemInput>;
export type RestaurantLocationInput = {
  latitude: number;
  longitude: number;
  address: string;
};

export type RestaurantProfileUpdate = {
  name?: string;
  cuisine?: string;
  address?: string;
  phone?: string;
  deliveryTime?: string;
  deliveryFee?: number;
  minOrder?: number;
  image?: string;
  coverImage?: string;
  isOpen?: boolean;
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80';

export function shouldUseSupabaseRestaurants() {
  return isSupabaseConfigured;
}

async function requireApprovedVendor() {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error('Please sign in as a vendor.');

  const { data, error } = await supabase
    .from('vendor_profiles')
    .select('approval_status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (data?.approval_status !== 'approved') {
    throw new Error('Your vendor account must be approved before managing live restaurant operations.');
  }
}

function normalizeRestaurant(row: RestaurantRow, menu: MenuItem[]): Restaurant {
  const baseCategories = Array.isArray(row.categories) && row.categories.length ? row.categories : ['Meals', 'Drinks'];
  const categories = Array.from(new Set([...baseCategories, ...menu.map(item => item.category)])).filter(Boolean);

  return {
    id: row.id,
    ownerId: row.owner_id || undefined,
    name: row.name || 'Restaurant',
    cuisine: row.cuisine || 'Fast Food',
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    deliveryTime: row.delivery_time || '25-40 min',
    deliveryFee: Number(row.delivery_fee || 500),
    minOrder: Number(row.min_order || 1000),
    image: row.image || DEFAULT_IMAGE,
    coverImage: row.cover_image || DEFAULT_COVER,
    address: row.address || 'Restaurant address',
    latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
    longitude: typeof row.longitude === 'number' ? row.longitude : undefined,
    isOpen: row.is_open !== false,
    distance: row.distance || '0 km',
    promo: row.promo || undefined,
    categories,
    menu,
  };
}

function normalizeMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    name: row.name || 'Menu item',
    description: row.description || '',
    price: Number(row.price || 0),
    image: row.image || DEFAULT_IMAGE,
    category: row.category || 'Meals',
    available: row.available !== false,
    preparationTime: Number(row.preparation_time || 15),
  };
}

function toMenuPayload(item: MenuItemInput | MenuItemUpdate) {
  const payload: Record<string, unknown> = {};

  if (item.name !== undefined) payload.name = item.name;
  if (item.description !== undefined) payload.description = item.description;
  if (item.price !== undefined) payload.price = Math.max(0, Math.round(Number(item.price) || 0));
  if (item.image !== undefined) payload.image = item.image;
  if (item.category !== undefined) payload.category = item.category;
  if (item.available !== undefined) payload.available = item.available;
  if (item.preparationTime !== undefined) {
    payload.preparation_time = Math.max(1, Math.round(Number(item.preparationTime) || 15));
  }

  return payload;
}

export async function fetchSupabaseRestaurants(): Promise<Restaurant[]> {
  if (!shouldUseSupabaseRestaurants()) return [];

  const { data: restaurants, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: true });

  if (restaurantError) throw restaurantError;

  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('*')
    .order('created_at', { ascending: true });

  if (menuError) throw menuError;

  const menuByRestaurant = (menuItems || []).reduce<Record<string, MenuItem[]>>((acc, row) => {
    const item = normalizeMenuItem(row as MenuItemRow);
    const restaurantId = (row as MenuItemRow).restaurant_id;
    acc[restaurantId] = [...(acc[restaurantId] || []), item];
    return acc;
  }, {});

  return (restaurants || []).map(row =>
    normalizeRestaurant(row as RestaurantRow, menuByRestaurant[(row as RestaurantRow).id] || [])
  );
}

export async function fetchSupabaseCategories(): Promise<Category[]> {
  if (!shouldUseSupabaseRestaurants()) return [];

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, image')
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Failed to fetch categories', error);
    return [];
  }

  return data as Category[];
}

export async function ensureSupabaseVendorRestaurant(user: {
  id: string;
  name?: string;
  address?: string;
  role?: string;
  restaurantId?: string;
}) {
  if (!shouldUseSupabaseRestaurants()) return null;
  if (user.role !== 'vendor') throw new Error('Only vendor accounts can manage restaurant menus.');
  await requireApprovedVendor();

  const existingId = user.restaurantId || null;
  if (existingId) {
    const { data } = await supabase.from('restaurants').select('id').eq('id', existingId).maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data: owned } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).maybeSingle();
  if (owned?.id) return owned.id as string;

  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      owner_id: user.id,
      name: user.name || 'My Restaurant',
      cuisine: 'Restaurant',
      delivery_time: '25-40 min',
      delivery_fee: 0,
      min_order: 0,
      image: null,
      cover_image: null,
      address: user.address || 'Restaurant address',
      is_open: false,
      distance: '0 km',
      categories: ['Meals', 'Drinks'],
    })
    .select('id')
    .single();

  if (error) throw error;
  await supabase.from('profiles').update({ restaurant_id: data.id }).eq('id', user.id).throwOnError();
  await supabase.from('vendor_profiles').update({ restaurant_id: data.id }).eq('user_id', user.id).throwOnError();
  return data.id as string;
}

export async function updateSupabaseVendorRestaurantLocation(
  restaurantId: string,
  location: RestaurantLocationInput
) {
  if (!shouldUseSupabaseRestaurants()) return false;
  await requireApprovedVendor();

  const { error } = await supabase
    .from('restaurants')
    .update({
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      distance: '0 km',
    })
    .eq('id', restaurantId);

  if (error) throw error;
  return true;
}

export async function updateSupabaseVendorRestaurantProfile(restaurantId: string, patch: RestaurantProfileUpdate) {
  if (!shouldUseSupabaseRestaurants()) return false;
  await requireApprovedVendor();

  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.cuisine !== undefined) payload.cuisine = patch.cuisine;
  if (patch.address !== undefined) payload.address = patch.address;
  if (patch.deliveryTime !== undefined) payload.delivery_time = patch.deliveryTime;
  if (patch.deliveryFee !== undefined) payload.delivery_fee = Math.max(0, Math.round(Number(patch.deliveryFee) || 0));
  if (patch.minOrder !== undefined) payload.min_order = Math.max(0, Math.round(Number(patch.minOrder) || 0));
  if (patch.image !== undefined) payload.image = patch.image;
  if (patch.coverImage !== undefined) payload.cover_image = patch.coverImage;
  if (patch.isOpen !== undefined) payload.is_open = patch.isOpen;

  if (!Object.keys(payload).length) return true;

  const { error } = await supabase.from('restaurants').update(payload).eq('id', restaurantId);
  if (error) throw error;
  return true;
}

export async function createSupabaseMenuItem(restaurantId: string, item: MenuItemInput) {
  if (!shouldUseSupabaseRestaurants()) return false;
  await requireApprovedVendor();

  const { error } = await supabase
    .from('menu_items')
    .insert({ restaurant_id: restaurantId, ...toMenuPayload(item) });

  if (error) throw error;
  return true;
}

export async function updateSupabaseMenuItem(restaurantId: string, itemId: string, item: MenuItemUpdate) {
  if (!shouldUseSupabaseRestaurants()) return false;
  await requireApprovedVendor();

  const { error } = await supabase
    .from('menu_items')
    .update(toMenuPayload(item))
    .eq('id', itemId)
    .eq('restaurant_id', restaurantId);

  if (error) throw error;
  return true;
}

export async function deleteSupabaseMenuItem(restaurantId: string, itemId: string) {
  if (!shouldUseSupabaseRestaurants()) return false;
  await requireApprovedVendor();

  const { error } = await supabase.from('menu_items').delete().eq('id', itemId).eq('restaurant_id', restaurantId);

  if (error) throw error;
  return true;
}
