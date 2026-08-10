import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useCart } from '@/hooks/useCart';
import { useCurrency } from '@/hooks/useCurrency';

export default function CartScreen() {
  const { items, total, itemCount, updateQuantity, removeItem, restaurantName, clearCart } = useCart();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { formatMoney } = useCurrency();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const deliveryFee = 500;
  const serviceCharge = Math.round(total * 0.03);
  const grandTotal = total + deliveryFee + serviceCharge;

  if (items.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { paddingTop: insets.top }]}>
        <MaterialIcons name="shopping-cart" size={80} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add items from a restaurant to get started</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(customer)')}>
          <Text style={styles.browseBtnText}>Browse Restaurants</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isWide && styles.contentWidth]}>
        <Text style={styles.headerTitle}>My Cart</Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Restaurant */}
      <View style={[styles.restaurantTag, isWide && styles.contentWidth]}>
        <MaterialIcons name="restaurant" size={16} color={Colors.primary} />
        <Text style={styles.restaurantName}> {restaurantName}</Text>
        <Text style={styles.itemCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
      </View>

      <View style={[styles.body, isWide && styles.bodyWide]}>
        <FlatList
          style={styles.itemsList}
          data={items}
          keyExtractor={i => i.menuItem.id}
          contentContainerStyle={[styles.itemsContent, isWide && styles.itemsContentWide]}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <Image source={{ uri: item.menuItem.image }} style={styles.itemImg} contentFit="cover" />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.menuItem.name}</Text>
                <Text style={styles.itemPrice}>{formatMoney(item.menuItem.price)}</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.menuItem.id, item.quantity - 1)}>
                  <MaterialIcons name="remove" size={16} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.menuItem.id, item.quantity + 1)}>
                  <MaterialIcons name="add" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => removeItem(item.menuItem.id)} style={styles.deleteBtn}>
                <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Order Summary */}
        <View style={[styles.summary, isWide && styles.summaryWide, { paddingBottom: isWide ? Spacing.lg : insets.bottom + Spacing.md }]}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatMoney(total)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>{formatMoney(deliveryFee)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service Charge (3%)</Text>
          <Text style={styles.summaryValue}>{formatMoney(serviceCharge)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatMoney(grandTotal)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/checkout')}>
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          <MaterialIcons name="arrow-forward" size={20} color={Colors.text} />
        </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentWidth: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  body: { flex: 1 },
  bodyWide: { width: '100%', maxWidth: 1200, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', gap: 24, paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  itemsList: { flex: 1, width: '100%' },
  itemsContent: { padding: Spacing.md, paddingBottom: 200 },
  itemsContentWide: { padding: 0, paddingBottom: Spacing.xl },
  emptyContainer: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  headerTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  clearText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  restaurantTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  restaurantName: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  itemCount: { color: Colors.textMuted, fontSize: FontSize.xs },
  cartItem: { flexDirection: 'row', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, alignItems: 'center', padding: Spacing.sm, gap: Spacing.sm, ...Shadow.md },
  itemImg: { width: 64, height: 64, borderRadius: BorderRadius.sm },
  itemInfo: { flex: 1 },
  itemName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  itemPrice: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(204,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  qtyText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, minWidth: 24, textAlign: 'center' },
  deleteBtn: { padding: 4 },
  summary: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.md, ...Shadow.lg },
  summaryWide: { position: 'relative', bottom: undefined, left: undefined, right: undefined, width: 380, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  summaryValue: { color: Colors.text, fontSize: FontSize.sm },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  totalLabel: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  totalValue: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  checkoutBtn: { flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm, gap: Spacing.sm },
  checkoutText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  emptyTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.md },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.xs, textAlign: 'center' },
  browseBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 12, paddingHorizontal: 32, marginTop: Spacing.lg },
  browseBtnText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
