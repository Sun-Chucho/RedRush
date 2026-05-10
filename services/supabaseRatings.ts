/**
 * Review/Rating service using Supabase
 */
import { isSupabaseConfigured, supabase } from './supabase';

export interface Review {
  id: string;
  orderId: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  rating: number;
  foodRating: number;
  deliveryRating: number;
  comment: string;
  createdAt: string;
}

export interface SubmitReviewParams {
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  rating: number;
  foodRating: number;
  deliveryRating: number;
  comment: string;
}

/** Submit a post-delivery review */
export async function submitReview(
  userId: string,
  params: SubmitReviewParams
): Promise<{ data: Review | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Backend not connected' };
  }

  const { data, error } = await supabase
    .from('reviews')
    .upsert(
      {
        order_id: params.orderId,
        user_id: userId,
        restaurant_id: params.restaurantId,
        restaurant_name: params.restaurantName,
        rating: params.rating,
        food_rating: params.foodRating,
        delivery_rating: params.deliveryRating,
        comment: params.comment.trim(),
      },
      { onConflict: 'order_id,user_id' }
    )
    .select('*')
    .single();

  if (error) {
    console.warn('[ratings] submitReview error:', error.message);
    return { data: null, error: error.message };
  }

  return { data: mapReview(data), error: null };
}

/** Check if user has already reviewed an order */
export async function hasReviewedOrder(
  orderId: string,
  userId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { count } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId)
    .eq('user_id', userId);

  return (count || 0) > 0;
}

/** Fetch reviews for a restaurant */
export async function fetchRestaurantReviews(
  restaurantId: string,
  limit = 20
): Promise<Review[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[ratings] fetchRestaurantReviews error:', error.message);
    return [];
  }

  return (data || []).map(mapReview);
}

/** Get average rating for a restaurant */
export async function getRestaurantAverageRating(
  restaurantId: string
): Promise<{ average: number; count: number }> {
  if (!isSupabaseConfigured) return { average: 0, count: 0 };

  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('restaurant_id', restaurantId);

  if (error || !data || data.length === 0) return { average: 0, count: 0 };

  const sum = data.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / data.length) * 10) / 10, count: data.length };
}

function mapReview(row: Record<string, any>): Review {
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name || '',
    rating: row.rating || 0,
    foodRating: row.food_rating || 0,
    deliveryRating: row.delivery_rating || 0,
    comment: row.comment || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}
