import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { dashboardForRole } from '@/services/authRoutes';

/**
 * Native app landing / welcome screen.
 *
 * Shared by the iOS entry (app/index.tsx) and the Android entry
 * (app/index.android.tsx) so the two native platforms can never drift apart.
 * Web has its own dedicated landing page in app/index.web.tsx.
 */
export default function AppWelcome() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  // Returning, signed-in users skip the landing and go straight to their dashboard.
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

      {/* Dark gradient so the copy and button stay legible over any image. */}
      <LinearGradient
        colors={['rgba(10,0,0,0)', 'rgba(10,0,0,0.55)', 'rgba(10,0,0,0.95)']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />

      <View style={styles.footer}>
        <Text style={styles.brand}>RedRush</Text>
        <Text style={styles.tagline}>
          Fast local food delivery — order from your favourite spots and track every step to your door.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/auth')}
          activeOpacity={0.86}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.legalLink}>Privacy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
            <Text style={styles.legalLink}>Terms</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#0a0000',
    flex: 1,
  },
  gradient: {
    bottom: 0,
    height: 420,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  footer: {
    bottom: Spacing.xl + 16,
    left: Spacing.xl,
    position: 'absolute',
    right: Spacing.xl,
  },
  brand: {
    color: Colors.text,
    fontSize: FontSize.hero,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: FontSize.body,
    lineHeight: 24,
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
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
  legalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  legalDot: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FontSize.sm,
  },
});
