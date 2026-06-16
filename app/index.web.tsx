import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { dashboardForRole } from '@/services/authRoutes';

export default function WebEntry() {
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
    <View style={styles.screen}>
      <View style={styles.brand}>
        <Image source={require('@/assets/images/app-icon.png')} style={styles.logo} contentFit="contain" />
        <Text style={styles.title}>RedRush</Text>
      </View>

      <TouchableOpacity style={styles.enterButton} onPress={() => router.replace('/auth')} activeOpacity={0.86}>
        <Text style={styles.enterButtonText}>Enter RedRush</Text>
      </TouchableOpacity>
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
  screen: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  brand: {
    alignItems: 'center',
  },
  logo: {
    height: 112,
    width: 112,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    marginTop: Spacing.md,
  },
  enterButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
    minWidth: 220,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 16,
  },
  enterButtonText: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
});

