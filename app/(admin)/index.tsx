import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useOrders } from '@/hooks/useOrders';
import { useAlert } from '@/template';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { getOnlineRiders, assignRiderToOrder, OnlineRider } from '@/services/dispatchService';
import { fetchSupabaseRoleRequests } from '@/services/supabaseRoles';
import { reviewRoleRequestOnBackend } from '@/services/backend';

interface PlatformStats {
  totalUsers: number;
  activeRiders: number;
  onlineRiders: number;
  restaurants: number;
  openDisputes: number;
}

export default function AdminOverview() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();
  const { orders, refreshOrders } = useOrders();

  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0, activeRiders: 0, onlineRiders: 0, restaurants: 0, openDisputes: 0,
  });
  const [onlineRiders, setOnlineRiders] = useState<OnlineRider[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const readyOrders = orders.filter(o => o.status === 'ready' && !o.riderId);
  const totalRevenue = orders.reduce(
    (sum, o) => o.status !== 'cancelled' ? sum + o.total : sum, 0
  );

  const loadPlatformData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoadingStats(false);
      return;
    }

    try {
      const [
        usersResult,
        restaurantsResult,
        onlineRidersData,
        riderProfilesResult,
        roleRequestsData,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('restaurants').select('id', { count: 'exact', head: true }),
        getOnlineRiders(),
        supabase.from('rider_profiles').select('id', { count: 'exact', head: true }),
        fetchSupabaseRoleRequests(),
      ]);

      setStats({
        totalUsers: usersResult.count ?? 0,
        activeRiders: riderProfilesResult.count ?? 0,
        onlineRiders: onlineRidersData.length,
        restaurants: restaurantsResult.count ?? 0,
        openDisputes: 0,
      });

      setOnlineRiders(onlineRidersData);
      setPendingApprovals((roleRequestsData || []).filter(r => r.status === 'pending'));
    } catch (err) {
      console.warn('[AdminOverview] loadPlatformData error:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPlatformData(), refreshOrders()]);
    setRefreshing(false);
  };

  const handleApproveRole = async (request: any, decision: 'approved' | 'rejected') => {
    try {
      await reviewRoleRequestOnBackend(request.id, decision);
      setPendingApprovals(prev => prev.filter(r => r.id !== request.id));
      showAlert(
        decision === 'approved' ? 'Approved' : 'Rejected',
        `${request.userName}'s ${request.requestedRole} request was ${decision}.`
      );
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Unable to process request.');
    }
  };

  const handleAssignRider = async (orderId: string, rider: OnlineRider) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setAssigningOrderId(orderId);
    try {
      const ok = await assignRiderToOrder(
        orderId,
        rider.riderId,
        rider.riderName,
        order.restaurantName,
        order.address
      );
      if (ok) {
        await refreshOrders();
        showAlert('Rider Assigned', `${rider.riderName} has been assigned to order #${orderId.slice(-6).toUpperCase()}.`);
      } else {
        showAlert('Assignment Failed', 'Could not assign rider. Please try again.');
      }
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'Assignment failed.');
    } finally {
      setAssigningOrderId(null);
    }
  };

  const platformStats = [
    { label: 'Total Revenue', value: formatMoney(totalRevenue), icon: 'attach-money', color: Colors.success, change: 'Live' },
    { label: 'Active Orders', value: String(activeOrders.length), icon: 'receipt-long', color: Colors.primary, change: 'Live' },
    { label: 'Total Users', value: loadingStats ? '...' : String(stats.totalUsers), icon: 'people', color: Colors.info, change: 'Registered' },
    { label: 'Riders', value: loadingStats ? '...' : `${stats.onlineRiders}/${stats.activeRiders}`, icon: 'delivery-dining', color: Colors.warning, change: 'Online/Total' },
    { label: 'Restaurants', value: loadingStats ? '...' : String(stats.restaurants), icon: 'restaurant', color: Colors.gold, change: 'Registered' },
    { label: 'Unassigned', value: String(readyOrders.length), icon: 'report-problem', color: Colors.error, change: 'Need rider' },
  ];

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
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
        <Text style={styles.liveText}>Live Platform Monitoring  •  Pull to refresh</Text>
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

      {/* ── DISPATCH BOARD ── */}
      {readyOrders.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Dispatch Board</Text>
            <View style={[styles.urgentBadge, { backgroundColor: Colors.error }]}>
              <Text style={styles.urgentText}>{readyOrders.length} need rider</Text>
            </View>
          </View>
          <Text style={styles.dispatchHint}>
            {onlineRiders.length} rider{onlineRiders.length !== 1 ? 's' : ''} online. Tap a rider to assign.
          </Text>

          {readyOrders.map(order => (
            <View key={order.id} style={styles.dispatchCard}>
              <View style={styles.dispatchOrderRow}>
                <View style={[styles.dispatchIcon, { backgroundColor: Colors.primary + '22' }]}>
                  <MaterialIcons name="receipt-long" size={18} color={Colors.primary} />
                </View>
                <View style={styles.dispatchOrderInfo}>
                  <Text style={styles.dispatchRestaurant}>{order.restaurantName}</Text>
                  <Text style={styles.dispatchMeta}>
                    #{order.id.slice(-6).toUpperCase()}  •  {formatMoney(order.total)}  •  {order.address.slice(0, 30)}…
                  </Text>
                </View>
                {assigningOrderId === order.id ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : null}
              </View>

              {onlineRiders.length > 0 ? (
                <View style={styles.riderList}>
                  {onlineRiders.slice(0, 4).map(rider => (
                    <TouchableOpacity
                      key={rider.riderId}
                      style={styles.riderChip}
                      onPress={() => {
                        showAlert(
                          'Assign Rider',
                          `Assign ${rider.riderName} to order #${order.id.slice(-6).toUpperCase()}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Assign', onPress: () => handleAssignRider(order.id, rider) },
                          ]
                        );
                      }}
                      disabled={assigningOrderId === order.id}
                    >
                      <View style={styles.riderDot} />
                      <Text style={styles.riderChipText}>{rider.riderName}</Text>
                      <MaterialIcons name="chevron-right" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.noRidersText}>No online riders available. Riders go online via the Rider app.</Text>
              )}
            </View>
          ))}
        </View>
      ) : null}

      {/* ── PENDING ROLE APPROVALS ── */}
      {pendingApprovals.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Pending Role Requests</Text>
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>{pendingApprovals.length} pending</Text>
            </View>
          </View>
          {pendingApprovals.map(item => (
            <View key={item.id} style={styles.approvalCard}>
              <View style={[styles.approvalIcon, { backgroundColor: item.requestedRole === 'vendor' ? Colors.warning + '22' : Colors.info + '22' }]}>
                <MaterialIcons
                  name={item.requestedRole === 'vendor' ? 'restaurant' : 'delivery-dining'}
                  size={20}
                  color={item.requestedRole === 'vendor' ? Colors.warning : Colors.info}
                />
              </View>
              <View style={styles.approvalInfo}>
                <Text style={styles.approvalName}>{item.userName}</Text>
                <Text style={styles.approvalMeta}>{item.email}  •  Wants to be {item.requestedRole}</Text>
              </View>
              <View style={styles.approvalActions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleApproveRole(item, 'rejected')}
                >
                  <MaterialIcons name="close" size={16} color={Colors.error} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApproveRole(item, 'approved')}
                >
                  <MaterialIcons name="check" size={16} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── RECENT ORDERS ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {orders.slice(0, 5).map(order => (
          <View key={order.id} style={styles.orderRow}>
            <View>
              <Text style={styles.orderRestaurant}>{order.restaurantName}</Text>
              <Text style={styles.orderId}>
                #{order.id.slice(-6).toUpperCase()}  •  {order.address.slice(0, 22)}…
              </Text>
            </View>
            <View style={styles.orderRight}>
              <Text style={styles.orderTotal}>{formatMoney(order.total)}</Text>
              <View style={[
                styles.statusDot,
                {
                  backgroundColor: order.status === 'delivered'
                    ? Colors.success
                    : order.status === 'cancelled'
                    ? Colors.error
                    : Colors.warning,
                },
              ]}>
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
            </View>
          </View>
        ))}
        {orders.length === 0 ? <Text style={styles.emptyText}>No live orders yet</Text> : null}
      </View>

      {/* ── ONLINE RIDERS MAP OVERVIEW ── */}
      {onlineRiders.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Online Riders ({onlineRiders.length})</Text>
          {onlineRiders.map(rider => (
            <View key={rider.riderId} style={styles.onlineRiderRow}>
              <View style={styles.onlineRiderAvatar}>
                <MaterialIcons name="delivery-dining" size={20} color={Colors.success} />
              </View>
              <View style={styles.onlineRiderInfo}>
                <Text style={styles.onlineRiderName}>{rider.riderName}</Text>
                <Text style={styles.onlineRiderCoords}>
                  {rider.latitude != null && rider.longitude != null
                    ? `${rider.latitude.toFixed(4)}, ${rider.longitude.toFixed(4)}`
                    : 'Location pending'}
                </Text>
              </View>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>ONLINE</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── QUICK ACTIONS ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: 'people', label: 'Manage Users', color: Colors.info },
            { icon: 'support-agent', label: 'Support', color: Colors.success },
            { icon: 'analytics', label: 'Analytics', color: Colors.warning },
            { icon: 'logout', label: 'Sign Out', color: Colors.textMuted },
          ].map(a => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionCard}
              onPress={() => {
                if (a.label === 'Sign Out') { logout(); router.replace('/auth'); }
                else showAlert(a.label, `Use the ${a.label} tab in the bottom navigation.`);
              }}
            >
              <MaterialIcons name={a.icon as any} size={26} color={a.color} />
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 30 }} />
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
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  urgentBadge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  urgentText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  // Dispatch board
  dispatchHint: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.sm },
  dispatchCard: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  dispatchOrderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  dispatchIcon: { width: 38, height: 38, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  dispatchOrderInfo: { flex: 1 },
  dispatchRestaurant: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  dispatchMeta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  riderList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  riderChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '18', borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary + '44' },
  riderDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  riderChipText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  noRidersText: { color: Colors.textMuted, fontSize: FontSize.xs, fontStyle: 'italic' },

  // Role approvals
  approvalCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  approvalIcon: { width: 40, height: 40, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  approvalInfo: { flex: 1 },
  approvalName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  approvalMeta: { color: Colors.textMuted, fontSize: FontSize.xs },
  approvalActions: { flexDirection: 'row', gap: Spacing.sm },
  rejectBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.error, justifyContent: 'center', alignItems: 'center' },
  approveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },

  // Recent orders
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  orderRestaurant: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  orderId: { color: Colors.textMuted, fontSize: FontSize.xs },
  orderRight: { alignItems: 'flex-end' },
  orderTotal: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  statusDot: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
  statusText: { color: Colors.text, fontSize: 9, fontWeight: FontWeight.bold, textTransform: 'uppercase' },

  // Online riders
  onlineRiderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border },
  onlineRiderAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.success + '22', alignItems: 'center', justifyContent: 'center' },
  onlineRiderInfo: { flex: 1 },
  onlineRiderName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  onlineRiderCoords: { color: Colors.textMuted, fontSize: FontSize.xs },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.success + '18', borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 4 },
  onlineDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.success },
  onlineText: { color: Colors.success, fontSize: 10, fontWeight: FontWeight.extrabold },

  // Quick actions
  actionsGrid: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  actionCard: { width: '47%', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  actionLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
});
