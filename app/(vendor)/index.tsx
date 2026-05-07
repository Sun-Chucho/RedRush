import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { MOCK_ORDERS } from '@/constants/mockData';
import { useAlert } from '@/template';
import { useOrders } from '@/hooks/useOrders';
import { sendNewOrderNotification } from '@/services/notifications';

export default function VendorDashboard() {
  const [isOpen, setIsOpen] = useState(true);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { formatMoney } = useCurrency();
  const { showAlert } = useAlert();
  const { orders, updateOrderStatus } = useOrders();

  // Live incoming orders — pending status targeted at this vendor
  const incomingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing' || o.status === 'accepted');

  const todayRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + o.total, 0);

  // Notify vendor when new orders come in
  const [prevCount, setPrevCount] = useState(0);
  useEffect(() => {
    if (incomingOrders.length > prevCount && prevCount > 0) {
      sendNewOrderNotification(incomingOrders.length);
    }
    setPrevCount(incomingOrders.length);
  }, [incomingOrders.length]);

  const handleAcceptOrder = async (orderId: string) => {
    updateOrderStatus(orderId, 'accepted');
    showAlert('Order Accepted!', 'Start preparing the food. Status updated to Accepted.');
  };

  const handlePreparing = async (orderId: string) => {
    updateOrderStatus(orderId, 'preparing');
    showAlert('Status Updated', 'Order marked as Preparing.');
  };

  const handleMarkReady = async (orderId: string) => {
    updateOrderStatus(orderId, 'ready');
    showAlert('Ready for Pickup!', 'A rider will be assigned to pick up this order shortly.');
  };

  const handleRejectOrder = async (orderId: string) => {
    showAlert('Reject Order?', 'This will cancel the order and notify the customer.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: () => {
          updateOrderStatus(orderId, 'cancelled');
        }
      },
    ]);
  };

  const vendorStats = [
    { label: "Today's Revenue", value: formatMoney(todayRevenue || 47500), icon: 'attach-money' as const, color: Colors.success, change: '+12%' },
    { label: 'Total Orders', value: String(orders.length || 23), icon: 'receipt-long' as const, color: Colors.primary, change: 'Live' },
    { label: 'Avg Rating', value: '4.8', icon: 'star' as const, color: Colors.gold, change: '+0.1' },
    { label: 'Active Menu', value: '18', icon: 'restaurant-menu' as const, color: Colors.info, change: '2 off' },
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
            setIsOpen(!isOpen);
            showAlert(isOpen ? 'Store Closed' : 'Store Open', isOpen ? 'Your store is now offline. No new orders will be received.' : 'Your store is now accepting orders!');
          }}
        >
          <View style={[styles.statusDot, { backgroundColor: isOpen ? Colors.success : Colors.error }]} />
          <Text style={[styles.statusText, { color: isOpen ? Colors.success : Colors.error }]}>
            {isOpen ? 'OPEN' : 'CLOSED'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {vendorStats.map(s => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: s.color + '22' }]}>
              <MaterialIcons name={s.icon} size={20} color={s.color} />
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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{incomingOrders.length} new</Text>
            </View>
          ) : null}
        </View>

        {incomingOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialIcons name="inbox" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No pending orders</Text>
          </View>
        ) : incomingOrders.map(order => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderTop}>
              <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.orderTime}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <Text style={styles.orderAddr}>{order.address}</Text>
            {order.items.map((item, i) => (
              <Text key={i} style={styles.orderItem}>{item.quantity}× {item.menuItem.name}</Text>
            ))}
            <View style={styles.orderFooter}>
              <Text style={styles.orderTotal}>{formatMoney(order.total)}</Text>
              <Text style={styles.payMethod}>{order.paymentMethod}</Text>
            </View>
            <View style={styles.orderActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectOrder(order.id)}>
                <MaterialIcons name="close" size={16} color={Colors.error} />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptOrder(order.id)}>
                <MaterialIcons name="check" size={16} color={Colors.text} />
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Preparing Orders */}
      {preparingOrders.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Being Prepared ({preparingOrders.length})</Text>
          {preparingOrders.map(order => (
            <View key={order.id} style={[styles.orderCard, { borderLeftColor: Colors.warning }]}>
              <View style={styles.orderTop}>
                <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                <View style={[styles.statusChip, { backgroundColor: Colors.warning + '22' }]}>
                  <Text style={[styles.statusChipText, { color: Colors.warning }]}>{order.status}</Text>
                </View>
              </View>
              {order.items.map((item, i) => (
                <Text key={i} style={styles.orderItem}>{item.quantity}× {item.menuItem.name}</Text>
              ))}
              <View style={styles.orderActions}>
                {order.status === 'accepted' ? (
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handlePreparing(order.id)}>
                    <MaterialIcons name="restaurant" size={16} color={Colors.text} />
                    <Text style={styles.acceptText}>Start Preparing</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleMarkReady(order.id)}>
                    <MaterialIcons name="done-all" size={16} color={Colors.text} />
                    <Text style={styles.acceptText}>Mark as Ready</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: 'add-circle' as const, label: 'Add Item', color: Colors.primary },
            { icon: 'local-offer' as const, label: 'Run Promo', color: Colors.warning },
            { icon: 'notifications' as const, label: 'Notify Customers', color: Colors.info },
            { icon: 'print' as const, label: 'Print Report', color: Colors.textSecondary },
          ].map(a => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => showAlert(a.label, 'Coming soon!')}>
              <MaterialIcons name={a.icon} size={28} color={a.color} />
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
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1, marginBottom: Spacing.sm },
  badge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },
  orderCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 3, borderLeftColor: Colors.primary, ...Shadow.md },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  orderId: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  orderTime: { color: Colors.textMuted, fontSize: FontSize.sm },
  orderAddr: { color: Colors.textSecondary, fontSize: FontSize.xs, marginBottom: Spacing.xs },
  orderItem: { color: Colors.textSecondary, fontSize: FontSize.sm },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  orderTotal: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  payMethod: { color: Colors.textMuted, fontSize: FontSize.xs },
  statusChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusChipText: { fontSize: 10, fontWeight: FontWeight.bold, textTransform: 'uppercase' },
  orderActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.error, paddingVertical: 10, gap: 6 },
  rejectText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary, paddingVertical: 10, gap: 6 },
  acceptText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  actionsGrid: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  actionCard: { width: '47%', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  actionLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'center' },
});
