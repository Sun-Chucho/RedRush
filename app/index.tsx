import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Href, Redirect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

function dashboardForRole(role?: string): Href {
  if (role === 'vendor') return '/(vendor)';
  if (role === 'rider') return '/(rider)';
  if (role === 'admin') return '/(admin)';
  return '/(customer)';
}

export default function AppEntry() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? dashboardForRole(user?.role) : '/auth'} />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    flex: 1,
    justifyContent: 'center',
  },
});
