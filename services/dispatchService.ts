/**
 * Dispatch Service — Supabase-only rider assignment & availability
 */
import { isSupabaseConfigured, supabase } from './supabase';
import { sendRiderAssignedNotification } from './notifications';

export interface OnlineRider {
  riderId: string;
  riderName: string;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string | null;
}

const RIDER_LOCATION_FRESHNESS_MS = 2 * 60 * 1000;

/**
 * Fetch all currently online riders from rider_locations table
 */
export async function getOnlineRiders(): Promise<OnlineRider[]> {
  if (!isSupabaseConfigured) return [];

  const freshAfter = new Date(Date.now() - RIDER_LOCATION_FRESHNESS_MS).toISOString();
  const { data, error } = await supabase
    .from('rider_locations')
    .select('rider_id, latitude, longitude, updated_at, profiles(name)')
    .eq('is_online', true)
    .gte('updated_at', freshAfter)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('[dispatchService] getOnlineRiders error:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    riderId: row.rider_id,
    riderName: row.profiles?.name || 'Rider',
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    updatedAt: row.updated_at ?? null,
  }));
}

/**
 * Assign a rider to an order (admin dispatch or auto-dispatch)
 */
export async function assignRiderToOrder(
  orderId: string,
  riderId: string,
  riderName: string,
  restaurantName: string,
  customerAddress: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const { error } = await supabase
    .from('orders')
    .update({
      rider_id: riderId,
      rider_name: riderName,
      status: 'assigned',
    })
    .eq('id', orderId);

  if (error) {
    console.warn('[dispatchService] assignRiderToOrder error:', error.message);
    return false;
  }

  // Notify the rider
  await sendRiderAssignedNotification(restaurantName, customerAddress).catch(() => undefined);
  return true;
}

/**
 * Set rider online/offline status in rider_locations
 */
export async function setRiderOnlineStatus(
  riderId: string,
  isOnline: boolean,
  coords?: { latitude: number; longitude: number; heading?: number; speed?: number }
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const payload: Record<string, unknown> = {
    rider_id: riderId,
    is_online: isOnline,
    updated_at: new Date().toISOString(),
  };

  if (coords) {
    payload.latitude = coords.latitude;
    payload.longitude = coords.longitude;
    payload.heading = coords.heading ?? 0;
    payload.speed = coords.speed ?? 0;
  }

  const { error } = await supabase.from('rider_locations').upsert(payload);
  if (error) {
    console.warn('[dispatchService] setRiderOnlineStatus error:', error.message);
    return false;
  }

  // GPS updates arrive every few seconds; only mirror explicit online/offline
  // transitions to the profile so live tracking performs one write per point.
  if (!coords) {
    const { error: profileError } = await supabase
      .from('rider_profiles')
      .update({ is_online: isOnline })
      .eq('user_id', riderId);

    if (profileError) {
      console.warn('[dispatchService] rider profile online update error:', profileError.message);
    }
  }

  return true;
}

/**
 * Find the nearest available online rider to given coordinates
 */
export function findNearestRider(
  riders: OnlineRider[],
  targetLat: number,
  targetLon: number
): OnlineRider | null {
  if (!riders.length) return null;

  let nearest: OnlineRider | null = null;
  let minDist = Infinity;

  for (const rider of riders) {
    if (rider.latitude == null || rider.longitude == null) continue;
    const dist = haversineKm(rider.latitude, rider.longitude, targetLat, targetLon);
    if (dist < minDist) {
      minDist = dist;
      nearest = rider;
    }
  }

  return nearest;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
