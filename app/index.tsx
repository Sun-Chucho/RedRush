import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { dashboardForRole } from '@/services/authRoutes';

export default function AppEntry() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href={dashboardForRole(user?.role)} />;
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/fpic.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      <View style={styles.bottomOverlay} />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/auth')}
          activeOpacity={0.86}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    // Dark gradient from transparent to near-black
    backgroundColor: 'rgba(10,0,0,0.72)',
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.xl + 16,
    left: Spacing.xl,
    right: Spacing.xl,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 18,
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.4,
  },
});
