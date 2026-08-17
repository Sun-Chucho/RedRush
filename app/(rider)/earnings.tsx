/**
 * Rider Earnings Screen — real Supabase data with period filtering
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow, createThemedStyles } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';

type Period = 'Week' | 'Month' | 'Year';
const PERIODS: Period[] = ['Week', 'Month', 'Year'];

interface DailyBar {
  label: string;
  earnings: number;
  deliveries: number;
}

function getPeriodStart(period: Period): Date {
  const now = new Date();
  if (period === 'Week') {
    const d = new Date(now);
    d.setDate(now.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'Month') {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function formatLabel(date: Date, period: Period): string {
  if (period === 'Week') return date.toLocaleDateString([], { weekday: 'short' });
  if (period === 'Month') return date.toLocaleDateString([], { day: 'numeric' });
  return date.toLocaleDateString([], { month: 'short' });
}

function calculateRiderEarning(deliveryFee = 0): number {
  return Math.max(0, Math.round(Number(deliveryFee || 0) * 0.8));
}

export default function RiderEarnings() {
  const [period, setPeriod] = useState<Period>('Week');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const { formatMoney } = useCurrency();
  const { user } = useAuth();
  const { orders, refreshOrders } = useOrders();

  // Filter delivered orders by this rider in the selected period
  const periodStart = getPeriodStart(period);

  const myDeliveries = orders.filter(o => {
    if (o.riderId !== user?.id) return false;
    if (o.status !== 'delivered') return false;
    const d = new Date(o.deliveredAt || o.createdAt || '');
    return d >= periodStart;
  });

  const totalEarnings = myDeliveries.reduce((sum, o) => sum + calculateRiderEarning(o.deliveryFee), 0);
  const totalDeliveries = myDeliveries.length;
  const avgPerTrip = totalDeliveries ? Math.round(totalEarnings / totalDeliveries) : 0;

  // Build chart bars
  const chartBars: DailyBar[] = (() => {
    const map: Record<string, DailyBar> = {};

    for (const o of myDeliveries) {
      const date = new Date(o.deliveredAt || o.createdAt || '');
      const label = formatLabel(date, period);
      const earned = calculateRiderEarning(o.deliveryFee);
      if (!map[label]) map[label] = { label, earnings: 0, deliveries: 0 };
      map[label].earnings += earned;
      map[label].deliveries += 1;
    }

    return Object.values(map).slice(-7); // max 7 bars
  })();

  const maxEarnings = Math.max(...chartBars.map(d => d.earnings), 1);

  // All-time delivered for lifetime total
  const lifetimeOrders = orders.filter(o => o.riderId === user?.id && o.status === 'delivered');
  const lifetimeEarnings = lifetimeOrders.reduce((sum, o) => sum + calculateRiderEarning(o.deliveryFee), 0);

  // Bonus logic: needs 5 deliveries this week
  const weekStart = getPeriodStart('Week');
  const weekDeliveries = orders.filter(o => {
    if (o.riderId !== user?.id || o.status !== 'delivered') return false;
    return new Date(o.deliveredAt || o.createdAt || '') >= weekStart;
  }).length;
  const bonusGoal = 5;
  const bonusProgress = Math.min(weekDeliveries, bonusGoal);
  const bonusEarned = bonusProgress >= bonusGoal;
  const bonusAmount = 3000;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshOrders().catch(() => undefined);
    setRefreshing(false);
  }, [refreshOrders]);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <Text style={styles.title}>My Earnings</Text>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total Earnings Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Earnings · This {period}</Text>
        <Text style={styles.totalValue}>{formatMoney(totalEarnings)}</Text>
        <View style={styles.totalStats}>
          <View style={styles.totalStat}>
            <Text style={styles.totalStatValue}>{totalDeliveries}</Text>
            <Text style={styles.totalStatLabel}>Deliveries</Text>
          </View>
          <View style={styles.totalStatDivider} />
          <View style={styles.totalStat}>
            <Text style={styles.totalStatValue}>{formatMoney(avgPerTrip)}</Text>
            <Text style={styles.totalStatLabel}>Avg / trip</Text>
          </View>
          <View style={styles.totalStatDivider} />
          <View style={styles.totalStat}>
            <Text style={styles.totalStatValue}>{lifetimeOrders.length}</Text>
            <Text style={styles.totalStatLabel}>All-time trips</Text>
          </View>
        </View>
      </View>

      {/* Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>
          {period === 'Week' ? 'Daily' : period === 'Month' ? 'By Day' : 'By Month'} Breakdown
        </Text>
        <View style={styles.chart}>
          {chartBars.length > 0 ? chartBars.map((d, i) => {
            const barH = Math.max(6, (d.earnings / maxEarnings) * 110);
            const isLatest = i === chartBars.length - 1;
            return (
              <View key={d.label} style={styles.barCol}>
                <Text style={styles.barVal}>
                  {d.earnings >= 1000
                    ? `${(d.earnings / 1000).toFixed(1)}k`
                    : String(d.earnings)}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[
                    styles.bar,
                    { height: barH, backgroundColor: isLatest ? Colors.primary : Colors.primary + '55' }
                  ]} />
                </View>
                <Text style={styles.barDay}>{d.label}</Text>
                <Text style={styles.barDeliveries}>{d.deliveries}</Text>
              </View>
            );
          }) : (
            <View style={styles.emptyChart}>
              <MaterialIcons name="bar-chart" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {totalDeliveries === 0
                  ? `No deliveries this ${period.toLowerCase()} yet.`
                  : 'No chart data available.'}
              </Text>
            </View>
          )}
        </View>
        {chartBars.length > 0 ? (
          <Text style={styles.chartNote}>Numbers below bars = deliveries count</Text>
        ) : null}
      </View>

      {/* Payout Balance Card */}
      <View style={styles.payoutCard}>
        <View style={styles.payoutHeader}>
          <MaterialIcons name="account-balance-wallet" size={22} color={Colors.primary} />
          <Text style={styles.payoutTitle}>Estimated Delivery Earnings</Text>
        </View>
        <Text style={styles.payoutBalance}>{formatMoney(lifetimeEarnings)}</Text>
        <Text style={styles.payoutNote}>Withdrawals are coming soon. Identity and payout verification will be required.</Text>
        <TouchableOpacity style={[styles.withdrawBtn, styles.withdrawBtnDisabled]} disabled>
          <MaterialIcons name="lock-clock" size={18} color={Colors.textMuted} />
          <Text style={styles.withdrawTextDisabled}>Withdrawals — Coming soon · Verification required</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly Bonus Card */}
      <View style={styles.bonusCard}>
        <MaterialIcons
          name={bonusEarned ? 'emoji-events' : 'local-fire-department'}
          size={28}
          color={Colors.warning}
        />
        <View style={styles.bonusInfo}>
          <Text style={styles.bonusTitle}>
            {bonusEarned ? 'Bonus target reached' : 'Weekly bonus preview'}
          </Text>
          <Text style={styles.bonusDesc}>
            {bonusEarned
              ? `You completed ${bonusGoal}+ deliveries. Bonus payouts are coming soon.`
              : `Complete ${bonusGoal - bonusProgress} more deliveries to reach the ${formatMoney(bonusAmount)} target`}
          </Text>
          <View style={styles.bonusProgress}>
            <View style={[styles.bonusFill, { width: `${(bonusProgress / bonusGoal) * 100}%` }]} />
          </View>
          <Text style={styles.bonusCount}>{bonusProgress}/{bonusGoal} deliveries done</Text>
        </View>
      </View>

      {/* Delivery History */}
      {myDeliveries.length > 0 ? (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Delivery History · {period}</Text>
          {myDeliveries.slice(0, 10).map((o, i) => {
            const earned = calculateRiderEarning(o.deliveryFee);
            return (
              <View key={`${o.id}-${i}`} style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  <MaterialIcons name="delivery-dining" size={16} color={Colors.primary} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyRestaurant}>{o.restaurantName}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(o.deliveredAt || o.createdAt || '').toLocaleDateString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={styles.historyAmount}>+{formatMoney(earned)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = createThemedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },

  periodRow: { flexDirection: 'row', marginHorizontal: Spacing.md, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.md },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.sm },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  periodTextActive: { color: Colors.text },

  totalCard: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, marginHorizontal: Spacing.md, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.lg },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },
  totalValue: { color: Colors.text, fontSize: 36, fontWeight: FontWeight.extrabold, marginVertical: 6 },
  totalStats: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
  totalStat: { flex: 1, alignItems: 'center' },
  totalStatValue: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  totalStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginTop: 2 },
  totalStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  chartCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  chartTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', minHeight: 140 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barVal: { color: Colors.textMuted, fontSize: 9, textAlign: 'center', marginBottom: 4 },
  barTrack: { width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barDay: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
  barDeliveries: { color: Colors.primary, fontSize: 9, fontWeight: FontWeight.bold },
  chartNote: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.sm },
  emptyChart: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },

  payoutCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  payoutHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  payoutTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  payoutBalance: { color: Colors.success, fontSize: 32, fontWeight: FontWeight.extrabold },
  payoutNote: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.md },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 12, gap: Spacing.sm },
  withdrawBtnDisabled: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  withdrawTextDisabled: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  withdrawText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },

  bonusCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.warning + '12', borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.warning + '30', marginBottom: Spacing.md },
  bonusInfo: { flex: 1 },
  bonusTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  bonusDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4 },
  bonusProgress: { height: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 3, overflow: 'hidden', marginTop: Spacing.sm },
  bonusFill: { height: '100%', backgroundColor: Colors.warning, borderRadius: 3 },
  bonusCount: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 4 },

  historyCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  historyTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  historyIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary + '18', justifyContent: 'center', alignItems: 'center' },
  historyInfo: { flex: 1 },
  historyRestaurant: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  historyDate: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  historyAmount: { color: Colors.success, fontSize: FontSize.body, fontWeight: FontWeight.bold },
}));
