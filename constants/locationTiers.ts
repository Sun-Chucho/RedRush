export type SupportedMarketCode = 'KE' | 'TZ';

export type ServiceTier = {
  code: string;
  label: string;
  marketCode: SupportedMarketCode;
  center: { latitude: number; longitude: number };
  radiusKm: number;
};

export const SUPPORTED_MARKETS: Record<SupportedMarketCode, { country: string; currency: 'KES' | 'TZS' }> = {
  KE: { country: 'Kenya', currency: 'KES' },
  TZ: { country: 'Tanzania', currency: 'TZS' },
};

export const SERVICE_TIERS: ServiceTier[] = [
  { code: 'ke-nairobi', label: 'Nairobi', marketCode: 'KE', center: { latitude: -1.286389, longitude: 36.817223 }, radiusKm: 28 },
  { code: 'ke-mombasa', label: 'Mombasa', marketCode: 'KE', center: { latitude: -4.043477, longitude: 39.668205 }, radiusKm: 22 },
  { code: 'ke-kisumu', label: 'Kisumu', marketCode: 'KE', center: { latitude: -0.091702, longitude: 34.767956 }, radiusKm: 18 },
  { code: 'tz-dar', label: 'Dar es Salaam', marketCode: 'TZ', center: { latitude: -6.792354, longitude: 39.208328 }, radiusKm: 28 },
  { code: 'tz-arusha', label: 'Arusha', marketCode: 'TZ', center: { latitude: -3.386925, longitude: 36.682993 }, radiusKm: 18 },
];

const COUNTRY_BOUNDS: Record<SupportedMarketCode, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  KE: { minLat: -4.9, maxLat: 5.1, minLon: 33.5, maxLon: 42.1 },
  TZ: { minLat: -11.9, maxLat: -0.7, minLon: 29.0, maxLon: 40.8 },
};

export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const radius = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function marketForCountry(country?: string | null): SupportedMarketCode {
  const normalized = country?.trim().toLowerCase();
  if (normalized?.includes('tanzania')) return 'TZ';
  return 'KE';
}

export function marketForCoordinates(latitude?: number, longitude?: number): SupportedMarketCode {
  if (latitude == null || longitude == null) return 'KE';

  for (const [marketCode, bounds] of Object.entries(COUNTRY_BOUNDS) as [SupportedMarketCode, typeof COUNTRY_BOUNDS[SupportedMarketCode]][]) {
    if (
      latitude >= bounds.minLat &&
      latitude <= bounds.maxLat &&
      longitude >= bounds.minLon &&
      longitude <= bounds.maxLon
    ) {
      return marketCode;
    }
  }

  return 'KE';
}

export function nearestServiceTier(coords: { latitude: number; longitude: number }, marketCode = marketForCoordinates(coords.latitude, coords.longitude)) {
  return SERVICE_TIERS
    .filter(tier => tier.marketCode === marketCode)
    .map(tier => ({ ...tier, distanceFromCenterKm: distanceKm(coords, tier.center) }))
    .sort((a, b) => a.distanceFromCenterKm - b.distanceFromCenterKm)[0];
}

export function formatDistanceKm(distance: number) {
  return `${distance.toFixed(distance < 10 ? 1 : 0)} km`;
}
