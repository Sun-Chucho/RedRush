import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useOrders } from '@/hooks/useOrders';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useAlert } from '@/template';
import { useRouter } from 'expo-router';
import { ApprovalStatusCard } from '@/components/ApprovalStatusCard';
import {
  emptyVendorSettings,
  getVendorVerificationMissingItems,
  loadVendorProfileSettings,
  VendorProfileSettings,
} from '@/services/supabaseProfileSettings';

export default function VendorDashboard() {
  const [isOpen, setIsOpen] = useState(true);
  const [settings, setSettings] = useState<VendorProfileSettings>(emptyVendorSettings);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { formatMoney } = useCurrency();
  const { orders, updateOrderStatus } = useOrders();
  const { getVendorRestaurant, updateVendorRestaurantProfile } = useRestaurants();
  const { showAlert } = useAlert();
  const router = useRouter();
  const vendorRestaurant = getVendorRestaurant();
  const menuItems = vendorRestaurant?.menu || [];

  useEffect(() => {
    if (typeof vendorRestaurant?.isOpen === 'boolean') setIsOpen(vendorRestaurant.isOpen);
  }, [vendorRestaurant?.isOpen]);

  useEffect(() => {
    if (!user?.id) return;
    loadVendorProfileSettings(user.id).then(setSettings).catch(() => undefined);
  }, [user?.id]);

  const incomingOrders = orders.filter(o => o.status === 'pending');
  const today = new Date().toDateString();
  const todaysOrders = orders.filter(order => new Date(order.createdAt).toDateString() === today);
  const todaysRevenue = todaysOrders.reduce((sum, order) => order.status === 'cancelled' ? sum : sum + order.total, 0);
  const vendorStats = [
    { label: "Today's Revenue", value: formatMoney(todaysRevenue), icon: 'attach-money', color: Colors.success, change: 'Live' },
    { label: 'Total Orders', value: String(orders.length), icon: 'receipt-long', color: Colors.primary, change: `${incomingOrders.length} new` },
    { label: 'Avg Rating', value: '4.8', icon: 'star', color: Colors.gold, change: '+0.1' },
    { label: 'Active Menu', value: String(menuItems.filter(item => item.available).length), icon: 'restaurant-menu', color: Colors.info, change: `${menuItems.filter(item => !item.available).length} off` },
  ];

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.storeName}>{user?.name || 'My Restaurant'}</Text>
          <Text style={styles.date}>{new Date().toDateString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.statusToggle, { backgroundColor: isOpen ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}
          onPress={() => {
            const next = !isOpen;
            if (
              next &&
              (typeof vendorRestaurant?.latitude !== 'number' || typeof vendorRestaurant?.longitude !== 'number')
            ) {
              showAlert('GPS pin required', 'Save your shop location from Restaurant Details before opening for live orders.');
              return;
            }
            setIsOpen(next);
            updateVendorRestaurantProfile({ isOpen: next })
              .then(() => showAlert(next ? 'Store Open' : 'Store Closed', next ? 'Your store is now accepting orders!' : 'Your store is now offline.'))
              .catch(() => {
                setIsOpen(isOpen);
                showAlert('Store status', 'Unable to update store status.');
              });
          }}
        >
          <View style={[styles.statusDot, { backgroundColor: isOpen ? Colors.success : Colors.error }]} />
          <Text style={[styles.statusText, { color: isOpen ? Colors.success : Colors.error }]}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </Text>
        </TouchableOpacity>
      </View>

      <ApprovalStatusCard
        role="vendor"
        status={settings.approvalStatus}
        missingItems={getVendorVerificationMissingItems(settings)}
        onPress={() => router.push('/(vendor)/profile')}
        compact
      />

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {vendorStats.map(s => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: s.color + '22' }]}>
              <MaterialIcons name={s.icon as any} size={20} color={s.color} />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statChange, { color: Colors.success }]}>{s.change}</Text>
          </View>
        ))}
      </View>

      {/* Incoming Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Incoming Orders</Text>
          {incomingOrders.length > 0 ? (
            <View style={styles.notifBadge}>
              <Text style={styles.notifText}>{incomingOrders.length} new</Text>
            </View>
          ) : null}
        </View>
        {incomingOrders.length === 0 ? (
          <View style={styles.emptyOrders}>
            <MaterialIcons name="inbox" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No pending orders</Text>
          </View>
        ) : incomingOrders.map(order => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderTop}>
              <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.orderTime}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <Text style={styles.orderAddress}>{order.address}</Text>
            {order.items.map((item, i) => (
              <Text key={`${order.id}-${item.menuItem.id}-${i}`} style={styles.orderItem}>{item.quantity}x {item.menuItem.name}</Text>
            ))}
            <Text style={styles.orderTotal}>{formatMoney(order.total)} - {order.paymentMethod}</Text>
            <View style={styles.orderActions}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => updateOrderStatus(order.id, 'cancelled').catch(() => showAlert('Order update failed', 'Unable to reject this order.'))}
              >
                <MaterialIcons name="close" size={18} color={Colors.error} />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => updateOrderStatus(order.id, 'accepted').then(() => showAlert('Order Accepted', 'Order accepted! Start preparing.')).catch(() => showAlert('Order update failed', 'Unable to accept this order.'))}
              >
                <MaterialIcons name="check" size={18} color={Colors.text} />
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: 'add-circle', label: 'Add Item', color: Colors.primary },
            { icon: 'local-offer', label: 'Run Promo', color: Colors.warning },
            { icon: 'notifications', label: 'Notify Customers', color: Colors.info },
            { icon: 'print', label: 'Print Report', color: Colors.textSecondary },
          ].map(a => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionCard}
              onPress={() => {
                if (a.label === 'Add Item') router.push('/(vendor)/menu');
                else showAlert(a.label, `${a.label} action recorded for this store.`);
              }}
            >
              <MaterialIcons name={a.icon as any} size={28} color={a.color} />
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  storeName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  date: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 },
  statusToggle: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { width: '47%', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
  statIconBox: { width: 40, height: 40, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  statValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  statChange: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 2 },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
  notifBadge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  notifText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  emptyOrders: { alignItems: 'center', paddingVertical: Spacing.xl, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },
  orderCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 3, borderLeftColor: Colors.warning, ...Shadow.md },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  orderId: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  orderTime: { color: Colors.textMuted, fontSize: FontSize.sm },
  orderAddress: { color: Colors.textSecondary, fontSize: FontSize.xs, marginBottom: Spacing.xs },
  orderItem: { color: Colors.textSecondary, fontSize: FontSize.sm },
  orderTotal: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginTop: Spacing.sm },
  orderActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.error, paddingVertical: 10, gap: 6 },
  rejectText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary, paddingVertical: 10, gap: 6 },
  acceptText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  actionsGrid: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  actionCard: { width: '47%', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  actionLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'center' },
});
