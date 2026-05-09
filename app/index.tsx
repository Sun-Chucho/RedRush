import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const PRELOAD_MS = 4000;

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [preloadDone, setPreloadDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPreloadDone(true), PRELOAD_MS);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !preloadDone) {
    return (
      <View style={styles.preload}>
        <Image source={require('@/assets/images/logo.png')} style={styles.preloadLogo} contentFit="contain" />
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/onboarding" />;
  }

  if (user?.role === 'customer') return <Redirect href="/(customer)" />;
  if (user?.role === 'vendor') return <Redirect href="/(vendor)" />;
  if (user?.role === 'rider') return <Redirect href="/(rider)" />;
  if (user?.role === 'admin') return <Redirect href="/(admin)" />;

  return <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  preload: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  preloadLogo: {
    width: '86%',
    maxWidth: 320,
    aspectRatio: 1.5,
  },
  loader: {
    marginTop: 24,
  },
});
