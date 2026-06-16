import { Href } from 'expo-router';

export function dashboardForRole(role?: string): Href {
  if (role === 'vendor') return '/(vendor)';
  if (role === 'rider') return '/(rider)';
  if (role === 'admin') return '/(admin)';
  return '/(customer)';
}

