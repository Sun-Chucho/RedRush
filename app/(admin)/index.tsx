import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useAlert } from '@/template';
import { MOCK_ORDERS } from '@/constants/mockData';

const PENDING_APPROVALS = [
  { id: 'p1', name: 'Delicious Kitchen', type: 'Restaurant', submitted: '2 hours ago' },
  { id: 'p2', name: 'Kola Rides Ltd', type: 'Rider', submitted: '5 hours ago' },
  { id: 'p3', name: 'Papa John\'s Lagos', type: 'Restaurant', submitted: '1 day ago' },
];

export default function AdminOverview() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();
  const platformStats = [
    { label: 'Total Revenue', value: `${formatMoney(4200000).replace(',000,000', '.2M')}`, icon: 'attach-money', color: Colors.success, change: '+23%' },
    { label: 'Active Orders', value: '47', icon: 'receipt-long', color: Colors.primary, change: 'Live' },
    { label: 'Total Users', value: '12,483', icon: 'people', color: Colors.info, change: '+156 today' },
    { label: 'Active Riders', value: '89', icon: 'delivery-dining', color: Colors.warning, change: '67 online' },
    { label: 'Restaurants', value: '234', icon: 'restaurant', color: Colors.gold, change: '+5 pending' },
    { label: 'Disputes', value: '3', icon: 'report-problem', color: Colors.error, change: 'Needs review' },
  ];

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>RedRush Platform Overview</Text>
        </View>
        <View style={styles.adminBadge}>
          <MaterialIcons name="admin-panel-settings" size={14} color={Colors.primary} />
          <Text style={styles.adminBadgeText}> ADMIN</Text>
        </View>
      </View>

      {/* Live Indicator */}
      <View style={styles.liveBar}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>Live Platform Monitoring  •  Last updated: just now</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {platformStats.map(s => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
              <MaterialIcons name={s.icon as any} size={20} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statChange}>{s.change}</Text>
          </View>
        ))}
      </View>

      {/* Pending Approvals */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Pending Approvals</Text>
          <View style={styles.urgentBadge}><Text style={styles.urgentText}>{PENDING_APPROVALS.length} pending</Text></View>
        </View>
        {PENDING_APPROVALS.map(item => (
          <View key={item.id} style={styles.approvalCard}>
            <View style={[styles.approvalIcon, { backgroundColor: item.type === 'Restaurant' ? Colors.warning + '22' : Colors.info + '22' }]}>
              <MaterialIcons name={item.type === 'Restaurant' ? 'restaurant' : 'delivery-dining'} size={20} color={item.type === 'Restaurant' ? Colors.warning : Colors.info} />
            </View>
            <View style={styles.approvalInfo}>
              <Text style={styles.approvalName}>{item.name}</Text>
              <Text style={styles.approvalMeta}>{item.type}  •  Submitted {item.submitted}</Text>
            </View>
            <View style={styles.approvalActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => showAlert('Rejected', `${item.name} has been rejected.`)}>
                <MaterialIcons name="close" size={16} color={Colors.error} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => showAlert('Approved!', `${item.name} has been approved and notified.`)}>
                <MaterialIcons name="check" size={16} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {MOCK_ORDERS.slice(0, 3).map(order => (
          <View key={order.id} style={styles.orderRow}>
            <View>
              <Text style={styles.orderRestaurant}>{order.restaurantName}</Text>
              <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
            </View>
            <View style={styles.orderRight}>
              <Text style={styles.orderTotal}>{formatMoney(order.total)}</Text>
              <View style={[styles.statusDot, { backgroundColor: order.status === 'delivered' ? Colors.success : Colors.warning }]}>
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: 'people', label: 'Manage Users', color: Colors.info },
            { icon: 'report-problem', label: 'Disputes', color: Colors.error },
            { icon: 'local-offer', label: 'Promotions', color: Colors.warning },
            { icon: 'logout', label: 'Sign Out', color: Colors.textMuted },
          ].map(a => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => {
              if (a.label === 'Sign Out') { logout(); router.replace('/auth'); }
              else showAlert(a.label, `${a.label} workspace opened. Use the dedicated admin tabs for live user and order records.`);
            }}>
              <MaterialIcons name={a.icon as any} size={26} color={a.color} />
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.xs },
  adminBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(204,0,0,0.15)', borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.primary + '44' },
  adminBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  liveBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.md, gap: Spacing.xs },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  liveText: { color: Colors.textMuted, fontSize: FontSize.xs },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { width: '47%', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
  statIcon: { width: 40, height: 40, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  statChange: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 2 },
  section: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  urgentBadge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  urgentText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  approvalCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  approvalIcon: { width: 40, height: 40, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  approvalInfo: { flex: 1 },
  approvalName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  approvalMeta: { color: Colors.textMuted, fontSize: FontSize.xs },
  approvalActions: { flexDirection: 'row', gap: Spacing.sm },
  rejectBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.error, justifyContent: 'center', alignItems: 'center' },
  approveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  orderRestaurant: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  orderId: { color: Colors.textMuted, fontSize: FontSize.xs },
  orderRight: { alignItems: 'flex-end' },
  orderTotal: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  statusDot: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
  statusText: { color: Colors.text, fontSize: 9, fontWeight: FontWeight.bold, textTransform: 'uppercase' },
  actionsGrid: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  actionCard: { width: '47%', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  actionLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'center' },
});
