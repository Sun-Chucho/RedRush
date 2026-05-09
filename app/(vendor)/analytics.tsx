import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { useOrders } from '@/hooks/useOrders';
import { useRestaurants } from '@/hooks/useRestaurants';

const PERIODS = ['Week', 'Month', 'Year'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function VendorAnalytics() {
  const [period, setPeriod] = useState('Week');
  const insets = useSafeAreaInsets();
  const { formatMoney } = useCurrency();
  const { orders } = useOrders();
  const { getVendorRestaurant } = useRestaurants();
  const restaurant = getVendorRestaurant();
  const deliveredOrders = orders.filter(order => order.status === 'delivered');
  const activeOrders = orders.filter(order => ['pending', 'accepted', 'preparing', 'ready', 'picked_up'].includes(order.status));
  const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = deliveredOrders.length ? Math.round(totalRevenue / deliveredOrders.length) : 0;

  const revenueByDay = useMemo(() => {
    const rows = DAYS.map(day => ({ day, revenue: 0, orders: 0 }));
    deliveredOrders.forEach(order => {
      const index = new Date(order.deliveredAt || order.createdAt).getDay();
      rows[index].revenue += order.total;
      rows[index].orders += 1;
    });
    return rows;
  }, [deliveredOrders]);

  const topItems = useMemo(() => {
    const itemMap = new Map<string, { name: string; orders: number; revenue: number }>();
    deliveredOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = itemMap.get(item.menuItem.id) || { name: item.menuItem.name, orders: 0, revenue: 0 };
        existing.orders += item.quantity;
        existing.revenue += item.menuItem.price * item.quantity;
        itemMap.set(item.menuItem.id, existing);
      });
    });
    return Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [deliveredOrders]);

  const maxRevenue = Math.max(...revenueByDay.map(row => row.revenue), 1);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Analytics</Text>

      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>Total Revenue ({period})</Text>
        <Text style={styles.revenueValue}>{formatMoney(totalRevenue)}</Text>
        <View style={styles.revenueChange}>
          <MaterialIcons name="bar-chart" size={16} color={Colors.text} />
          <Text style={styles.revenueChangeText}> Real delivered order revenue only</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: 'Orders', value: String(orders.length), icon: 'receipt-long', color: Colors.primary },
          { label: 'Avg Order', value: formatMoney(averageOrderValue), icon: 'trending-up', color: Colors.success },
          { label: 'Active', value: String(activeOrders.length), icon: 'schedule', color: Colors.info },
          { label: 'Menu', value: String(restaurant?.menu.length || 0), icon: 'restaurant-menu', color: Colors.gold },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <MaterialIcons name={s.icon as any} size={22} color={s.color} />
            <Text style={[styles.statValue, { color: s.color }]} numberOfLines={1}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Revenue</Text>
        <View style={styles.chart}>
          {revenueByDay.map((row, i) => {
            const height = row.revenue ? Math.max(8, (row.revenue / maxRevenue) * 120) : 0;
            return (
              <View key={row.day} style={styles.barCol}>
                <Text style={styles.barValue}>{row.revenue ? formatMoney(Math.round(row.revenue / 1000) * 1000).replace(',000', 'k') : '-'}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height, backgroundColor: i === new Date().getDay() ? Colors.primary : Colors.primary + '55' }]} />
                </View>
                <Text style={[styles.barDay, i === new Date().getDay() && { color: Colors.primary }]}>{row.day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Selling Items</Text>
        {topItems.length ? topItems.map((item, i) => (
          <View key={item.name} style={styles.topItem}>
            <View style={styles.topItemRank}><Text style={styles.rankText}>#{i + 1}</Text></View>
            <View style={styles.topItemInfo}>
              <Text style={styles.topItemName}>{item.name}</Text>
              <Text style={styles.topItemOrders}>{item.orders} sold</Text>
            </View>
            <Text style={styles.topItemRevenue}>{formatMoney(item.revenue)}</Text>
          </View>
        )) : (
          <Text style={styles.emptyText}>No delivered orders yet. Analytics will populate from real sales.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Status</Text>
        {[
          { label: 'Delivered', count: deliveredOrders.length, color: Colors.success },
          { label: 'Cancelled', count: orders.filter(order => order.status === 'cancelled').length, color: Colors.error },
          { label: 'In Progress', count: activeOrders.length, color: Colors.warning },
        ].map(s => {
          const pct = orders.length ? Math.round((s.count / orders.length) * 100) : 0;
          return (
            <View key={s.label} style={styles.statusRow}>
              <Text style={styles.statusLabel}>{s.label}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: s.color }]} />
              </View>
              <Text style={[styles.statusCount, { color: s.color }]}>{s.count}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  periodRow: { flexDirection: 'row', marginHorizontal: Spacing.md, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.md },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.sm },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  periodTextActive: { color: Colors.text },
  revenueCard: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, marginHorizontal: Spacing.md, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.lg },
  revenueLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },
  revenueValue: { color: Colors.text, fontSize: FontSize.hero, fontWeight: FontWeight.extrabold, marginTop: 4 },
  revenueChange: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  revenueChangeText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  statsGrid: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  chartCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  chartTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 160 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { color: Colors.textMuted, fontSize: 9, marginBottom: 4, textAlign: 'center' },
  barTrack: { width: '70%', height: 120, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barDay: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  section: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  topItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topItemRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(204,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  rankText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  topItemInfo: { flex: 1 },
  topItemName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  topItemOrders: { color: Colors.textMuted, fontSize: FontSize.xs },
  topItemRevenue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  statusLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, width: 80 },
  progressBar: { flex: 1, height: 8, backgroundColor: Colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  statusCount: { width: 30, textAlign: 'right', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20 },
});
