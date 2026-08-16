import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, FontSize, FontWeight, Spacing, createThemedStyles } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.push('/')}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>RedRush Privacy Policy</Text>
        <Text style={styles.date}>Last Updated: May 13, 2026</Text>

        <Text style={styles.paragraph}>
          Welcome to RedRush. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use the RedRush mobile application or website.
        </Text>

        <Text style={styles.heading}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We collect information needed to create accounts, process orders, support delivery, and operate the service:
          {'\n\n'}- Account and contact data: name, email address, phone number, role, and support messages.
          {'\n'}- Location data: delivery addresses and app location while in use for nearby restaurants, delivery tracking, rider dispatch, and local pricing.
          {'\n'}- Order data: restaurant, cart items, totals, delivery status, rider assignment, and support history.
          {'\n'}- App activity: app interactions, in-app search history, order update preferences, and notification state.
          {'\n'}- Selected images: profile, restaurant, and menu photos that users choose from their photo library. RedRush does not require camera access for uploads.
        </Text>

        <Text style={styles.heading}>2. Use of Your Information</Text>
        <Text style={styles.paragraph}>
          We use collected information to:
          {'\n\n'}- Create and manage user accounts.
          {'\n'}- Process and manage orders, deliveries, cash payment status, and support requests.
          {'\n'}- Save recent searches and send order update notifications when enabled.
          {'\n'}- Dispatch riders to the correct customer and restaurant locations.
          {'\n'}- Keep customers, vendors, riders, and administrators informed about order status.
        </Text>

        <Text style={styles.heading}>3. Disclosure of Your Information</Text>
        <Text style={styles.paragraph}>
          We share information only when needed to provide the service:
          {'\n\n'}- With vendors and restaurants to fulfill food orders.
          {'\n'}- With delivery riders so they can pick up and deliver orders.
          {'\n'}- With service providers such as hosting, database, notification, image hosting, and payment infrastructure providers.
          {'\n'}- With authorities where required by law or to protect users, the service, or the public.
        </Text>

        <Text style={styles.heading}>4. Data Retention and Account Deletion</Text>
        <Text style={styles.paragraph}>
          We keep account, order, support, and operational records only as long as needed for service, safety, accounting, legal, and dispute-resolution purposes. You may request deletion of your account and associated data at any time. Visit /account-deletion, send a request from Support in the app, or email support@redrush.app with the email address on your account. We will verify ownership before deletion.
        </Text>

        <Text style={styles.heading}>5. Permissions</Text>
        <Text style={styles.paragraph}>
          RedRush may request location permission to show nearby restaurants, route deliveries, and support rider dispatch. RedRush may request photo library access when a user chooses to upload a profile, restaurant, or menu image. RedRush does not require Android camera permission.
        </Text>

        <Text style={styles.heading}>6. Payments</Text>
        <Text style={styles.paragraph}>
          RedRush currently supports cash payment on delivery. Online payment infrastructure for Paystack and M-Pesa is being prepared, but online payments are not enabled until provider verification and webhook confirmation are complete.
        </Text>

        <Text style={styles.heading}>7. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions or comments about this Privacy Policy, please contact us at support@redrush.app.
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = createThemedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  scrollContent: { padding: Spacing.xl },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  date: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.xl },
  heading: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  paragraph: { color: Colors.textSecondary, fontSize: FontSize.body, lineHeight: 24 },
}));
