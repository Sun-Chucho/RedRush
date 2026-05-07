/**
 * Rider real-time location service
 * Writes rider GPS to Firestore → customers subscribe for live tracking
 */
import * as Location from 'expo-location';
import { doc, onSnapshot, serverTimestamp, setDoc, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface RiderCoords {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updatedAt?: string;
}

let _locationSubscription: Location.LocationSubscription | null = null;

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
  return onSnapshot(
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
}
