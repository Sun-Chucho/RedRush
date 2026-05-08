import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';

const PERIODS = ['Week', 'Month', 'Year'];

export default function RiderEarnings() {
  const [period, setPeriod] = useState('Week');
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();
  const { user } = useAuth();
  const { orders } = useOrders();

  const deliveredOrders = orders.filter(order => order.riderId === user?.id && order.status === 'delivered');
  const totalDeliveries = deliveredOrders.length;
  const totalEarnings = deliveredOrders.reduce((sum, order) => sum + Math.max(900, Math.round(order.deliveryFee * 0.8)), 0);
  const averageEarnings = totalDeliveries ? Math.round(totalEarnings / totalDeliveries) : 0;
  const chartRows = Object.values(
    deliveredOrders.reduce<Record<string, { date: string; earnings: number; deliveries: number }>>((acc, order) => {
      const key = new Date(order.deliveredAt || order.createdAt).toLocaleDateString(undefined, { weekday: 'short' });
      const earnings = Math.max(900, Math.round(order.deliveryFee * 0.8));
      acc[key] = acc[key] || { date: key, earnings: 0, deliveries: 0 };
      acc[key].earnings += earnings;
      acc[key].deliveries += 1;
      return acc;
    }, {})
  );
  const maxEarnings = Math.max(...chartRows.map(d => d.earnings), 1);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>My Earnings</Text>

      {/* Period */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Earnings ({period})</Text>
        <Text style={styles.totalValue}>{formatMoney(totalEarnings)}</Text>
        <View style={styles.totalStats}>
          <View style={styles.totalStat}>
            <Text style={styles.totalStatValue}>{totalDeliveries}</Text>
            <Text style={styles.totalStatLabel}>Deliveries</Text>
          </View>
          <View style={styles.totalStatDivider} />
          <View style={styles.totalStat}>
            <Text style={styles.totalStatValue}>{formatMoney(averageEarnings)}</Text>
            <Text style={styles.totalStatLabel}>Avg per trip</Text>
          </View>
          <View style={styles.totalStatDivider} />
          <View style={styles.totalStat}>
            <Text style={styles.totalStatValue}>4.9 ⭐</Text>
            <Text style={styles.totalStatLabel}>Rating</Text>
          </View>
        </View>
      </View>

      {/* Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Breakdown</Text>
        <View style={styles.chart}>
          {chartRows.length ? chartRows.map((d, i) => {
            const height = Math.max(8, (d.earnings / maxEarnings) * 100);
            return (
              <View key={d.date} style={styles.barCol}>
                <Text style={styles.barVal}>{formatMoney(Math.round(d.earnings / 1000) * 1000).replace(',000', 'k')}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height, backgroundColor: i === 5 ? Colors.primary : Colors.primary + '55' }]} />
                </View>
                <Text style={styles.barDay}>{d.date}</Text>
                <Text style={styles.barDeliveries}>{d.deliveries}</Text>
              </View>
            );
          }) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No delivered trips yet.</Text>
            </View>
          )}
        </View>
        <Text style={styles.chartNote}>Numbers below bars = deliveries count</Text>
      </View>

      {/* Payout */}
      <View style={styles.payoutCard}>
        <View style={styles.payoutHeader}>
          <MaterialIcons name="account-balance-wallet" size={22} color={Colors.primary} />
          <Text style={styles.payoutTitle}>Payout Balance</Text>
        </View>
        <Text style={styles.payoutBalance}>{formatMoney(totalEarnings)}</Text>
        <Text style={styles.payoutNote}>Available for withdrawal</Text>
        <TouchableOpacity style={styles.withdrawBtn} onPress={() => showAlert('Withdrawal', `Withdrawal request for ${formatMoney(totalEarnings)} has been queued for Mobile Money payout review.`)}>
          <MaterialIcons name="phone-android" size={18} color={Colors.text} />
          <Text style={styles.withdrawText}>Withdraw via Mobile Money</Text>
        </TouchableOpacity>
      </View>

      {/* Bonus */}
      <View style={styles.bonusCard}>
        <MaterialIcons name="local-fire-department" size={28} color={Colors.warning} />
        <View style={styles.bonusInfo}>
          <Text style={styles.bonusTitle}>Weekend Bonus Active 🔥</Text>
          <Text style={styles.bonusDesc}>Complete 5 more deliveries to earn {formatMoney(3000)} bonus</Text>
          <View style={styles.bonusProgress}>
            <View style={[styles.bonusFill, { width: '60%' }]} />
          </View>
          <Text style={styles.bonusCount}>3/5 deliveries done</Text>
        </View>
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
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 140 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barVal: { color: Colors.textMuted, fontSize: 9, textAlign: 'center', marginBottom: 4 },
  barTrack: { width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barDay: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
  barDeliveries: { color: Colors.primary, fontSize: 9, fontWeight: FontWeight.bold },
  chartNote: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.sm },
  emptyChart: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  payoutCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  payoutHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  payoutTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  payoutBalance: { color: Colors.success, fontSize: 32, fontWeight: FontWeight.extrabold },
  payoutNote: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.md },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 12, gap: Spacing.sm },
  withdrawText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  bonusCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  bonusInfo: { flex: 1 },
  bonusTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  bonusDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4 },
  bonusProgress: { height: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 3, overflow: 'hidden', marginTop: Spacing.sm },
  bonusFill: { height: '100%', backgroundColor: Colors.warning, borderRadius: 3 },
  bonusCount: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 4 },
});
