import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useOrders } from '@/hooks/useOrders';
import { useAlert } from '@/template';
import { Order } from '@/constants/mockData';

const TABS = ['All', 'Pending', 'Preparing', 'Ready', 'Completed'];
const STATUS_COLOR: Record<string, string> = {
  pending: Colors.warning, accepted: Colors.info, preparing: Colors.warning,
  ready: Colors.success, picked_up: Colors.primary, delivered: Colors.success, cancelled: Colors.error,
};

export default function VendorOrders() {
  const [tab, setTab] = useState('All');
  const insets = useSafeAreaInsets();
  const { orders, updateOrderStatus } = useOrders();
  const { showAlert } = useAlert();

  const filtered = orders.filter(o => {
    if (tab === 'All') return true;
    if (tab === 'Pending') return o.status === 'pending';
    if (tab === 'Preparing') return ['accepted', 'preparing'].includes(o.status);
    if (tab === 'Ready') return o.status === 'ready';
    if (tab === 'Completed') return ['delivered', 'cancelled'].includes(o.status);
    return true;
  });

  const handleAction = (order: Order, action: string) => {
    if (action === 'accept') {
      updateOrderStatus(order.id, 'accepted');
      showAlert('Order Accepted', 'Start preparing the order.');
    } else if (action === 'prepare') {
      updateOrderStatus(order.id, 'preparing');
    } else if (action === 'ready') {
      updateOrderStatus(order.id, 'ready');
      showAlert('Order Ready', 'Notifying rider for pickup.');
    } else if (action === 'reject') {
      showAlert('Reject Order', 'Are you sure you want to reject this order?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => updateOrderStatus(order.id, 'cancelled') },
      ]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Orders</Text>

      {/* Tabs */}
      <View style={styles.tabsScroll}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={t => t}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={o => o.id}
        renderItem={({ item }) => (
          <View style={[styles.orderCard, { borderLeftColor: STATUS_COLOR[item.status] || Colors.border }]}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] || Colors.border) + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || Colors.textMuted }]}>{item.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.orderAddress}>{item.address}</Text>
            {item.items.map((i, idx) => (
              <Text key={idx} style={styles.orderItem}>{i.quantity}x {i.menuItem.name}</Text>
            ))}
            <View style={styles.orderFoot}>
              <Text style={styles.orderTotal}>₦{item.total.toLocaleString()}</Text>
              <Text style={styles.payMethod}>{item.paymentMethod}</Text>
            </View>
            <View style={styles.actions}>
              {item.status === 'pending' ? (
                <>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(item, 'reject')}>
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item, 'accept')}>
                    <Text style={styles.actionText}>Accept</Text>
                  </TouchableOpacity>
                </>
              ) : item.status === 'accepted' ? (
                <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={() => handleAction(item, 'prepare')}>
                  <Text style={styles.actionText}>Start Preparing</Text>
                </TouchableOpacity>
              ) : item.status === 'preparing' ? (
                <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={() => handleAction(item, 'ready')}>
                  <Text style={styles.actionText}>Mark as Ready</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="receipt" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No {tab.toLowerCase()} orders</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  tabsScroll: { marginBottom: Spacing.sm },
  tabsContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceCard, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  tabTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  orderCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 4, ...Shadow.md },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  orderId: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  orderAddress: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.xs },
  orderItem: { color: Colors.textSecondary, fontSize: FontSize.sm },
  orderFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  orderTotal: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  payMethod: { color: Colors.textMuted, fontSize: FontSize.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  rejectBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.error, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  rejectText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  actionBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  actionText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.md },
});
