import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';

const MOCK_REQUEST = {
  id: 'req001',
  restaurant: 'Chicken Republic',
  restaurantAddress: '12 Allen Avenue, Ikeja',
  customerAddress: '45 Saka Tinubu Street, VI',
  distance: '3.2 km',
  estimatedTime: '18 min',
  earnings: '₦1,200',
  items: 3,
  paymentMethod: 'MTN Mobile Money',
};

export default function RiderHome() {
  const [isOnline, setIsOnline] = useState(false);
  const [hasRequest, setHasRequest] = useState(false);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const handleToggle = (val: boolean) => {
    setIsOnline(val);
    if (val) {
      setTimeout(() => setHasRequest(true), 2000);
      showAlert('You are Online', 'You will now receive delivery requests.');
    } else {
      setHasRequest(false);
      showAlert('You are Offline', 'You will not receive delivery requests.');
    }
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>Ready to deliver?</Text>
        </View>
        <View style={styles.onlineToggle}>
          <Text style={[styles.onlineLabel, { color: isOnline ? Colors.success : Colors.textMuted }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggle}
            trackColor={{ false: Colors.border, true: Colors.success + '55' }}
            thumbColor={isOnline ? Colors.success : Colors.textMuted}
          />
        </View>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, { borderColor: isOnline ? Colors.success : Colors.border }]}>
        <View style={styles.statusIconRow}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.textMuted }]} />
          <Text style={[styles.statusText, { color: isOnline ? Colors.success : Colors.textMuted }]}>
            {isOnline ? 'You are online — waiting for requests...' : 'Toggle online to start receiving orders'}
          </Text>
        </View>
        <View style={styles.statusStats}>
          {[
            { label: "Today's Trips", value: '7' },
            { label: 'Hours Online', value: '4.5h' },
            { label: 'Distance', value: '38 km' },
          ].map(s => (
            <View key={s.label} style={styles.statusStat}>
              <Text style={styles.statusStatValue}>{s.value}</Text>
              <Text style={styles.statusStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Incoming Request */}
      {hasRequest ? (
        <View style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <MaterialIcons name="notifications-active" size={22} color={Colors.primary} />
            <Text style={styles.requestTitle}>New Delivery Request!</Text>
            <View style={styles.requestBadge}><Text style={styles.requestBadgeText}>NEW</Text></View>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.routePoint}>
              <MaterialIcons name="restaurant" size={16} color={Colors.warning} />
              <View>
                <Text style={styles.routeRestaurant}>{MOCK_REQUEST.restaurant}</Text>
                <Text style={styles.routeAddress}>{MOCK_REQUEST.restaurantAddress}</Text>
              </View>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routePoint}>
              <MaterialIcons name="home" size={16} color={Colors.success} />
              <View>
                <Text style={styles.routeLabel}>Customer</Text>
                <Text style={styles.routeAddress}>{MOCK_REQUEST.customerAddress}</Text>
              </View>
            </View>
          </View>

          <View style={styles.requestMeta}>
            {[
              { icon: 'straighten', val: MOCK_REQUEST.distance },
              { icon: 'access-time', val: MOCK_REQUEST.estimatedTime },
              { icon: 'shopping-bag', val: `${MOCK_REQUEST.items} items` },
              { icon: 'phone-android', val: MOCK_REQUEST.paymentMethod },
            ].map(m => (
              <View key={m.val} style={styles.metaItem}>
                <MaterialIcons name={m.icon as any} size={14} color={Colors.textMuted} />
                <Text style={styles.metaText}> {m.val}</Text>
              </View>
            ))}
          </View>

          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>Your Earnings</Text>
            <Text style={styles.earningValue}>{MOCK_REQUEST.earnings}</Text>
          </View>

          <View style={styles.requestActions}>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => { setHasRequest(false); }}>
              <MaterialIcons name="close" size={18} color={Colors.error} />
              <Text style={styles.rejectText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => {
              setHasRequest(false);
              showAlert('Delivery Accepted!', 'Head to Chicken Republic to pick up the order. Good luck!');
            }}>
              <MaterialIcons name="check" size={18} color={Colors.text} />
              <Text style={styles.acceptText}>Accept Delivery</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Map Placeholder */}
      <View style={styles.mapCard}>
        <View style={styles.mapPlaceholder}>
          <MaterialIcons name="map" size={44} color={Colors.textMuted} />
          <Text style={styles.mapText}>Live Map</Text>
          <Text style={styles.mapSubText}>GPS navigation available with OnSpace Cloud</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        {[
          { label: "Today's Earnings", value: '₦8,400', icon: 'account-balance-wallet', color: Colors.success },
          { label: 'This Week', value: '₦47,200', icon: 'calendar-today', color: Colors.primary },
          { label: 'Avg Rating', value: '4.9 ⭐', icon: 'star', color: Colors.gold },
          { label: 'Total Trips', value: '312', icon: 'delivery-dining', color: Colors.info },
        ].map(s => (
          <View key={s.label} style={styles.quickStatCard}>
            <MaterialIcons name={s.icon as any} size={20} color={s.color} />
            <Text style={[styles.quickStatValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.quickStatLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  greeting: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  subGreeting: { color: Colors.textMuted, fontSize: FontSize.sm },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  onlineLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  statusCard: { marginHorizontal: Spacing.md, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, ...Shadow.md },
  statusIconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1 },
  statusStats: { flexDirection: 'row' },
  statusStat: { flex: 1, alignItems: 'center' },
  statusStatValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  statusStatLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  requestCard: { marginHorizontal: Spacing.md, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary, ...Shadow.lg },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  requestTitle: { flex: 1, color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  requestBadge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  requestBadgeText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  routeRow: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  routePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  routeRestaurant: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  routeLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  routeAddress: { color: Colors.textMuted, fontSize: FontSize.xs },
  routeDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  requestMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  metaText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  earningRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginBottom: Spacing.md },
  earningLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  earningValue: { color: Colors.success, fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  requestActions: { flexDirection: 'row', gap: Spacing.sm },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.error, paddingVertical: 12, gap: 6 },
  rejectText: { color: Colors.error, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary, paddingVertical: 12, gap: 6 },
  acceptText: { color: Colors.text, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  mapCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  mapPlaceholder: { height: 180, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  mapText: { color: Colors.textSecondary, fontSize: FontSize.body, fontWeight: FontWeight.semibold, marginTop: Spacing.sm },
  mapSubText: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', paddingHorizontal: Spacing.lg, marginTop: 4 },
  quickStats: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  quickStatCard: { width: '47%', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  quickStatValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  quickStatLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
});
