import { Restaurant } from '@/constants/mockData';
import {
  distanceKm,
  formatDistanceKm,
  marketForCoordinates,
  nearestServiceTier,
} from '@/constants/locationTiers';

export type CustomerCoords = { latitude: number; longitude: number } | null;

export type RestaurantWithDistance = Restaurant & {
  distanceSort: number | null;
  inServiceArea: boolean;
  locationConfidence: 'gps' | 'restaurant-missing-gps' | 'customer-missing-gps';
};

export function projectRestaurantForCustomer(
  restaurant: Restaurant,
  customerCoords: CustomerCoords
): RestaurantWithDistance {
  const hasRestaurantCoords =
    typeof restaurant.latitude === 'number' &&
    typeof restaurant.longitude === 'number';

  if (!customerCoords) {
    return {
      ...restaurant,
      distanceSort: null,
      inServiceArea: true,
      locationConfidence: 'customer-missing-gps',
    };
  }

  const customerMarket = marketForCoordinates(customerCoords.latitude, customerCoords.longitude);
  const serviceTier = nearestServiceTier(customerCoords, customerMarket);

  if (!hasRestaurantCoords) {
    return {
      ...restaurant,
      distance: 'Set by restaurant',
      distanceSort: null,
      inServiceArea: false,
      locationConfidence: 'restaurant-missing-gps',
    };
  }

  const restaurantCoords = {
    latitude: restaurant.latitude as number,
    longitude: restaurant.longitude as number,
  };
  const restaurantMarket = marketForCoordinates(restaurantCoords.latitude, restaurantCoords.longitude);
  const distance = distanceKm(customerCoords, restaurantCoords);
  const radiusKm = Math.max(12, serviceTier?.radiusKm ?? 12);

  return {
    ...restaurant,
    distance: formatDistanceKm(distance),
    distanceSort: distance,
    inServiceArea: restaurantMarket === customerMarket && distance <= radiusKm,
    locationConfidence: 'gps',
  };
}

export function sortRestaurantsForCustomer(restaurants: RestaurantWithDistance[]) {
  return [...restaurants].sort((a, b) => {
    if (a.inServiceArea !== b.inServiceArea) return a.inServiceArea ? -1 : 1;
    if (a.distanceSort == null && b.distanceSort == null) return b.rating - a.rating;
    if (a.distanceSort == null) return 1;
    if (b.distanceSort == null) return -1;
    return a.distanceSort - b.distanceSort;
  });
}
