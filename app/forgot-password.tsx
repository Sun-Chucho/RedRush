import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { requestSupabasePasswordReset } from '@/services/supabaseAuth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim()) return setError('Enter the email address on your account.');
    setLoading(true);
    setError('');
    try {
      await requestSupabasePasswordReset(email);
      setSent(true);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to send the reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityLabel="Go back">
        <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>
      <MaterialIcons name={sent ? 'mark-email-read' : 'lock-reset'} size={48} color={sent ? Colors.success : Colors.primary} />
      <Text style={styles.title}>{sent ? 'Check your email' : 'Reset your password'}</Text>
      <Text style={styles.body}>{sent ? 'If that email belongs to a RedRush account, a secure reset link has been sent.' : 'We will email you a secure link to choose a new password.'}</Text>
      {!sent ? (
        <>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email address"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>Send reset link</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/auth')}>
          <Text style={styles.buttonText}>Back to sign in</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.background, flex: 1, justifyContent: 'center', padding: Spacing.xl },
  back: { left: Spacing.md, padding: Spacing.sm, position: 'absolute', top: Spacing.xl },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.md },
  body: { color: Colors.textSecondary, fontSize: FontSize.body, lineHeight: 22, marginBottom: Spacing.lg, marginTop: Spacing.sm },
  input: { backgroundColor: Colors.surfaceCard, borderColor: Colors.border, borderRadius: BorderRadius.md, borderWidth: 1, color: Colors.text, fontSize: FontSize.body, padding: Spacing.md },
  error: { color: Colors.error, fontSize: FontSize.sm, marginTop: Spacing.sm },
  button: { alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, marginTop: Spacing.md, paddingVertical: 15 },
  buttonText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
