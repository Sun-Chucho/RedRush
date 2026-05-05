import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useCart } from '@/hooks/useCart';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { useAlert } from '@/template';

const PAYMENT_METHODS = [
  { id: 'momo', label: 'MTN Mobile Money', icon: 'phone-android', color: '#FFD700' },
  { id: 'airtel', label: 'Airtel Money', icon: 'phone-android', color: '#CC0000' },
  { id: 'card', label: 'Debit/Credit Card', icon: 'credit-card', color: Colors.info },
  { id: 'cash', label: 'Cash on Delivery', icon: 'payments', color: Colors.success },
];

export default function CheckoutScreen() {
  const [address, setAddress] = useState('45 Saka Tinubu Street, VI, Lagos');
  const [selectedPayment, setSelectedPayment] = useState('momo');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, total, clearCart, restaurantId, restaurantName } = useCart();
  const { placeOrder } = useOrders();
  const { formatMoney, refreshLocationCurrency, locationLabel } = useCurrency();
  const { showAlert } = useAlert();

  const deliveryFee = 500;
  const serviceCharge = Math.round(total * 0.03);
  const grandTotal = total + deliveryFee + serviceCharge;

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      showAlert('Missing Address', 'Please enter your delivery address.');
      return;
    }
    if (!restaurantId || !restaurantName) return;

    setLoading(true);
    try {
      const paymentLabel = PAYMENT_METHODS.find(p => p.id === selectedPayment)?.label || 'Cash';
      const order = await placeOrder(items, restaurantId, restaurantName, address, paymentLabel, deliveryFee, serviceCharge);
      clearCart();
      router.replace(`/order/${order.id}`);
    } catch (e) {
      showAlert('Error', 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="location-on" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <TextInput
            style={styles.addressInput}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter delivery address"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={2}
          />
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={() => {
              refreshLocationCurrency()
                .then(() => setAddress(locationLabel))
                .catch(() => showAlert('Location', 'Unable to read your current location.'));
            }}
          >
            <MaterialIcons name="my-location" size={16} color={Colors.primary} />
            <Text style={styles.locationBtnText}>Use current location</Text>
          </TouchableOpacity>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="receipt" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          {items.map(item => (
            <View key={item.menuItem.id} style={styles.orderItem}>
              <Text style={styles.orderItemName}>{item.quantity}x {item.menuItem.name}</Text>
              <Text style={styles.orderItemPrice}>{formatMoney(item.menuItem.price * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.orderItem}>
            <Text style={styles.orderLabel}>Delivery Fee</Text>
            <Text style={styles.orderValue}>{formatMoney(deliveryFee)}</Text>
          </View>
          <View style={styles.orderItem}>
            <Text style={styles.orderLabel}>Service Charge</Text>
            <Text style={styles.orderValue}>{formatMoney(serviceCharge)}</Text>
          </View>
          <View style={[styles.orderItem, styles.totalItem]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatMoney(grandTotal)}</Text>
          </View>
        </View>

        {/* Promo Code */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="local-offer" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Promo Code</Text>
          </View>
          <View style={styles.promoRow}>
            <TextInput
              style={styles.promoInput}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Enter promo code"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.applyBtn} onPress={() => showAlert('Promo Code', 'Promo codes coming soon!')}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="payment" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          {PAYMENT_METHODS.map(pm => (
            <TouchableOpacity
              key={pm.id}
              style={[styles.paymentOption, selectedPayment === pm.id && styles.paymentOptionActive]}
              onPress={() => setSelectedPayment(pm.id)}
            >
              <MaterialIcons name={pm.icon as any} size={22} color={pm.color} />
              <Text style={styles.paymentLabel}>{pm.label}</Text>
              <View style={[styles.radio, selectedPayment === pm.id && styles.radioActive]}>
                {selectedPayment === pm.id ? <View style={styles.radioInner} /> : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Place Order */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Grand Total</Text>
          <Text style={styles.footerTotalValue}>{formatMoney(grandTotal)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderBtn, loading && { opacity: 0.7 }]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={Colors.text} /> : (
            <>
              <Text style={styles.placeOrderText}>Place Order</Text>
              <MaterialIcons name="check-circle" size={20} color={Colors.text} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  scroll: { padding: Spacing.md },
  section: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  addressInput: { color: Colors.text, fontSize: FontSize.body, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, minHeight: 60 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  locationBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  orderItemName: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  orderItemPrice: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  orderLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  orderValue: { color: Colors.textSecondary, fontSize: FontSize.sm },
  totalItem: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  totalLabel: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  totalValue: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  promoRow: { flexDirection: 'row', gap: Spacing.sm },
  promoInput: { flex: 1, color: Colors.text, fontSize: FontSize.body, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, borderColor: Colors.border },
  applyBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 20, height: 44, justifyContent: 'center' },
  applyBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: Spacing.xs, borderWidth: 1.5, borderColor: 'transparent', gap: Spacing.sm },
  paymentOptionActive: { borderColor: Colors.primary, backgroundColor: 'rgba(204,0,0,0.08)' },
  paymentLabel: { flex: 1, color: Colors.text, fontSize: FontSize.body },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.md, ...Shadow.lg },
  footerTotal: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  footerTotalLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  footerTotalValue: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  placeOrderBtn: { flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  placeOrderText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
