import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, useWindowDimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow, createThemedStyles, createThemedValues } from '@/constants/theme';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { Order } from '@/constants/mockData';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKey } from '@/contexts/LanguageContext';
import { registerForPushNotifications } from '@/services/notifications';
import { useAuth } from '@/hooks/useAuth';

const STATUS_COLORS: Record<string, string> = createThemedValues(() => ({
  pending: Colors.warning,
  accepted: Colors.info,
  preparing: Colors.warning,
  ready: Colors.info,
  assigned: Colors.info,
  picked_up: Colors.primary,
  delivered: Colors.success,
  cancelled: Colors.error,
}));

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

type HistoryFilter = 'all' | 'delivered' | 'cancelled';

const HISTORY_FILTERS: { key: HistoryFilter; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'receipt-long' },
  { key: 'delivered', label: 'Delivered', icon: 'check-circle' },
  { key: 'cancelled', label: 'Cancelled', icon: 'cancel' },
];

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'highest', label: 'Highest total' },
  { key: 'lowest', label: 'Lowest total' },
];

export default function OrdersScreen() {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders } = useOrders();
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id, { requestPermission: false }).catch(() => undefined);
    }
  }, [user?.id]);

  const uniqueOrders = useMemo(
    () => orders.filter((order, index, all) => all.findIndex(item => item.id === order.id) === index),
    [orders]
  );

  const activeOrders = useMemo(
    () => uniqueOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)),
    [uniqueOrders]
  );

  const historyOrders = useMemo(() => {
    let base = uniqueOrders.filter(o => ['delivered', 'cancelled'].includes(o.status));
    if (historyFilter !== 'all') {
      base = base.filter(o => o.status === historyFilter);
    }
    return base.slice().sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'highest') return b.total - a.total;
      if (sortBy === 'lowest') return a.total - b.total;
      return 0;
    });
  }, [uniqueOrders, historyFilter, sortBy]);

  const displayed = tab === 'active' ? activeOrders : historyOrders;

  const deliveredCount = useMemo(
    () => uniqueOrders.filter(o => o.status === 'delivered').length,
    [uniqueOrders]
  );
  const cancelledCount = useMemo(
    () => uniqueOrders.filter(o => o.status === 'cancelled').length,
    [uniqueOrders]
  );

  const currentSortLabel = SORT_OPTIONS.find(s => s.key === sortBy)?.label || 'Sort';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={[styles.headerTitle, isWide && styles.contentWidth]}>{t('myOrders')}</Text>

      {/* Tab Row */}
      <View style={[styles.tabRow, isWide && styles.contentWidth]}>
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

      {/* History Filters */}
      {tab === 'history' ? (
        <View style={[styles.filtersWrap, isWide && styles.contentWidth]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {HISTORY_FILTERS.map(f => {
              const isSelected = historyFilter === f.key;
              const count = f.key === 'delivered' ? deliveredCount : f.key === 'cancelled' ? cancelledCount : deliveredCount + cancelledCount;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setHistoryFilter(f.key)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={f.icon}
                    size={14}
                    color={isSelected
                      ? Colors.text
                      : f.key === 'cancelled'
                        ? Colors.error
                        : f.key === 'delivered'
                          ? Colors.success
                          : Colors.textMuted}
                  />
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                  {count > 0 ? (
                    <View style={[styles.filterBadge, isSelected && styles.filterBadgeActive]}>
                      <Text style={[styles.filterBadgeText, isSelected && styles.filterBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sort Button */}
          <View style={styles.sortWrap}>
            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => setShowSortMenu(v => !v)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="sort" size={16} color={Colors.primary} />
              <Text style={styles.sortBtnText} numberOfLines={1}>{currentSortLabel}</Text>
              <MaterialIcons name={showSortMenu ? 'expand-less' : 'expand-more'} size={16} color={Colors.primary} />
            </TouchableOpacity>

            {showSortMenu ? (
              <View style={styles.sortDropdown}>
                {SORT_OPTIONS.map(s => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.sortOption, sortBy === s.key && styles.sortOptionActive]}
                    onPress={() => { setSortBy(s.key); setShowSortMenu(false); }}
                  >
                    {sortBy === s.key ? (
                      <MaterialIcons name="check" size={14} color={Colors.primary} />
                    ) : (
                      <View style={{ width: 14 }} />
                    )}
                    <Text style={[styles.sortOptionText, sortBy === s.key && styles.sortOptionTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <FlatList
        key={isWide ? 'orders-grid' : 'orders-list'}
        numColumns={isWide ? 2 : 1}
        columnWrapperStyle={isWide ? styles.listRow : undefined}
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
        contentContainerStyle={[styles.list, isWide && styles.listWide]}
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

        {isActive && totalEta > 0 ? (
          <View style={styles.etaRow}>
            <MaterialIcons name="access-time" size={13} color={Colors.primary} />
            <Text style={styles.etaText}>~{totalEta} min estimated total</Text>
            {order.prepTime ? (
              <Text style={styles.etaMeta}>({order.prepTime}m prep + {order.deliveryTime}m delivery)</Text>
            ) : null}
          </View>
        ) : null}

        {order.status === 'delivered' && order.createdAt ? (
          <View style={styles.dateRow}>
            <MaterialIcons name="event" size={12} color={Colors.textMuted} />
            <Text style={styles.dateText}>
              {new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
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

const styles = createThemedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  contentWidth: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  headerTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },

  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tabTextActive: { color: Colors.text },

  filtersWrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.xs },
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingRight: Spacing.sm },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  filterChipTextActive: { color: Colors.text },
  filterBadge: {
    backgroundColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterBadgeText: { color: Colors.textMuted, fontSize: 10, fontWeight: FontWeight.bold },
  filterBadgeTextActive: { color: Colors.text },

  sortWrap: { position: 'relative', marginRight: Spacing.md },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 110,
  },
  sortBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, flex: 1 },
  sortDropdown: {
    position: 'absolute',
    top: 38,
    right: 0,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 100,
    minWidth: 160,
    ...Shadow.md,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortOptionActive: { backgroundColor: Colors.primary + '18' },
  sortOptionText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  sortOptionTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },

  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  listWide: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingBottom: Spacing.xl },
  listRow: { gap: Spacing.md },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.md },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.xs, textAlign: 'center' },

  card: { flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, overflow: 'hidden', flexDirection: 'row', ...Shadow.md },
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
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.xs },
  dateText: { color: Colors.textMuted, fontSize: FontSize.xs },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: Colors.textMuted, fontSize: FontSize.xs },
  metaDot: { color: Colors.textMuted, fontSize: FontSize.xs },
  totalText: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  trackText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1, marginLeft: 4 },
}));
