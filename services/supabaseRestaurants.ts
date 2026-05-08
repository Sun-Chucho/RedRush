import { MenuItem, MOCK_RESTAURANTS, Restaurant } from '@/constants/mockData';
import { isSupabaseConfigured, supabase } from './supabase';

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

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80';

export function shouldUseSupabaseRestaurants() {
  return isSupabaseConfigured;
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

export async function ensureSupabaseVendorRestaurant(user: {
  id: string;
  name?: string;
  address?: string;
  role?: string;
  restaurantId?: string;
}) {
  if (!shouldUseSupabaseRestaurants()) return null;
  if (user.role !== 'vendor') throw new Error('Only vendor accounts can manage restaurant menus.');

  const existingId = user.restaurantId || null;
  if (existingId) {
    const { data } = await supabase.from('restaurants').select('id').eq('id', existingId).maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data: owned } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).maybeSingle();
  if (owned?.id) return owned.id as string;

  const template = MOCK_RESTAURANTS[0];
  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      owner_id: user.id,
      name: user.name || 'My Restaurant',
      cuisine: template.cuisine,
      delivery_time: template.deliveryTime,
      delivery_fee: template.deliveryFee,
      min_order: template.minOrder,
      image: template.image,
      cover_image: template.coverImage,
      address: user.address || 'Restaurant address',
      is_open: true,
      distance: '0 km',
      categories: ['Meals', 'Drinks'],
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function createSupabaseMenuItem(restaurantId: string, item: MenuItemInput) {
  if (!shouldUseSupabaseRestaurants()) return false;

  const { error } = await supabase
    .from('menu_items')
    .insert({ restaurant_id: restaurantId, ...toMenuPayload(item) });

  if (error) throw error;
  return true;
}

export async function updateSupabaseMenuItem(restaurantId: string, itemId: string, item: MenuItemUpdate) {
  if (!shouldUseSupabaseRestaurants()) return false;

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

  const { error } = await supabase.from('menu_items').delete().eq('id', itemId).eq('restaurant_id', restaurantId);

  if (error) throw error;
  return true;
}
