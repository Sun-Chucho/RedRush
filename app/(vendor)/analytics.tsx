import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';

const PERIODS = ['Week', 'Month', 'Year'];

const WEEKLY_REVENUE = [38000, 52000, 41000, 67000, 88000, 71000, 47500];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TOP_ITEMS = [
  { name: 'Mighty Burger', orders: 67, revenue: 301500, trend: '+12%' },
  { name: 'Spicy Wings', orders: 54, revenue: 172800, trend: '+8%' },
  { name: 'Jollof Rice', orders: 48, revenue: 134400, trend: '-2%' },
  { name: 'Mega Shawarma', orders: 42, revenue: 147000, trend: '+15%' },
  { name: 'Zobo Drink', orders: 38, revenue: 30400, trend: '+3%' },
];

export default function VendorAnalytics() {
  const [period, setPeriod] = useState('Week');
  const insets = useSafeAreaInsets();
  const { formatMoney } = useCurrency();
  const maxRevenue = Math.max(...WEEKLY_REVENUE);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Analytics</Text>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue Summary */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>Total Revenue ({period})</Text>
        <Text style={styles.revenueValue}>{formatMoney(405000)}</Text>
        <View style={styles.revenueChange}>
          <MaterialIcons name="trending-up" size={16} color={Colors.success} />
          <Text style={styles.revenueChangeText}> +18% vs last {period.toLowerCase()}</Text>
        </View>
      </View>

      {/* Key Stats */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Orders', value: '156', icon: 'receipt-long', color: Colors.primary },
          { label: 'Avg Order', value: formatMoney(2596), icon: 'trending-up', color: Colors.success },
          { label: 'Customers', value: '89', icon: 'people', color: Colors.info },
          { label: 'Rating', value: '4.8 ⭐', icon: 'star', color: Colors.gold },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <MaterialIcons name={s.icon as any} size={22} color={s.color} />
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Revenue</Text>
        <View style={styles.chart}>
          {WEEKLY_REVENUE.map((val, i) => {
            const height = Math.max(8, (val / maxRevenue) * 120);
            const isToday = i === 6;
            return (
              <View key={i} style={styles.barCol}>
                <Text style={styles.barValue}>{formatMoney(Math.round(val / 1000) * 1000).replace(',000', 'k')}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height, backgroundColor: isToday ? Colors.primary : Colors.primary + '55' }]} />
                </View>
                <Text style={[styles.barDay, isToday && { color: Colors.primary }]}>{DAYS[i]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Top Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Selling Items</Text>
        {TOP_ITEMS.map((item, i) => (
          <View key={item.name} style={styles.topItem}>
            <View style={styles.topItemRank}>
              <Text style={styles.rankText}>#{i + 1}</Text>
            </View>
            <View style={styles.topItemInfo}>
              <Text style={styles.topItemName}>{item.name}</Text>
              <Text style={styles.topItemOrders}>{item.orders} orders</Text>
            </View>
            <View style={styles.topItemRight}>
              <Text style={styles.topItemRevenue}>{formatMoney(item.revenue)}</Text>
              <Text style={[styles.topItemTrend, { color: item.trend.startsWith('+') ? Colors.success : Colors.error }]}>{item.trend}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Order Status Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Status</Text>
        {[
          { label: 'Delivered', count: 134, pct: 86, color: Colors.success },
          { label: 'Cancelled', count: 12, pct: 8, color: Colors.error },
          { label: 'In Progress', count: 10, pct: 6, color: Colors.warning },
        ].map(s => (
          <View key={s.label} style={styles.statusRow}>
            <Text style={styles.statusLabel}>{s.label}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${s.pct}%`, backgroundColor: s.color }]} />
            </View>
            <Text style={[styles.statusCount, { color: s.color }]}>{s.count}</Text>
          </View>
        ))}
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
  statCard: { flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  chartCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  chartTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 160 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { color: Colors.textMuted, fontSize: 9, marginBottom: 4, textAlign: 'center' },
  barTrack: { width: '70%', justifyContent: 'flex-end' },
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
  topItemRight: { alignItems: 'flex-end' },
  topItemRevenue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  topItemTrend: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  statusLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, width: 80 },
  progressBar: { flex: 1, height: 8, backgroundColor: Colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  statusCount: { width: 30, textAlign: 'right', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
