import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

export default function AccountDeletionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

        <Text style={styles.heading}>How to request deletion</Text>
        <Text style={styles.paragraph}>
          Send an email to support@redrush.app from the email address on your account with the subject Delete my RedRush account.
        </Text>
        <Text style={styles.paragraph}>
          You can also open Support in the app and send the same request. We verify ownership before deleting account data.
        </Text>

        <Text style={styles.heading}>What is deleted</Text>
        <Text style={styles.paragraph}>
          We delete or anonymize your profile, saved addresses, support messages, push tokens, and customer profile data unless retention is required for fraud prevention, safety, tax, legal, or dispute records.
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
  heading: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  paragraph: { color: Colors.textSecondary, fontSize: FontSize.body, lineHeight: 24, marginBottom: Spacing.sm },
});
