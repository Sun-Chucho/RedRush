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
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href={dashboardForRole(user?.role)} />;
  }

  return (
    <View style={styles.startScreen}>
      <View style={styles.hero}>
        <Image source={require('@/fpic.png')} style={styles.heroImage} contentFit="cover" />
      </View>
      <View style={styles.brand}>
        <Text style={styles.title}>RedRush</Text>
        <Text style={styles.subtitle}>Food delivery, ready when you are.</Text>
      </View>
      <View style={styles.actionWrap}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/auth')} activeOpacity={0.86}>
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
  startScreen: {
    backgroundColor: Colors.background,
    flex: 1,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  hero: {
    borderRadius: BorderRadius.xl,
    flex: 1,
    minHeight: 360,
    overflow: 'hidden',
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  brand: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    marginTop: Spacing.md,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.body,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  actionWrap: {
    paddingTop: Spacing.xl,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
});
