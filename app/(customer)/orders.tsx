import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { Order } from '@/constants/mockData';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKey } from '@/contexts/LanguageContext';
import { registerForPushNotifications } from '@/services/notifications';
import { useAuth } from '@/hooks/useAuth';

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.warning,
  accepted: Colors.info,
  preparing: Colors.warning,
  ready: Colors.info,
  assigned: Colors.info,
  picked_up: Colors.primary,
  delivered: Colors.success,
  cancelled: Colors.error,
};

const STATUS_LABEL_KEYS: Record<string, TranslationKey> = {
  pending: 'pending',
  accepted: 'accepted',
  preparing: 'preparing',
  ready: 'ready',
  assigned: 'onTheWay',
  picked_up: 'onTheWay',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

export default function OrdersScreen() {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders } = useOrders();
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Register for push notifications so customer receives order updates
  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id).catch(() => undefined);
    }
  }, [user?.id]);

  const uniqueOrders = orders.filter(
    (order, index, all) => all.findIndex(item => item.id === order.id) === index
  );
  const activeOrders = uniqueOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const history      = uniqueOrders.filter(o =>  ['delivered', 'cancelled'].includes(o.status));
  const displayed    = tab === 'active' ? activeOrders : history;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>{t('myOrders')}</Text>

      <View style={styles.tabRow}>
        {(['active', 'history'] as const).map(tabKey => (
          <TouchableOpacity
            key={tabKey}
            style={[styles.tabBtn, tab === tabKey && styles.tabBtnActive]}
            onPress={() => setTab(tabKey)}
          >
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'active' ? t('active') : t('history')}
              {tabKey === 'active' && activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(o, index) => `${o.id}-${index}`}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            statusLabel={t(STATUS_LABEL_KEYS[item.status] || 'pending')}
            trackLabel={t('trackYourOrder')}
            formatMoney={formatMoney}
            onPress={() => router.push(`/order/${item.id}`)}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="receipt-long" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {tab === 'active' ? t('noActiveOrders') : t('noOrderHistory')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'active' ? t('placeOrderToSeeIt') : t('completedOrders')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function OrderCard({
  order,
  statusLabel,
  trackLabel,
  formatMoney,
  onPress,
}: {
  order: Order;
  statusLabel: string;
  trackLabel: string;
  formatMoney: (amount: number) => string;
  onPress: () => void;
}) {
  const statusColor = STATUS_COLORS[order.status] || Colors.textMuted;
  const isActive = !['delivered', 'cancelled'].includes(order.status);
  const totalEta = (order.prepTime || 0) + (order.deliveryTime || 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Status stripe */}
      <View style={[styles.cardStripe, { backgroundColor: statusColor }]} />

      <View style={styles.cardInner}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardRestaurant}>{order.restaurantName}</Text>
            <Text style={styles.cardId}>#{order.id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.cardItems}>
          {order.items.map((i, idx) => (
            <Text key={`${order.id}-${i.menuItem.id}-${idx}`} style={styles.itemText}>
              {i.quantity}x {i.menuItem.name}
            </Text>
          ))}
        </View>

        {/* ETA row — shows when vendor has set prep/delivery time */}
        {isActive && totalEta > 0 ? (
          <View style={styles.etaRow}>
            <MaterialIcons name="access-time" size={13} color={Colors.primary} />
            <Text style={styles.etaText}>~{totalEta} min estimated total</Text>
            {order.prepTime ? (
              <Text style={styles.etaMeta}>({order.prepTime}m prep + {order.deliveryTime}m delivery)</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.cardBottom}>
          <View style={styles.cardMeta}>
            <MaterialIcons name="payment" size={13} color={Colors.textMuted} />
            <Text style={styles.metaText}> {order.paymentMethod}</Text>
            {order.riderName ? (
              <>
                <Text style={styles.metaDot}>  •  </Text>
                <MaterialIcons name="delivery-dining" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}> {order.riderName}</Text>
              </>
            ) : null}
          </View>
          <Text style={styles.totalText}>{formatMoney(order.total)}</Text>
        </View>

        {isActive ? (
          <View style={styles.trackRow}>
            <MaterialIcons name="location-on" size={14} color={Colors.primary} />
            <Text style={styles.trackText}>{trackLabel}</Text>
            <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
          </View>
        ) : null}
      </View>
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
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.md },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.xs, textAlign: 'center' },
  card: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, overflow: 'hidden', flexDirection: 'row', ...Shadow.md },
  cardStripe: { width: 4 },
  cardInner: { flex: 1, padding: Spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardLeft: {},
  cardRestaurant: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  cardId: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  cardItems: { marginBottom: Spacing.sm, gap: 2 },
  itemText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary + '12', borderRadius: BorderRadius.sm, padding: Spacing.xs + 2, marginBottom: Spacing.sm },
  etaText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  etaMeta: { color: Colors.textMuted, fontSize: FontSize.xs },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: Colors.textMuted, fontSize: FontSize.xs },
  metaDot: { color: Colors.textMuted, fontSize: FontSize.xs },
  totalText: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  trackText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1, marginLeft: 4 },
});
