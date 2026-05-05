import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/constants/mockData';

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.warning,
  accepted: Colors.info,
  preparing: Colors.warning,
  ready: Colors.info,
  picked_up: Colors.primary,
  delivered: Colors.success,
  cancelled: Colors.error,
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  picked_up: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function OrdersScreen() {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders } = useOrders();

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const history = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));
  const displayed = tab === 'active' ? activeOrders : history;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>My Orders</Text>

      {/* Tab */}
      <View style={styles.tabRow}>
        {(['active', 'history'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'active' ? 'Active' : 'History'}
              {t === 'active' && activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={o => o.id}
        renderItem={({ item }) => <OrderCard order={item} onPress={() => router.push(`/order/${item.id}`)} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="receipt-long" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{tab === 'active' ? 'No active orders' : 'No order history'}</Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'active' ? 'Place an order to see it here' : 'Your completed orders will appear here'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const statusColor = STATUS_COLORS[order.status] || Colors.textMuted;
  const total = order.items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardRestaurant}>{order.restaurantName}</Text>
          <Text style={styles.cardId}>#{order.id.slice(-6).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[order.status]}</Text>
        </View>
      </View>

      <View style={styles.cardItems}>
        {order.items.map((i, idx) => (
          <Text key={idx} style={styles.itemText}>
            {i.quantity}x {i.menuItem.name}
          </Text>
        ))}
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.cardMeta}>
          <MaterialIcons name="payment" size={14} color={Colors.textMuted} />
          <Text style={styles.metaText}> {order.paymentMethod}</Text>
          {order.riderName ? (
            <>
              <Text style={styles.metaDot}>  •  </Text>
              <MaterialIcons name="delivery-dining" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}> {order.riderName}</Text>
            </>
          ) : null}
        </View>
        <Text style={styles.totalText}>₦{order.total.toLocaleString()}</Text>
      </View>

      {!['delivered', 'cancelled'].includes(order.status) ? (
        <View style={styles.trackRow}>
          <MaterialIcons name="location-on" size={14} color={Colors.primary} />
          <Text style={styles.trackText}>Track your order</Text>
          <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tabTextActive: { color: Colors.text },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  card: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, padding: Spacing.md, ...Shadow.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardLeft: {},
  cardRestaurant: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  cardId: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  cardItems: { marginBottom: Spacing.sm, gap: 2 },
  itemText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: Colors.textMuted, fontSize: FontSize.xs },
  metaDot: { color: Colors.textMuted, fontSize: FontSize.xs },
  totalText: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  trackText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1, marginLeft: 4 },
});
