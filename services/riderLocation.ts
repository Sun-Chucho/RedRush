/**
 * Rider location publishing.
 * Native delivery tracking uses an Expo background task so locking the phone or
 * opening navigation does not silently take the rider offline. Web keeps a
 * foreground watcher because browsers do not permit background geolocation.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from './supabase';
import { setRiderOnlineStatus } from './dispatchService';

export interface RiderCoords {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt?: string;
}

const RIDER_LOCATION_TASK = 'redrush-active-delivery-location';
let foregroundSubscription: Location.LocationSubscription | null = null;
let activeRiderId: string | null = null;

async function publishLocation(riderId: string, location: Location.LocationObject) {
  const { latitude, longitude, heading, speed } = location.coords;
  await setRiderOnlineStatus(riderId, true, {
    latitude,
    longitude,
    heading: heading ?? 0,
    speed: speed ?? 0,
  });
}

if (!TaskManager.isTaskDefined(RIDER_LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    RIDER_LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data?.locations?.length) return;
      const riderId = activeRiderId || (await supabase.auth.getUser()).data.user?.id;
      if (!riderId) return;
      await publishLocation(riderId, data.locations[data.locations.length - 1]).catch(error => {
        console.warn('[rider-location] Background update failed:', error);
      });
    }
  );
}

async function startForegroundWatcher(riderId: string) {
  foregroundSubscription?.remove();
  foregroundSubscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 },
    location => {
      void publishLocation(riderId, location).catch(error => {
        console.warn('[rider-location] Foreground update failed:', error);
      });
    }
  );
}

/** Start native background GPS, or a foreground watcher on web. */
export async function startRiderTracking(riderId: string): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return false;

  activeRiderId = riderId;
  const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  await publishLocation(riderId, initial);

  if (Platform.OS === 'web') {
    await startForegroundWatcher(riderId);
    return true;
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') {
    activeRiderId = null;
    await setRiderOnlineStatus(riderId, false).catch(() => undefined);
    return false;
  }

  if (await Location.hasStartedLocationUpdatesAsync(RIDER_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(RIDER_LOCATION_TASK);
  }
  await Location.startLocationUpdatesAsync(RIDER_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 10,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'RedRush delivery in progress',
      notificationBody: 'Sharing your location for live order tracking',
      notificationColor: '#CC0000',
      killServiceOnDestroy: false,
    },
  });
  return true;
}

/** Stop every rider GPS publisher and mark the rider offline. */
export function stopRiderTracking(): void {
  const riderId = activeRiderId;
  activeRiderId = null;
  foregroundSubscription?.remove();
  foregroundSubscription = null;
  if (Platform.OS !== 'web') {
    void Location.hasStartedLocationUpdatesAsync(RIDER_LOCATION_TASK)
      .then(started => started ? Location.stopLocationUpdatesAsync(RIDER_LOCATION_TASK) : undefined)
      .catch(() => undefined);
  }
  if (riderId) void setRiderOnlineStatus(riderId, false).catch(() => undefined);
}

export async function setRiderOffline(riderId: string): Promise<void> {
  await setRiderOnlineStatus(riderId, false).catch(() => undefined);
}

/** Subscribe to live GPS with REST polling whenever Realtime is unavailable. */
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
    latitude?: number; longitude?: number; heading?: number | null;
    speed?: number | null; updated_at?: string | null;
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
    const { data } = await supabase.from('rider_locations')
      .select('latitude, longitude, heading, speed, updated_at')
      .eq('rider_id', riderId).maybeSingle();
    if (data) emitRow(data);
  };
  const stopPolling = () => {
    if (fallbackPoll) clearInterval(fallbackPoll);
    fallbackPoll = null;
  };
  const startPolling = () => {
    if (fallbackPoll || disposed) return;
    void fetchLatest().catch(() => undefined);
    fallbackPoll = setInterval(() => void fetchLatest().catch(() => undefined), 6000);
  };
  const connect = () => {
    if (disposed) return;
    attempt += 1;
    const candidate = supabase.channel(`rider-loc-${riderId}-${attempt}`).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rider_locations', filter: `rider_id=eq.${riderId}` },
      payload => emitRow(payload.new as Parameters<typeof emitRow>[0])
    );
    channel = candidate;
    candidate.subscribe(status => {
      if (disposed) return;
      if (status === 'SUBSCRIBED') { stopPolling(); return; }
      if (status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT' && status !== 'CLOSED') return;
      startPolling();
      if (channel === candidate) channel = null;
      void supabase.removeChannel(candidate);
      if (!reconnectTimer) reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, 60000);
    });
  };

  void fetchLatest().catch(() => undefined);
  connect();
  return () => {
    disposed = true;
    stopPolling();
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (channel) void supabase.removeChannel(channel);
  };
}
