import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';

const MONTHLY_REVENUE = [1.2, 1.8, 2.1, 1.6, 2.8, 3.4, 2.9, 3.8, 4.2, 3.6, 4.5, 4.2];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_REV = Math.max(...MONTHLY_REVENUE);

const TOP_RESTAURANTS = [
  { name: 'Chicken Republic', revenue: 890000, orders: 342, growth: '+18%' },
  { name: 'Mama Put Kitchen', revenue: 634000, orders: 287, growth: '+12%' },
  { name: 'Grillmaster BBQ', revenue: 521000, orders: 198, growth: '+22%' },
  { name: 'Pizza Palace', revenue: 478000, orders: 167, growth: '+9%' },
  { name: 'Sushi & More', revenue: 312000, orders: 98, growth: '+31%' },
];

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('Month');
  const insets = useSafeAreaInsets();
  const { currency, formatMoney } = useCurrency();

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Platform Analytics</Text>

      {/* Period */}
      <View style={styles.periodRow}>
        {['Week', 'Month', 'Year'].map(p => (
          <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Monthly Revenue ({currency}M)</Text>
        <View style={styles.chart}>
          {MONTHLY_REVENUE.map((val, i) => {
            const height = Math.max(8, (val / MAX_REV) * 100);
            const isCurrentMonth = i === 4;
            return (
              <View key={MONTHS[i]} style={styles.barCol}>
                <Text style={styles.barVal}>{val}M</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height, backgroundColor: isCurrentMonth ? Colors.primary : Colors.primary + '50' }]} />
                </View>
                <Text style={[styles.barLabel, isCurrentMonth && { color: Colors.primary }]}>{MONTHS[i]}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpiGrid}>
        {[
          { label: 'GMV (Year)', value: formatMoney(34200000).replace(',200,000', '.2M'), icon: 'trending-up', color: Colors.success, change: '+67% YoY' },
          { label: 'Platform Fee', value: formatMoney(3400000).replace(',400,000', '.4M'), icon: 'account-balance', color: Colors.primary, change: '10% of GMV' },
          { label: 'Avg Order Value', value: formatMoney(3240), icon: 'shopping-cart', color: Colors.info, change: '+8% vs last yr' },
          { label: 'User Retention', value: '68%', icon: 'people', color: Colors.gold, change: '+5% MoM' },
        ].map(k => (
          <View key={k.label} style={styles.kpiCard}>
            <MaterialIcons name={k.icon as any} size={22} color={k.color} />
            <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
            <Text style={styles.kpiChange}>{k.change}</Text>
          </View>
        ))}
      </View>

      {/* Top Restaurants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performing Restaurants</Text>
        {TOP_RESTAURANTS.map((r, i) => (
          <View key={r.name} style={styles.topRow}>
            <View style={styles.topRank}><Text style={styles.rankText}>#{i + 1}</Text></View>
            <View style={styles.topInfo}>
              <Text style={styles.topName}>{r.name}</Text>
              <Text style={styles.topOrders}>{r.orders} orders</Text>
            </View>
            <View style={styles.topRight}>
              <Text style={styles.topRevenue}>{formatMoney(r.revenue).replace(',000', 'K')}</Text>
              <Text style={styles.topGrowth}>{r.growth}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Geographic */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Orders by Region</Text>
        {[
          { region: 'Lagos Island & VI', pct: 42, orders: 4821 },
          { region: 'Ikeja & Mainland', pct: 31, orders: 3562 },
          { region: 'Lekki & Ajah', pct: 18, orders: 2067 },
          { region: 'Other Areas', pct: 9, orders: 1034 },
        ].map(r => (
          <View key={r.region} style={styles.regionRow}>
            <View style={styles.regionInfo}>
              <Text style={styles.regionName}>{r.region}</Text>
              <Text style={styles.regionOrders}>{r.orders.toLocaleString()} orders</Text>
            </View>
            <View style={styles.regionBarContainer}>
              <View style={[styles.regionBar, { width: `${r.pct}%` }]} />
            </View>
            <Text style={styles.regionPct}>{r.pct}%</Text>
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
  chartCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  chartTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barVal: { color: Colors.textMuted, fontSize: 8, textAlign: 'center', marginBottom: 2 },
  barTrack: { width: '75%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3 },
  barLabel: { color: Colors.textMuted, fontSize: 8, marginTop: 4 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  kpiCard: { width: '47%', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  kpiValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  kpiLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  kpiChange: { color: Colors.success, fontSize: 10, fontWeight: FontWeight.semibold },
  section: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(204,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  rankText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  topInfo: { flex: 1 },
  topName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  topOrders: { color: Colors.textMuted, fontSize: FontSize.xs },
  topRight: { alignItems: 'flex-end' },
  topRevenue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  topGrowth: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  regionInfo: { width: 140 },
  regionName: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  regionOrders: { color: Colors.textMuted, fontSize: 10 },
  regionBarContainer: { flex: 1, height: 8, backgroundColor: Colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  regionBar: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  regionPct: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 30, textAlign: 'right' },
});
