import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { withTimeout } from '@/services/asyncUtils';
import { completeSupabaseRecoveryCallback, updateSupabasePassword } from '@/services/supabaseAuth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    withTimeout(
      completeSupabaseRecoveryCallback(typeof window !== 'undefined' ? window.location.href : undefined),
      15000,
      'The password reset service took too long. Please request a new link.'
    )
      .then(() => setReady(true))
      .catch(value => setError(value instanceof Error ? value.message : 'The reset link is invalid or expired.'));
  }, []);

  const submit = async () => {
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    setError('');
    try {
      await withTimeout(updateSupabasePassword(password), 15000, 'Updating your password took too long. Please try again.');
      router.replace('/auth');
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to update your password.');
    } finally {
      setLoading(false);
    }
  };

  if (!ready && !error) return <View style={styles.container}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a new password</Text>
      <Text style={styles.body}>Use at least 8 characters and do not reuse an old password.</Text>
      {ready ? (
        <>
          <TextInput secureTextEntry accessibilityLabel="New password" placeholder="New password" placeholderTextColor={Colors.textMuted} style={styles.input} value={password} onChangeText={setPassword} />
          <TextInput secureTextEntry accessibilityLabel="Confirm new password" placeholder="Confirm new password" placeholderTextColor={Colors.textMuted} style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} />
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {ready ? <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>{loading ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>Update password</Text>}</TouchableOpacity> : null}
      {!ready ? <TouchableOpacity style={styles.secondary} onPress={() => router.replace('/forgot-password' as any)}><Text style={styles.secondaryText}>Request a new link</Text></TouchableOpacity> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.background, flex: 1, justifyContent: 'center', padding: Spacing.xl },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  body: { color: Colors.textSecondary, fontSize: FontSize.body, lineHeight: 22, marginBottom: Spacing.lg, marginTop: Spacing.sm },
  input: { backgroundColor: Colors.surfaceCard, borderColor: Colors.border, borderRadius: BorderRadius.md, borderWidth: 1, color: Colors.text, fontSize: FontSize.body, marginBottom: Spacing.sm, padding: Spacing.md },
  error: { color: Colors.error, fontSize: FontSize.sm, marginTop: Spacing.sm },
  button: { alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, marginTop: Spacing.md, paddingVertical: 15 },
  buttonText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  secondary: { alignItems: 'center', marginTop: Spacing.md, padding: Spacing.sm },
  secondaryText: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
