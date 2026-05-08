import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Animated } from 'react-native';
import { MapView, Marker, Polyline } from '@/components/MapViewCompat';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useOrders } from '@/hooks/useOrders';
import { useAlert } from '@/template';
import { startRiderTracking, stopRiderTracking, setRiderOffline } from '@/services/riderLocation';
import { sendRiderRequestNotification } from '@/services/notifications';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import * as Location from 'expo-location';

const NAIROBI = { latitude: 6.4541, longitude: 3.3947 };

export default function RiderHome() {
  const [isOnline, setIsOnline] = useState(false);
  const [hasRequest, setHasRequest] = useState(false);
  const [myCoords, setMyCoords] = useState(NAIROBI);
  const [locationGranted, setLocationGranted] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { formatMoney } = useCurrency();
  const { orders, updateOrderStatus, assignRider } = useOrders();
  const { showAlert } = useAlert();

  const activeDelivery = orders.find(order => order.riderId === user?.id && order.status === 'picked_up');
  const readyOrder = orders.find(order => order.status === 'ready');
  const request = readyOrder
    ? {
        id: readyOrder.id,
        restaurant: readyOrder.restaurantName,
        restaurantAddress: 'Restaurant pickup',
        customerAddress: readyOrder.address,
        distance: '3.2 km',
        estimatedTime: '18 min',
        earnings: Math.max(900, Math.round(readyOrder.deliveryFee * 0.8)),
        items: readyOrder.items.reduce((sum, item) => sum + item.quantity, 0),
        paymentMethod: readyOrder.paymentMethod,
        orderId: readyOrder.id,
      }
    : null;

  // Pulse animation for online dot
  useEffect(() => {
    if (!isOnline) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isOnline, pulseAnim]);

  // Request location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({});
        setMyCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    })();
    return () => {
      stopRiderTracking();
    };
  }, []);

  // Notify rider when new ready order appears while online
  useEffect(() => {
    if (isOnline && readyOrder && !hasRequest) {
      setHasRequest(true);
      sendRiderRequestNotification(readyOrder.restaurantName, Math.max(900, Math.round(readyOrder.deliveryFee * 0.8)));
    }
  }, [readyOrder, isOnline, hasRequest]);

  const handleToggle = async (val: boolean) => {
    setIsOnline(val);
    if (val) {
      // Go online: start GPS publishing
      if (user?.id) {
        const started = await startRiderTracking(user.id);
        if (!started) {
          showAlert('Location Required', 'Please grant location permission to go online and receive deliveries.');
          setIsOnline(false);
          return;
        }
        // Update Firestore rider status
        await updateDoc(doc(db, 'users', user.id), {
          isOnline: true,
          updatedAt: serverTimestamp(),
        }).catch(() => undefined);
      }
      // Check for existing ready orders
      if (readyOrder) setHasRequest(true);
      showAlert('You are Online!', 'You will now receive delivery requests and your location is being tracked.');
    } else {
      // Go offline: stop GPS publishing
      stopRiderTracking();
      if (user?.id) {
        setRiderOffline(user.id);
        await updateDoc(doc(db, 'users', user.id), {
          isOnline: false,
          updatedAt: serverTimestamp(),
        }).catch(() => undefined);
      }
      setHasRequest(false);
      showAlert('You are Offline', 'Location tracking stopped. You will not receive new requests.');
    }
  };

  const handleAccept = async () => {
    if (!request) return;
    if (!user?.id) {
      showAlert('Sign in required', 'Please sign in as a rider before accepting deliveries.');
      return;
    }

    try {
      await assignRider(request.orderId, user.id, user.name);
      setHasRequest(false);
      showAlert('Delivery Accepted!', `Head to ${request.restaurant} to pick up the order. The live map now shows the pickup route.`);
    } catch {
      showAlert('Delivery update failed', 'Unable to accept this delivery.');
    }
  };

  const handleDelivered = async () => {
    if (!activeDelivery) return;

    try {
      await updateOrderStatus(activeDelivery.id, 'delivered');
      showAlert('Delivery Completed', 'The customer order has been marked as delivered.');
    } catch {
      showAlert('Delivery update failed', 'Unable to mark this order as delivered.');
    }
  };

  const handleDecline = () => {
    setHasRequest(false);
    // Simulate next request in 30 seconds
    setTimeout(() => { if (isOnline) setHasRequest(true); }, 30000);
  };

  const mapRegion = {
    latitude: myCoords.latitude,
    longitude: myCoords.longitude,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] || 'Rider'} 👋</Text>
          <Text style={styles.subGreeting}>Ready to deliver?</Text>
        </View>
        <View style={styles.onlineRow}>
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
        <View style={styles.statusRow}>
          {isOnline ? (
            <Animated.View style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]} />
          ) : (
            <View style={[styles.statusDot, { backgroundColor: Colors.textMuted }]} />
          )}
          <Text style={[styles.statusText, { color: isOnline ? Colors.success : Colors.textMuted }]}>
            {isOnline
              ? locationGranted
                ? 'Online — GPS active, waiting for requests...'
                : 'Online — Enable location for full tracking'
              : 'Toggle online to start receiving orders'}
          </Text>
        </View>
        <View style={styles.statsRow}>
          {[
            { label: "Today's Trips", value: orders.filter(o => o.riderId === user?.id && o.status === 'delivered').length.toString() },
            { label: 'Hours Online', value: '4.5h' },
            { label: 'Distance', value: '38 km' },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Delivery Request Card */}
      {hasRequest && request ? (
        <View style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <MaterialIcons name="notifications-active" size={22} color={Colors.primary} />
            <Text style={styles.requestTitle}>New Delivery Request!</Text>
            <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
          </View>

          <View style={styles.routeCard}>
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, { backgroundColor: Colors.warning + '22' }]}>
                <MaterialIcons name="restaurant" size={14} color={Colors.warning} />
              </View>
              <View>
                <Text style={styles.routeRestaurant}>{request.restaurant}</Text>
                <Text style={styles.routeAddr}>{request.restaurantAddress}</Text>
              </View>
            </View>
            <View style={styles.routeDash} />
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, { backgroundColor: Colors.success + '22' }]}>
                <MaterialIcons name="home" size={14} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.routeRestaurant}>Customer</Text>
                <Text style={styles.routeAddr} numberOfLines={1}>{request.customerAddress}</Text>
              </View>
            </View>
          </View>

          <View style={styles.metaRow}>
            {[
              { icon: 'straighten', val: request.distance },
              { icon: 'access-time', val: request.estimatedTime },
              { icon: 'shopping-bag', val: `${request.items} items` },
            ].map(m => (
              <View key={m.val} style={styles.metaChip}>
                <MaterialIcons name={m.icon as any} size={13} color={Colors.textMuted} />
                <Text style={styles.metaChipText}>{m.val}</Text>
              </View>
            ))}
          </View>

          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>Your Earnings</Text>
            <Text style={styles.earningValue}>{formatMoney(request.earnings)}</Text>
          </View>

          <View style={styles.requestActions}>
            <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
              <MaterialIcons name="close" size={16} color={Colors.error} />
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
              <MaterialIcons name="check" size={16} color={Colors.text} />
              <Text style={styles.acceptBtnText}>Accept Delivery</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {activeDelivery ? (
        <View style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <MaterialIcons name="delivery-dining" size={22} color={Colors.success} />
            <Text style={styles.requestTitle}>Active Delivery</Text>
            <View style={styles.newBadge}><Text style={styles.newBadgeText}>LIVE</Text></View>
          </View>
          <View style={styles.routeCard}>
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, { backgroundColor: Colors.warning + '22' }]}>
                <MaterialIcons name="restaurant" size={14} color={Colors.warning} />
              </View>
              <View>
                <Text style={styles.routeRestaurant}>{activeDelivery.restaurantName}</Text>
                <Text style={styles.routeAddr}>Pickup completed</Text>
              </View>
            </View>
            <View style={styles.routeDash} />
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, { backgroundColor: Colors.success + '22' }]}>
                <MaterialIcons name="home" size={14} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.routeRestaurant}>Customer</Text>
                <Text style={styles.routeAddr} numberOfLines={1}>{activeDelivery.address}</Text>
              </View>
            </View>
          </View>
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>Delivery Earnings</Text>
            <Text style={styles.earningValue}>{formatMoney(Math.max(900, Math.round(activeDelivery.deliveryFee * 0.8)))}</Text>
          </View>
          <TouchableOpacity style={styles.acceptBtn} onPress={handleDelivered}>
            <MaterialIcons name="check-circle" size={16} color={Colors.text} />
            <Text style={styles.acceptBtnText}>Mark Delivered</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Live Map */}
      <View style={styles.mapCard}>
        <MapView style={styles.map} initialRegion={mapRegion}>
          <Marker coordinate={myCoords} title="Your Location">
            <View style={styles.myMarker}>
              <MaterialIcons name="delivery-dining" size={18} color={Colors.text} />
            </View>
          </Marker>
          {request ? (
            <>
              <Marker coordinate={{ latitude: myCoords.latitude + 0.01, longitude: myCoords.longitude + 0.01 }} title={request.restaurant} />
              <Polyline
                coordinates={[myCoords, { latitude: myCoords.latitude + 0.01, longitude: myCoords.longitude + 0.01 }]}
                strokeColor={Colors.primary}
                strokeWidth={3}
              />
            </>
          ) : null}
        </MapView>
        <View style={styles.mapOverlay}>
          <View style={styles.mapBadge}>
            {isOnline ? <View style={styles.mapDot} /> : null}
            <Text style={styles.mapBadgeText}>{isOnline ? 'GPS Active' : 'Map View'}</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        {[
          { label: "Today's Earnings", value: formatMoney(orders.filter(o => o.riderId === user?.id && o.status === 'delivered').reduce((sum, order) => sum + Math.max(900, Math.round(order.deliveryFee * 0.8)), 0)), icon: 'account-balance-wallet' as const, color: Colors.success },
          { label: 'This Week', value: formatMoney(47200), icon: 'calendar-today' as const, color: Colors.primary },
          { label: 'Avg Rating', value: '4.9 ⭐', icon: 'star' as const, color: Colors.gold },
          { label: 'Total Trips', value: String(orders.filter(o => o.riderId === user?.id && o.status === 'delivered').length), icon: 'delivery-dining' as const, color: Colors.info },
        ].map(s => (
          <View key={s.label} style={styles.quickCard}>
            <MaterialIcons name={s.icon} size={20} color={s.color} />
            <Text style={[styles.quickValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.quickLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  greeting: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  subGreeting: { color: Colors.textMuted, fontSize: FontSize.sm },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  onlineLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },

  statusCard: { marginHorizontal: Spacing.md, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, ...Shadow.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  statusText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1 },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs },

  requestCard: { marginHorizontal: Spacing.md, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary, ...Shadow.lg },
  requestHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  requestTitle: { flex: 1, color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  newBadge: { backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  newBadgeText: { color: Colors.text, fontSize: 10, fontWeight: FontWeight.extrabold },
  routeCard: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  routePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  routeIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  routeRestaurant: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  routeAddr: { color: Colors.textMuted, fontSize: FontSize.xs },
  routeDash: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  metaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 5, gap: 4 },
  metaChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  earningRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginBottom: Spacing.md },
  earningLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  earningValue: { color: Colors.success, fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  requestActions: { flexDirection: 'row', gap: Spacing.sm },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.error, paddingVertical: 12, gap: 6 },
  declineBtnText: { color: Colors.error, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary, paddingVertical: 12, gap: 6 },
  acceptBtnText: { color: Colors.text, fontWeight: FontWeight.bold, fontSize: FontSize.sm },

  mapCard: { height: 200, marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
  map: { flex: 1 },
  mapOverlay: { position: 'absolute', top: 12, left: 12 },
  mapBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,10,10,0.85)', borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  mapDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.success },
  mapBadgeText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  myMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.text, alignItems: 'center', justifyContent: 'center' },

  quickStats: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  quickCard: { width: '47%', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  quickValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  quickLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
});
