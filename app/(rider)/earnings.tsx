import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { MOCK_RIDER_EARNINGS } from '@/constants/mockData';
import { useCurrency } from '@/hooks/useCurrency';
import { useAlert } from '@/template';

const PERIODS = ['Week', 'Month', 'Year'];

export default function RiderEarnings() {
  const [period, setPeriod] = useState('Week');
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();

  const totalEarnings = MOCK_RIDER_EARNINGS.reduce((s, d) => s + d.earnings, 0);
  const totalDeliveries = MOCK_RIDER_EARNINGS.reduce((s, d) => s + d.deliveries, 0);
  const maxEarnings = Math.max(...MOCK_RIDER_EARNINGS.map(d => d.earnings));

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
            <Text style={styles.totalStatValue}>{formatMoney(Math.round(totalEarnings / totalDeliveries))}</Text>
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
          {MOCK_RIDER_EARNINGS.map((d, i) => {
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
          })}
        </View>
        <Text style={styles.chartNote}>Numbers below bars = deliveries count</Text>
      </View>

      {/* Payout */}
      <View style={styles.payoutCard}>
        <View style={styles.payoutHeader}>
          <MaterialIcons name="account-balance-wallet" size={22} color={Colors.primary} />
          <Text style={styles.payoutTitle}>Payout Balance</Text>
        </View>
        <Text style={styles.payoutBalance}>{formatMoney(137300)}</Text>
        <Text style={styles.payoutNote}>Available for withdrawal</Text>
        <TouchableOpacity style={styles.withdrawBtn} onPress={() => showAlert('Withdrawal', 'Withdraw to your Mobile Money account. Feature coming with OnSpace Cloud!')}>
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
