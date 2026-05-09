import { Order, OrderItem } from '@/constants/mockData';
import { CartItem } from '@/contexts/CartContext';
import type { AuthUser } from '@/contexts/AuthContext';
import { CreateOrderInput } from './backend';
import { isSupabaseConfigured, supabase } from './supabase';

type OrderRow = {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  restaurant_id: string;
  restaurant_name: string;
  subtotal: number;
  delivery_fee: number;
  service_charge: number;
  discount: number;
  total: number;
  promo_code: string | null;
  status: Order['status'];
  payment_method: string;
  address: string;
  rider_id: string | null;
  rider_name: string | null;
  prep_time: number | null;
  delivery_time: number | null;
  estimated_delivery: string | null;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  order_items?: OrderItemRow[];
};

type OrderItemRow = {
  id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  name: string;
  description: string;
  price: number;
  image: string | null;
  category: string;
  quantity: number;
  preparation_time: number;
};

type MenuItemRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  category: string;
  available: boolean;
  preparation_time: number;
};

type RestaurantRow = {
  id: string;
  name: string;
  is_open: boolean;
  min_order: number;
  delivery_fee: number;
};

export function shouldUseSupabaseOrders() {
  return isSupabaseConfigured;
}

async function getSupabaseUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

function toIsoDate(value: string | null | undefined, fallback = Date.now()) {
  return value || new Date(fallback).toISOString();
}

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    restaurantId: row.restaurant_id,
    quantity: row.quantity,
    menuItem: {
      id: row.menu_item_id || row.id,
      name: row.name,
      description: row.description,
      price: Number(row.price || 0),
      image: row.image || '',
      category: row.category,
      available: true,
      preparationTime: Number(row.preparation_time || 15),
    },
  };
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name || undefined,
    customerPhone: row.customer_phone || undefined,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    items: (row.order_items || []).map(toOrderItem),
    subtotal: Number(row.subtotal || 0),
    total: Number(row.total || 0),
    deliveryFee: Number(row.delivery_fee || 0),
    serviceCharge: Number(row.service_charge || 0),
    discount: Number(row.discount || 0),
    promoCode: row.promo_code || undefined,
    status: row.status || 'pending',
    paymentMethod: row.payment_method,
    address: row.address,
    createdAt: toIsoDate(row.created_at),
    estimatedDelivery: toIsoDate(row.estimated_delivery, Date.now() + 40 * 60000),
    riderId: row.rider_id || undefined,
    riderName: row.rider_name || undefined,
    prepTime: row.prep_time || undefined,
    deliveryTime: row.delivery_time || undefined,
    acceptedAt: row.accepted_at || undefined,
    preparingAt: row.preparing_at || undefined,
    readyAt: row.ready_at || undefined,
    pickedUpAt: row.picked_up_at || undefined,
    deliveredAt: row.delivered_at || undefined,
    cancelledAt: row.cancelled_at || undefined,
  };
}

export async function fetchSupabaseOrders(user: AuthUser | null, vendorRestaurantId?: string) {
  if (!user || !shouldUseSupabaseOrders()) return null;

  const supabaseUserId = await getSupabaseUserId();
  if (!supabaseUserId || supabaseUserId !== user.id) return null;

  let queryBuilder = supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (user.role === 'customer') {
    queryBuilder = queryBuilder.eq('customer_id', user.id);
  } else if (user.role === 'vendor') {
    if (!vendorRestaurantId) return [];
    queryBuilder = queryBuilder.eq('restaurant_id', vendorRestaurantId);
  } else if (user.role === 'rider') {
    queryBuilder = queryBuilder.or(`status.eq.ready,rider_id.eq.${user.id}`);
  }

  const { data, error } = await queryBuilder;
  if (error) throw error;

  return (data || []).map(row => toOrder(row as OrderRow));
}

export async function createSupabaseOrder(payload: CreateOrderInput) {
  if (!shouldUseSupabaseOrders()) return null;

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, phone, role')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;
  if (profile.role && profile.role !== 'customer') throw new Error('Only customers can place orders.');

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name, is_open, min_order, delivery_fee')
    .eq('id', payload.restaurantId)
    .single();

  if (restaurantError) throw restaurantError;
  const restaurantRow = restaurant as RestaurantRow;
  if (!restaurantRow.is_open) throw new Error('Restaurant is currently closed.');

  const itemIds = payload.items.map(item => item.menuItemId);
  const { data: menuRows, error: menuError } = await supabase
    .from('menu_items')
    .select('id, name, description, price, image, category, available, preparation_time')
    .eq('restaurant_id', payload.restaurantId)
    .in('id', itemIds);

  if (menuError) throw menuError;

  const menuById = new Map((menuRows || []).map(item => [(item as MenuItemRow).id, item as MenuItemRow]));
  let subtotal = 0;
  const orderItems = payload.items.map(item => {
    const menuItem = menuById.get(item.menuItemId);
    if (!menuItem) throw new Error('A menu item is no longer available.');
    if (menuItem.available === false) throw new Error(`${menuItem.name} is unavailable.`);

    const quantity = Math.min(20, Math.max(1, Math.round(Number(item.quantity) || 1)));
    const price = Math.max(0, Math.round(Number(menuItem.price) || 0));
    subtotal += price * quantity;

    return { menuItem, quantity };
  });

  if (subtotal < Number(restaurantRow.min_order || 0)) {
    throw new Error(`Minimum order is ${restaurantRow.min_order}.`);
  }

  const deliveryFee = Math.max(0, Math.round(Number(restaurantRow.delivery_fee) || 500));
  const serviceCharge = Math.round(subtotal * 0.03);
  const promoCode = (payload.promoCode || '').toUpperCase();
  const promoDiscounts: Record<string, number> = { WELCOME20: 20, RUSH10: 10 };
  const discount = Math.round(subtotal * ((promoDiscounts[promoCode] || 0) / 100));
  const estimatedDelivery = new Date(Date.now() + 40 * 60000).toISOString();

  const { data: createdOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      customer_name: profile.name || user.email || 'Customer',
      customer_phone: profile.phone || '',
      restaurant_id: payload.restaurantId,
      restaurant_name: restaurantRow.name,
      subtotal,
      delivery_fee: deliveryFee,
      service_charge: serviceCharge,
      discount,
      total: Math.max(0, subtotal - discount) + deliveryFee + serviceCharge,
      promo_code: promoDiscounts[promoCode] ? promoCode : null,
      status: 'pending',
      payment_method: payload.paymentMethod,
      payment_status: payload.paymentMethod.toLowerCase().includes('cash') ? 'collect_on_delivery' : 'pending',
      address: payload.address,
      estimated_delivery: estimatedDelivery,
    })
    .select('*')
    .single();

  if (orderError) throw orderError;

  const itemPayloads = orderItems.map(({ menuItem, quantity }) => ({
    order_id: createdOrder.id,
    menu_item_id: menuItem.id,
    restaurant_id: payload.restaurantId,
    name: menuItem.name,
    description: menuItem.description || '',
    price: Math.max(0, Math.round(Number(menuItem.price) || 0)),
    image: menuItem.image,
    category: menuItem.category || 'Meals',
    quantity,
    preparation_time: Math.max(1, Math.round(Number(menuItem.preparation_time) || 15)),
  }));

  const { data: createdItems, error: itemsError } = await supabase
    .from('order_items')
    .insert(itemPayloads)
    .select('*');

  if (itemsError) throw itemsError;

  return toOrder({ ...(createdOrder as OrderRow), order_items: createdItems as OrderItemRow[] });
}

export async function updateSupabaseOrderStatus(orderId: string, status: Order['status']) {
  if (!shouldUseSupabaseOrders()) return false;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return false;

  const timestampField: Record<string, string | undefined> = {
    accepted: 'accepted_at',
    preparing: 'preparing_at',
    ready: 'ready_at',
    picked_up: 'picked_up_at',
    delivered: 'delivered_at',
    cancelled: 'cancelled_at',
  };
  const patch: Record<string, unknown> = { status };

  if (timestampField[status]) {
    patch[timestampField[status] as string] = new Date().toISOString();
  }

  if (status === 'picked_up') {
    const { data: profile } = await supabase.from('profiles').select('name').eq('id', authData.user.id).maybeSingle();
    patch.rider_id = authData.user.id;
    patch.rider_name = profile?.name || authData.user.email || 'Rider';
  }

  const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
  if (error) throw error;

  return true;
}

export async function updateSupabaseOrderTiming(
  orderId: string,
  prepMinutes: number,
  deliveryMinutes: number,
  estimatedDelivery: string
) {
  if (!shouldUseSupabaseOrders()) return false;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return false;

  const { error } = await supabase
    .from('orders')
    .update({
      prep_time: prepMinutes,
      delivery_time: deliveryMinutes,
      estimated_delivery: estimatedDelivery,
    })
    .eq('id', orderId);

  if (error) throw error;
  return true;
}
