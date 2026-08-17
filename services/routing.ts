export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  coordinates: { latitude: number; longitude: number }[];
}

type Coordinate = { latitude: number; longitude: number };

const OPEN_ROUTE_SERVICE_KEY = process.env.EXPO_PUBLIC_OPENROUTESERVICE_API_KEY?.trim();
const routeCache = new Map<string, RouteResult>();

function cacheKey(origin: Coordinate, destination: Coordinate) {
  return [origin, destination]
    .flatMap(point => [point.latitude.toFixed(4), point.longitude.toFixed(4)])
    .join(':');
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function routeWithOpenRouteService(origin: Coordinate, destination: Coordinate): Promise<RouteResult | null> {
  if (!OPEN_ROUTE_SERVICE_KEY) return null;
  const response = await fetchWithTimeout(
    'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
    {
      method: 'POST',
      headers: {
        Accept: 'application/geo+json, application/json',
        Authorization: OPEN_ROUTE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude],
        ],
        instructions: false,
      }),
    }
  );
  if (!response.ok) return null;
  const data = await response.json();
  const feature = data?.features?.[0];
  const summary = feature?.properties?.summary;
  const rawCoordinates = feature?.geometry?.coordinates;
  if (!summary || !Array.isArray(rawCoordinates) || rawCoordinates.length < 2) return null;
  return {
    distanceKm: Number(summary.distance || 0) / 1000,
    durationMin: Number(summary.duration || 0) / 60,
    coordinates: rawCoordinates.map((coordinate: [number, number]) => ({
      latitude: coordinate[1],
      longitude: coordinate[0],
    })),
  };
}

async function routeWithOsrm(baseUrl: string, origin: Coordinate, destination: Coordinate): Promise<RouteResult | null> {
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const response = await fetchWithTimeout(
    `${baseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) return null;
  const data = await response.json();
  const route = data?.code === 'Ok' ? data.routes?.[0] : null;
  if (!route?.geometry?.coordinates?.length) return null;
  return {
    distanceKm: Number(route.distance || 0) / 1000,
    durationMin: Number(route.duration || 0) / 60,
    coordinates: route.geometry.coordinates.map((coordinate: [number, number]) => ({
      latitude: coordinate[1],
      longitude: coordinate[0],
    })),
  };
}

/**
 * Returns a street-level driving route. A configured ORS key is preferred;
 * two independent public OSRM services are raced as a no-key fallback.
 */
export async function getDrivingRoute(origin: Coordinate, destination: Coordinate): Promise<RouteResult | null> {
  const key = cacheKey(origin, destination);
  const cached = routeCache.get(key);
  if (cached) return cached;

  const providers = [
    () => routeWithOpenRouteService(origin, destination),
    () => routeWithOsrm('https://router.project-osrm.org', origin, destination),
    () => routeWithOsrm('https://routing.openstreetmap.de/routed-car', origin, destination),
  ];

  try {
    const result = await Promise.any(providers.map(async provider => {
      const route = await provider();
      if (!route) throw new Error('Route provider returned no route.');
      return route;
    }));
    routeCache.set(key, result);
    if (routeCache.size > 60) routeCache.delete(routeCache.keys().next().value as string);
    return result;
  } catch {
    return null;
  }
}

/** Fallback distance when every street-routing provider is unavailable. */
export function getHaversineDistanceKm(origin: Coordinate, destination: Coordinate): number {
  const earthRadiusKm = 6371;
  const dLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const dLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origin.latitude * Math.PI) / 180) *
      Math.cos((destination.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
