export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  coordinates: { latitude: number; longitude: number }[];
}

/**
 * Uses Open Source Routing Machine (OSRM) to calculate real driving distance,
 * duration, and street-level polyline.
 * @param origin {latitude, longitude}
 * @param dest {latitude, longitude}
 */
export async function getDrivingRoute(
  origin: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number }
): Promise<RouteResult | null> {
  // OSRM coordinates are in longitude,latitude format
  const coords = `${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = route.distance / 1000;
      const durationMin = route.duration / 60;
      const coordinates = route.geometry.coordinates.map((c: [number, number]) => ({
        latitude: c[1],
        longitude: c[0],
      }));

      return { distanceKm, durationMin, coordinates };
    }
  } catch (error) {
    console.warn('OSRM routing failed:', error);
  }

  return null;
}

/**
 * Fallback Haversine distance if OSRM fails.
 */
export function getHaversineDistanceKm(
  origin: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((dest.latitude - origin.latitude) * Math.PI) / 180;
  const dLon = ((dest.longitude - origin.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origin.latitude * Math.PI) / 180) *
      Math.cos((dest.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
