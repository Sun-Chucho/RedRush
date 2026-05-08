import { useContext } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';

export function useRestaurants() {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('useRestaurants must be used within RestaurantProvider');
  return context;
}
