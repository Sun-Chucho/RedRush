import React, { useEffect, useState } from 'react';
import {
  Linking, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useCart } from '@/hooks/useCart';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useAlert } from '@/template';
import { getCashPaymentLabel } from '@/services/payments';
import { useRestaurants } from '@/hooks/useRestaurants';
import { validatePromoForCustomer, ValidatedPromo } from '@/services/supabasePromos';

export default function CheckoutScreen() {
  const {
    savedAddresses,
    addSavedAddress,
    setDefaultAddress,
    sendLocalNotification,
  } = useCustomerData();
  const defaultAddress = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
  const [address, setAddress] = useState(defaultAddress?.details || '');
  const [selectedAddress, setSelectedAddress] = useState(defaultAddress?.id || '');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<ValidatedPromo | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, total, clearCart, restaurantId, restaurantName } = useCart();
  const { placeOrder } = useOrders();
  const { coords, formatMoney, refreshLocationCurrency, locationLabel } = useCurrency();
  const { showAlert } = useAlert();
  const [deliveryCoords, setDeliveryCoords] = useState(coords);
  const { getRestaurantById } = useRestaurants();
  const restaurant = restaurantId ? getRestaurantById(restaurantId) : undefined;

  const deliveryFee = Math.max(0, Number(restaurant?.deliveryFee || 0));
  const serviceCharge = Math.round(total * 0.03);
  const discount = appliedPromo ? Math.round(total * (appliedPromo.discountPercent / 100)) : 0;
  const grandTotal = Math.max(0, total - discount) + deliveryFee + serviceCharge;

  useEffect(() => {
    if (coords) setDeliveryCoords(coords);
  }, [coords]);

  const handleApplyPromo = async () => {
    setCheckingPromo(true);
    try {
      const promo = await validatePromoForCustomer(promoCode, total);
      setAppliedPromo(promo);
      showAlert('Promo Applied', `${promo.title} has been applied to this order.`);
    } catch (error) {
      setAppliedPromo(null);
      showAlert('Promo Code', error instanceof Error ? error.message : 'Unable to validate this promo.');
    } finally {
      setCheckingPromo(false);
    }
  };

  const selectAddress = (addressId: string) => {
    const next = savedAddresses.find(item => item.id === addressId);
    if (!next) return;

    setSelectedAddress(addressId);
    setAddress(next.details);
    setDefaultAddress(addressId);
  };

  const saveCurrentDeliveryLocation = async () => {
    const current = await refreshLocationCurrency();
    setDeliveryCoords(current.coords);
    setAddress(current.label || locationLabel);
    setSelectedAddress('');
  };

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      showAlert('Missing Address', 'Please enter your delivery address.');
      return;
    }
    if (items.length === 0) {
      showAlert('Cart Empty', 'Add items to your cart before placing an order.');
      return;
    }
    if (!restaurant) {
      showAlert('Pricing unavailable', 'Restaurant pricing is still loading. Please wait a moment and try again.');
      return;
    }
    if (!restaurantId || !restaurantName) return;
    const orderDeliveryCoords = deliveryCoords || coords;
    if (!orderDeliveryCoords) {
      showAlert('Location Required', 'Use your current location before placing the order so the rider can navigate accurately.');
      return;
    }

    setLoading(true);
    try {
      if (!savedAddresses.some(item => item.details.trim().toLowerCase() === address.trim().toLowerCase())) {
        addSavedAddress({ label: 'Recent delivery', details: address.trim(), isDefault: true });
      }

      const order = await placeOrder(
        items,
        restaurantId,
        restaurantName,
        address,
        orderDeliveryCoords,
        getCashPaymentLabel(),
        deliveryFee,
        serviceCharge,
        discount,
        appliedPromo?.code
      );
      await sendLocalNotification('Order placed', `${restaurantName} received your order.`);
      clearCart();
      router.replace(`/order/${order.id}`);
    } catch (error) {
      showAlert('Order not placed', error instanceof Error ? error.message : 'Failed to place order. Please try again.');
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
          {savedAddresses.map(saved => (
            <TouchableOpacity
              key={saved.id}
              style={[styles.savedAddress, selectedAddress === saved.id && styles.savedAddressActive]}
              onPress={() => selectAddress(saved.id)}
            >
              <MaterialIcons name={saved.isDefault ? 'home' : 'place'} size={16} color={Colors.primary} />
              <View style={styles.savedAddressText}>
                <Text style={styles.savedAddressLabel}>{saved.label}</Text>
                <Text style={styles.savedAddressDetails}>{saved.details}</Text>
              </View>
              {selectedAddress === saved.id ? <MaterialIcons name="check-circle" size={18} color={Colors.success} /> : null}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={() => {
              saveCurrentDeliveryLocation()
                .catch(error => showAlert(
                  'Location unavailable',
                  error instanceof Error ? error.message : 'Unable to read your current location.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
                  ]
                ));
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
          {appliedPromo ? (
            <View style={styles.orderItem}>
              <Text style={styles.discountLabel}>{appliedPromo.code}</Text>
              <Text style={styles.discountValue}>-{formatMoney(discount)}</Text>
            </View>
          ) : null}
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
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPromo} disabled={checkingPromo}>
              <Text style={styles.applyBtnText}>{checkingPromo ? 'Checking…' : 'Apply'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="payment" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          <View style={[styles.paymentOption, styles.paymentOptionActive]}>
            <MaterialIcons name="payments" size={22} color={Colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentLabel}>{getCashPaymentLabel()}</Text>
              <Text style={styles.paymentDetail}>Pay the rider when your order arrives</Text>
            </View>
            <View style={[styles.radio, styles.radioActive]}><View style={styles.radioInner} /></View>
          </View>
          <View style={styles.comingSoonRow}>
            <MaterialIcons name="lock-clock" size={17} color={Colors.textMuted} />
            <Text style={styles.comingSoonText}>Mobile Money and cards — coming soon</Text>
          </View>
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
  savedAddress: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  savedAddressActive: { borderColor: Colors.primary, backgroundColor: 'rgba(204,0,0,0.08)' },
  savedAddressText: { flex: 1 },
  savedAddressLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  savedAddressDetails: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  orderItemName: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  orderItemPrice: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  orderLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  orderValue: { color: Colors.textSecondary, fontSize: FontSize.sm },
  discountLabel: { color: Colors.success, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  discountValue: { color: Colors.success, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  totalItem: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  totalLabel: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  totalValue: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  promoRow: { flexDirection: 'row', gap: Spacing.sm },
  promoInput: { flex: 1, color: Colors.text, fontSize: FontSize.body, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, borderColor: Colors.border },
  applyBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 20, height: 44, justifyContent: 'center' },
  applyBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  availablePromos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  promoPill: { borderWidth: 1, borderColor: Colors.primary + '66', borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(204,0,0,0.08)' },
  promoPillText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  paymentOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: Spacing.xs, borderWidth: 1.5, borderColor: 'transparent', gap: Spacing.sm },
  paymentOptionActive: { borderColor: Colors.primary, backgroundColor: 'rgba(204,0,0,0.08)' },
  paymentLabel: { color: Colors.text, fontSize: FontSize.body },
  paymentDetail: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  comingSoonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.sm },
  comingSoonText: { color: Colors.textMuted, fontSize: FontSize.sm },
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
