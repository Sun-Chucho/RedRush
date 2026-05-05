import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/onboarding" />;
  }

  if (user?.role === 'customer') return <Redirect href="/(customer)" />;
  if (user?.role === 'vendor') return <Redirect href="/(vendor)" />;
  if (user?.role === 'rider') return <Redirect href="/(rider)" />;
  if (user?.role === 'admin') return <Redirect href="/(admin)" />;

  return <Redirect href="/onboarding" />;
}
