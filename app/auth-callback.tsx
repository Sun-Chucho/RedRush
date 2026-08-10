import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { dashboardForRole } from '@/services/authRoutes';
import { withTimeout } from '@/services/asyncUtils';
import { completeSupabaseOAuthCallback } from '@/services/supabaseAuth';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState('');

  const completeSignIn = useCallback(async () => {
    setError('');
    try {
      const profile = await withTimeout(
        completeSupabaseOAuthCallback(typeof window !== 'undefined' ? window.location.href : undefined),
        15000,
        'Google sign-in took too long. Check your connection and try again.'
      );
      router.replace(dashboardForRole(profile.role));
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Google sign-in could not be completed.');
    }
  }, [router]);

  useEffect(() => {
    completeSignIn();
  }, [completeSignIn]);

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.title}>Google sign-in needs attention</Text>
          <Text style={styles.text}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={completeSignIn}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => router.replace('/auth')}>
            <Text style={styles.secondaryText}>Back to sign in</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.text}>Completing Google sign-in...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: Colors.background, flex: 1, gap: Spacing.md, justifyContent: 'center', padding: Spacing.xl },
  title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center' },
  text: { color: Colors.textSecondary, fontSize: FontSize.body, maxWidth: 440, textAlign: 'center' },
  button: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, maxWidth: 440, paddingVertical: 14, width: '100%' },
  buttonText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  secondary: { padding: Spacing.sm },
  secondaryText: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
