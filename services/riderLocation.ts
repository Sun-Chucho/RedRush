/**
 * Rider real-time location service
 * Writes rider GPS to Firestore → customers subscribe for live tracking
 */
import * as Location from 'expo-location';
import { doc, onSnapshot, serverTimestamp, setDoc, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { isSupabaseConfigured, supabase } from './supabase';

export interface RiderCoords {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt?: string;
}

let _locationSubscription: Location.LocationSubscription | null = null;

async function getSupabaseUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

async function publishRiderLocationToSupabase(riderId: string, coords: RiderCoords, isOnline: boolean) {
  if (!isSupabaseConfigured) return false;

  const supabaseUserId = await getSupabaseUserId();
  if (!supabaseUserId || supabaseUserId !== riderId) return false;

  const { error } = await supabase.from('rider_locations').upsert({
    rider_id: riderId,
    latitude: coords.latitude,
    longitude: coords.longitude,
    heading: coords.heading ?? 0,
    speed: coords.speed ?? 0,
    is_online: isOnline,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  return true;
}

/**
 * Start publishing rider location to Firestore
 * Call when rider goes online or accepts a delivery
 */
export async function startRiderTracking(riderId: string): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;

  // Stop any existing subscription first
  stopRiderTracking();

  _locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 4000,      // Update every 4 seconds
      distanceInterval: 10,    // Or every 10 metres
    },
    async location => {
      const { latitude, longitude, heading, speed } = location.coords;
      publishRiderLocationToSupabase(
        riderId,
        {
          latitude,
          longitude,
          heading: heading ?? 0,
          speed: speed ?? 0,
          updatedAt: new Date().toISOString(),
        },
        true
      ).catch(() => undefined);

      await setDoc(
        doc(db, 'riderLocations', riderId),
        {
          riderId,
          latitude,
          longitude,
          heading: heading ?? 0,
          speed: speed ?? 0,
          updatedAt: serverTimestamp(),
          updatedAtIso: new Date().toISOString(),
          isOnline: true,
        },
        { merge: true }
      ).catch(() => undefined);
    }
  );

  return true;
}

/**
 * Stop publishing rider location
 * Call when rider goes offline
 */
export function stopRiderTracking(): void {
  if (_locationSubscription) {
    _locationSubscription.remove();
    _locationSubscription = null;
  }
}

/**
 * Set rider offline in Firestore (without clearing coords)
 */
export async function setRiderOffline(riderId: string): Promise<void> {
  publishRiderLocationToSupabase(
    riderId,
    { latitude: 0, longitude: 0, heading: 0, speed: 0, updatedAt: new Date().toISOString() },
    false
  ).catch(() => undefined);

  await setDoc(
    doc(db, 'riderLocations', riderId),
    { isOnline: false, updatedAt: serverTimestamp() },
    { merge: true }
  ).catch(() => undefined);
}

/**
 * Subscribe to a rider's live location (used by customer order tracking)
 */
export function subscribeToRiderLocation(
  riderId: string,
  onUpdate: (coords: RiderCoords) => void
): Unsubscribe {
  const channel = isSupabaseConfigured
    ? supabase
        .channel(`rider-location-${riderId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rider_locations', filter: `rider_id=eq.${riderId}` },
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
        .subscribe()
    : null;

  if (isSupabaseConfigured) {
    void (async () => {
      const { data } = await supabase
        .from('rider_locations')
        .select('latitude, longitude, heading, speed, updated_at')
        .eq('rider_id', riderId)
        .maybeSingle();

        if (!data) return;
        onUpdate({
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          updatedAt: data.updated_at,
        });
    })().catch(() => undefined);
  }

  const unsubscribeFirestore = onSnapshot(
    doc(db, 'riderLocations', riderId),
    snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      onUpdate({
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
        updatedAt: data.updatedAtIso,
      });
    },
    () => undefined
  );

  return () => {
    unsubscribeFirestore();
    if (channel) supabase.removeChannel(channel);
  };
}
