import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, FontSize, FontWeight, Spacing, createThemedStyles } from '@/constants/theme';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>RedRush Terms of Service</Text>
        <Text style={styles.date}>Last Updated: May 2026</Text>

        <Text style={styles.heading}>1. Service</Text>
        <Text style={styles.paragraph}>
          RedRush connects customers, restaurants, vendors, riders, and support staff for food ordering and delivery. Users must provide accurate account, address, and contact information.
        </Text>

        <Text style={styles.heading}>2. Cash on Delivery</Text>
        <Text style={styles.paragraph}>
          Current live orders use cash payment on delivery. Customers agree to pay the full confirmed order total to the rider or vendor representative at drop-off. Vendors and riders must not request amounts outside the confirmed order total.
        </Text>

        <Text style={styles.heading}>3. Cancellations and Refunds</Text>
        <Text style={styles.paragraph}>
          Customers may cancel before a restaurant accepts an order. Once preparation or delivery has started, cancellation may be declined. Since online payments are not yet enabled, cash orders do not create card refunds. Online refund terms will be published before Paystack or M-Pesa payments go live.
        </Text>

        <Text style={styles.heading}>4. Vendors and Riders</Text>
        <Text style={styles.paragraph}>
          Vendors are responsible for menu accuracy, food preparation, pricing, and legal compliance. Riders are responsible for safe delivery, accurate delivery status updates, and professional conduct.
        </Text>

        <Text style={styles.heading}>5. Support and Account Deletion</Text>
        <Text style={styles.paragraph}>
          For support, complaints, safety issues, or account deletion, contact support@redrush.app, visit /account-deletion, or use the in-app Support screen.
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
