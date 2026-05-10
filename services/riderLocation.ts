/**
 * Rider real-time location service — Supabase only
 * Publishes GPS to rider_locations table; customers subscribe via Supabase Realtime.
 */
import * as Location from 'expo-location';
import { isSupabaseConfigured, supabase } from './supabase';
import { setRiderOnlineStatus } from './dispatchService';

export interface RiderCoords {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt?: string;
}

let _locationSubscription: Location.LocationSubscription | null = null;

/**
 * Start publishing rider GPS to Supabase rider_locations every 4 s / 10 m
 */
export async function startRiderTracking(riderId: string): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;

  stopRiderTracking(); // clear any previous watcher

  _locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 4000,
      distanceInterval: 10,
    },
    async location => {
      const { latitude, longitude, heading, speed } = location.coords;
      await setRiderOnlineStatus(riderId, true, {
        latitude,
        longitude,
        heading: heading ?? 0,
        speed: speed ?? 0,
      }).catch(() => undefined);
    }
  );

  return true;
}

/**
 * Stop the GPS watcher
 */
export function stopRiderTracking(): void {
  if (_locationSubscription) {
    _locationSubscription.remove();
    _locationSubscription = null;
  }
}

/**
 * Mark rider offline without clearing their last-known coordinates
 */
export async function setRiderOffline(riderId: string): Promise<void> {
  await setRiderOnlineStatus(riderId, false).catch(() => undefined);
}

/**
 * Subscribe to a rider's live location via Supabase Realtime
 * Returns an unsubscribe function.
 */
export function subscribeToRiderLocation(
  riderId: string,
  onUpdate: (coords: RiderCoords) => void
): () => void {
  if (!isSupabaseConfigured) return () => undefined;

  // Seed with current position from DB immediately
  void (async () => {
    const { data } = await supabase
      .from('rider_locations')
      .select('latitude, longitude, heading, speed, updated_at')
      .eq('rider_id', riderId)
      .maybeSingle();

    if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      onUpdate({
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading ?? undefined,
        speed: data.speed ?? undefined,
        updatedAt: data.updated_at ?? undefined,
      });
    }
  })().catch(() => undefined);

  // Real-time subscription for subsequent updates
  const channel = supabase
    .channel(`rider-loc-${riderId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rider_locations',
        filter: `rider_id=eq.${riderId}`,
      },
      payload => {
        const row = payload.new as {
          latitude?: number;
          longitude?: number;
          heading?: number;
          speed?: number;
          updated_at?: string;
        };
        if (typeof row.latitude !== 'number' || typeof row.longitude !== 'number') return;
        onUpdate({
          latitude: row.latitude,
          longitude: row.longitude,
          heading: row.heading,
          speed: row.speed,
          updatedAt: row.updated_at,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
