import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { useAlert } from '@/template';

const STATUS_COLOR: Record<string, string> = {
  pending: Colors.warning, accepted: Colors.info, preparing: Colors.warning,
  ready: Colors.success, assigned: Colors.info, picked_up: Colors.primary, delivered: Colors.success, cancelled: Colors.error,
};

export default function AdminOrders() {
  const [filter, setFilter] = useState('All');
  const insets = useSafeAreaInsets();
  const { orders, updateCashPaymentStatus } = useOrders();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();

  const filtered = filter === 'All' ? orders : orders.filter(o => o.status === filter.toLowerCase().replace(' ', '_'));

  const total = orders.reduce((s, o) => s + o.total, 0);
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Orders Monitor</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total Revenue', value: formatMoney(total), color: Colors.success },
          { label: 'Active', value: active.toString(), color: Colors.primary },
          { label: 'Delivered', value: delivered.toString(), color: Colors.success },
          { label: 'Total', value: orders.length.toString(), color: Colors.info },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter */}
      <View style={styles.filterScroll}>
        {['All', 'Pending', 'Preparing', 'Delivered', 'Cancelled'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={o => o.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.orderCard, { borderLeftColor: STATUS_COLOR[item.status] || Colors.border }]}>
            <View style={styles.orderTop}>
              <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] || Colors.border) + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || Colors.textMuted }]}>{item.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.restaurantName}>{item.restaurantName}</Text>
            <Text style={styles.address}>{item.address}</Text>
            {item.riderName ? (
              <Text style={styles.rider}>Rider: {item.riderName}</Text>
            ) : null}
            <View style={styles.orderFoot}>
              <Text style={styles.total}>{formatMoney(item.total)}</Text>
              <Text style={styles.payment}>{item.paymentMethod}</Text>
              {item.paymentStatus === 'cash_collected' ? (
                <TouchableOpacity onPress={() => updateCashPaymentStatus(item.id, 'remitted')}>
                  <Text style={styles.remitText}>Mark remitted</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => showAlert('Order Action', `Payment status: ${item.paymentStatus || 'not recorded'}.`)}>
                  <MaterialIcons name="more-horiz" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="inbox" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statVal: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
  statLbl: { color: Colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 2 },
  filterScroll: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 14, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceCard, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  filterTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  orderCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 4, ...Shadow.md },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderId: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 9, fontWeight: FontWeight.extrabold },
  restaurantName: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  address: { color: Colors.textMuted, fontSize: FontSize.xs },
  rider: { color: Colors.info, fontSize: FontSize.xs, marginTop: 2 },
  orderFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  total: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  payment: { color: Colors.textMuted, fontSize: FontSize.xs },
  remitText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.md },
});
