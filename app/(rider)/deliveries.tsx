import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useOrders } from '@/hooks/useOrders';

function calculateRiderEarning(deliveryFee = 0): number {
  return Math.max(0, Math.round(Number(deliveryFee || 0) * 0.8));
}

export default function RiderDeliveries() {
  const [filter, setFilter] = useState('All');
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { formatMoney } = useCurrency();
  const { orders } = useOrders();

  const deliveries = orders
    .filter(order => order.riderId === user?.id && ['delivered', 'cancelled'].includes(order.status))
    .map(order => {
      const deliveredAt = order.deliveredAt || order.createdAt;
      return {
        id: order.id,
        restaurant: order.restaurantName,
        customer: order.customerName || 'Customer',
        address: order.address,
        distance: 'Live route',
        earnings: calculateRiderEarning(order.deliveryFee),
        status: order.status === 'delivered' ? 'completed' : 'cancelled',
        time: new Date(deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(deliveredAt).toDateString() === new Date().toDateString() ? 'Today' : new Date(deliveredAt).toLocaleDateString(),
      };
    });
  const filtered = deliveries.filter(d => filter === 'All' || d.status === filter.toLowerCase());

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Delivery History</Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Completed', value: deliveries.filter(d => d.status === 'completed').length.toString(), color: Colors.success },
          { label: 'Cancelled', value: deliveries.filter(d => d.status === 'cancelled').length.toString(), color: Colors.error },
          { label: 'Total Earnings', value: formatMoney(deliveries.filter(d => d.status === 'completed').reduce((sum, item) => sum + item.earnings, 0)), color: Colors.info },
        ].map(s => (
          <View key={s.label} style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {['All', 'Completed', 'Cancelled'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.deliveryCard, { borderLeftColor: item.status === 'completed' ? Colors.success : Colors.error }]}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.restaurantName}>{item.restaurant}</Text>
                <Text style={styles.customerName}>{item.customer}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.earning, { color: item.status === 'completed' ? Colors.success : Colors.textMuted }]}>
                  {item.status === 'completed' ? `+${formatMoney(item.earnings)}` : 'Cancelled'}
                </Text>
                <Text style={styles.cardTime}>{item.date}  {item.time}</Text>
              </View>
            </View>
            <View style={styles.cardMeta}>
              <MaterialIcons name="location-on" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}> {item.address}</Text>
              <MaterialIcons name="straighten" size={12} color={Colors.textMuted} style={{ marginLeft: 8 }} />
              <Text style={styles.metaText}> {item.distance}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="inbox" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No delivery history yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: { flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  summaryLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  filterBtn: { paddingHorizontal: 16, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceCard, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  filterTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  deliveryCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 4, ...Shadow.md },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  restaurantName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  customerName: { color: Colors.textMuted, fontSize: FontSize.xs },
  cardRight: { alignItems: 'flex-end' },
  earning: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  cardTime: { color: Colors.textMuted, fontSize: FontSize.xs },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: Colors.textMuted, fontSize: FontSize.xs },
});
