import React, { useState } from 'react';
import { ActivityIndicator, View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { requestAccountDeletion } from '@/services/accountDeletion';

export default function AccountDeletionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    setSubmitting(true);
    setMessage('');
    try {
      await requestAccountDeletion({ email, details });
      setMessage('Request submitted. If this email matches a RedRush account, our support team will review and process the deletion request.');
      setDetails('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Deletion</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Delete Your RedRush Account</Text>
        <Text style={styles.paragraph}>
          You can request deletion of your RedRush account and associated personal data at any time.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Account email address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={styles.label}>Additional details (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={details}
            onChangeText={setDetails}
            placeholder="Add anything that helps us verify your request."
            placeholderTextColor={Colors.textMuted}
            multiline
          />
          <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.submitText}>Request account deletion</Text>}
          </TouchableOpacity>
          {message ? <Text style={styles.statusText}>{message}</Text> : null}
        </View>

        <Text style={styles.heading}>How to request deletion</Text>
        <Text style={styles.paragraph}>
          Use the form above, or send an email to support@redrush.app from the email address on your account with the subject Delete my RedRush account.
        </Text>
        <Text style={styles.paragraph}>
          You can also open Support in the app and send the same request. We verify ownership before deleting account data.
        </Text>

        <Text style={styles.heading}>What is deleted</Text>
        <Text style={styles.paragraph}>
          We delete or anonymize your profile, saved addresses, support messages, push tokens, and customer profile data unless retention is required for fraud prevention, safety, tax, legal, or dispute records.
          Search history and notification preferences stored with your customer profile are deleted with account data.
        </Text>

        <Text style={styles.heading}>Order and cash records</Text>
        <Text style={styles.paragraph}>
          Completed food orders and cash settlement records may be retained in limited form where required for vendor/rider reconciliation, dispute handling, or legal compliance.
        </Text>

        <Text style={styles.heading}>Timeline</Text>
        <Text style={styles.paragraph}>
          We aim to complete verified deletion requests within 30 days.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  scrollContent: { padding: Spacing.xl },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  form: { backgroundColor: Colors.surfaceCard, borderColor: Colors.border, borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, marginVertical: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.xs },
  input: { color: Colors.text, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.md },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  submitBtn: { alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, justifyContent: 'center', minHeight: 48, paddingHorizontal: Spacing.lg },
  submitText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  statusText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.md },
  heading: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  paragraph: { color: Colors.textSecondary, fontSize: FontSize.body, lineHeight: 24, marginBottom: Spacing.sm },
});
