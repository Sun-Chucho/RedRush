/**
 * Rating & review service — Supabase only
 */
import { isSupabaseConfigured, supabase } from './supabase';

export interface Review {
  id: string;
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  customerId: string;
  rating: number;        // 1–5
  foodRating: number;    // 1–5
  deliveryRating: number;// 1–5
  comment: string;
  createdAt: string;
}

export interface SubmitReviewPayload {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  rating: number;
  foodRating: number;
  deliveryRating: number;
  comment: string;
}

/** Submit a new review */
export async function submitReview(
  customerId: string,
  payload: SubmitReviewPayload
): Promise<Review | null> {
  if (!isSupabaseConfigured) return null;

  // Prevent duplicate reviews for same order
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', payload.orderId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (existing) return null; // already reviewed

  const overallRating = Math.round((payload.rating + payload.foodRating + payload.deliveryRating) / 3);

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      order_id: payload.orderId,
      restaurant_id: payload.restaurantId,
      restaurant_name: payload.restaurantName,
      customer_id: customerId,
      rating: overallRating,
      food_rating: payload.foodRating,
      delivery_rating: payload.deliveryRating,
      comment: payload.comment.trim(),
    })
    .select('*')
    .single();

  if (error) {
    console.warn('[ratings] submitReview error:', error.message);
    return null;
  }

  // Update restaurant average_rating
  updateRestaurantRating(payload.restaurantId).catch(() => undefined);

  return mapRow(data);
}

/** Fetch reviews for a restaurant */
export async function fetchRestaurantReviews(restaurantId: string): Promise<Review[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return (data || []).map(mapRow);
}

/** Check if a customer already reviewed an order */
export async function hasReviewedOrder(orderId: string, customerId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .eq('customer_id', customerId)
    .maybeSingle();
  return !!data;
}

async function updateRestaurantRating(restaurantId: string) {
  if (!isSupabaseConfigured) return;

  const { data } = await supabase
    .from('reviews')
    .select('rating')
    .eq('restaurant_id', restaurantId);

  if (!data || !data.length) return;

  const avg = data.reduce((s, r) => s + (r.rating || 0), 0) / data.length;

  await supabase
    .from('restaurants')
    .update({
      rating: Math.round(avg * 10) / 10,
      review_count: data.length,
    })
    .eq('id', restaurantId);
}

function mapRow(row: Record<string, any>): Review {
  return {
    id: row.id,
    orderId: row.order_id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name || '',
    customerId: row.customer_id,
    rating: row.rating || 0,
    foodRating: row.food_rating || 0,
    deliveryRating: row.delivery_rating || 0,
    comment: row.comment || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}
