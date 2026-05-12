import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>RedRush Privacy Policy</Text>
        <Text style={styles.date}>Last Updated: May 2026</Text>

        <Text style={styles.paragraph}>
          Welcome to RedRush. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our mobile application and website.
        </Text>

        <Text style={styles.heading}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We may collect information about you in a variety of ways. The information we may collect via the Application depends on the content and materials you use, and includes:
          {'\n\n'}• Personal Data: Name, email address, phone number.
          {'\n'}• Location Data: We collect location data while the app is in use to enable nearby restaurants, delivery tracking, rider dispatching, and localized pricing.
          {'\n'}• Financial Data: Payment method details for processing orders.
        </Text>

        <Text style={styles.heading}>2. Use of Your Information</Text>
        <Text style={styles.paragraph}>
          Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:
          {'\n\n'}• Process and manage orders, deliveries, and payments.
          {'\n'}• Create and manage your account.
          {'\n'}• Dispatch riders to the correct customer and restaurant locations.
          {'\n'}• Respond to customer service requests and provide support.
        </Text>

        <Text style={styles.heading}>3. Disclosure of Your Information</Text>
        <Text style={styles.paragraph}>
          We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
          {'\n\n'}• To vendors and restaurants to fulfill your food orders.
          {'\n'}• To delivery riders so they can locate you for drop-offs.
          {'\n'}• To third-party payment processors for secure transactions.
        </Text>

        <Text style={styles.heading}>4. Account Deletion</Text>
        <Text style={styles.paragraph}>
          You have the right to request deletion of your account and associated data at any time. Visit /account-deletion, send a request from Support in the app, or email support@redrush.app with the email address on your account. We will verify ownership before deletion.
        </Text>

        <Text style={styles.heading}>5. Payments</Text>
        <Text style={styles.paragraph}>
          RedRush currently supports cash payment on delivery. Online payment infrastructure for Paystack and M-Pesa is being prepared, but online payments are not enabled until provider verification and webhook confirmation are complete.
        </Text>

        <Text style={styles.heading}>6. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions or comments about this Privacy Policy, please contact us at: support@redrush.app.
        </Text>
        <View style={{ height: 40 }} />
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
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  date: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.xl },
  heading: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  paragraph: { color: Colors.textSecondary, fontSize: FontSize.body, lineHeight: 24 },
});
