/**
 * Rider real-time location service — Supabase only
 * Publishes GPS to rider_locations table; customers subscribe via Supabase Realtime.
 */
import * as Location from 'expo-location';
import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
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
let _appStateSubscription: NativeEventSubscription | null = null;
let _activeRiderId: string | null = null;
let _trackingRequested = false;

function removeLocationWatcher() {
  _locationSubscription?.remove();
  _locationSubscription = null;
}

async function beginLocationWatcher(riderId: string) {
  removeLocationWatcher();
  _locationSubscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 },
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
}

async function handleAppState(nextState: AppStateStatus) {
  if (!_trackingRequested || !_activeRiderId) return;
  if (nextState === 'active') {
    if (!_locationSubscription) await beginLocationWatcher(_activeRiderId).catch(() => undefined);
    return;
  }

  removeLocationWatcher();
  await setRiderOnlineStatus(_activeRiderId, false).catch(() => undefined);
}

/**
 * Start publishing rider GPS to Supabase rider_locations every 4 s / 10 m
 */
export async function startRiderTracking(riderId: string): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;

  stopRiderTracking();
  _trackingRequested = true;
  _activeRiderId = riderId;
  await beginLocationWatcher(riderId);
  _appStateSubscription = AppState.addEventListener('change', next => {
    void handleAppState(next);
  });

  return true;
}

/**
 * Stop the GPS watcher
 */
export function stopRiderTracking(): void {
  const riderId = _activeRiderId;
  _trackingRequested = false;
  removeLocationWatcher();
  _appStateSubscription?.remove();
  _appStateSubscription = null;
  _activeRiderId = null;
  if (riderId) void setRiderOnlineStatus(riderId, false).catch(() => undefined);
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

  let disposed = false;
  let attempt = 0;
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let fallbackPoll: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSignature = '';

  const emitRow = (row: {
    latitude?: number;
    longitude?: number;
    heading?: number | null;
    speed?: number | null;
    updated_at?: string | null;
  }) => {
    if (disposed || typeof row.latitude !== 'number' || typeof row.longitude !== 'number') return;
    const signature = `${row.updated_at || ''}:${row.latitude}:${row.longitude}:${row.heading || 0}:${row.speed || 0}`;
    if (signature === lastSignature) return;
    lastSignature = signature;
    onUpdate({
      latitude: row.latitude,
      longitude: row.longitude,
      heading: row.heading ?? undefined,
      speed: row.speed ?? undefined,
      updatedAt: row.updated_at ?? undefined,
    });
  };

  const fetchLatest = async () => {
    const { data } = await supabase
      .from('rider_locations')
      .select('latitude, longitude, heading, speed, updated_at')
      .eq('rider_id', riderId)
      .maybeSingle();
    if (data) emitRow(data);
  };

  const stopPolling = () => {
    if (fallbackPoll) clearInterval(fallbackPoll);
    fallbackPoll = null;
  };
  const startPolling = () => {
    if (fallbackPoll || disposed) return;
    void fetchLatest().catch(() => undefined);
    // Rider devices publish about every 4 seconds, so a 6-second fallback
    // stays responsive without hammering the database when WSS is blocked.
    fallbackPoll = setInterval(() => {
      void fetchLatest().catch(() => undefined);
    }, 6000);
  };
  const connect = () => {
    if (disposed) return;
    attempt += 1;
    const candidate = supabase
      .channel(`rider-loc-${riderId}-${attempt}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_locations',
          filter: `rider_id=eq.${riderId}`,
        },
        payload => emitRow(payload.new as Parameters<typeof emitRow>[0])
      );
    channel = candidate;
    candidate.subscribe(status => {
      if (disposed) return;
      if (status === 'SUBSCRIBED') {
        stopPolling();
        return;
      }
      if (status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT') return;

      startPolling();
      if (channel === candidate) channel = null;
      void supabase.removeChannel(candidate);
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 60000);
      }
    });
  };

  // Show the last known position immediately, then prefer Realtime updates.
  void fetchLatest().catch(() => undefined);
  connect();

  return () => {
    disposed = true;
    stopPolling();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (channel) void supabase.removeChannel(channel);
  };
}
