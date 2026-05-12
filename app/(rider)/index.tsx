import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Animated, Linking, Platform,
} from 'react-native';
import { MapView, Marker, Polyline } from '@/components/MapViewCompat';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useOrders } from '@/hooks/useOrders';
import { useAlert } from '@/template';
import { startRiderTracking, stopRiderTracking, setRiderOffline } from '@/services/riderLocation';
import { setRiderOnlineStatus } from '@/services/dispatchService';
import { sendRiderRequestNotification, sendRiderAssignedNotification, registerForPushNotifications } from '@/services/notifications';
import { isCashPayment } from '@/services/payments';
import * as Location from 'expo-location';
import {
  emptyRiderSettings,
  isRiderReadyForDeliveries,
  loadRiderProfileSettings,
  RiderProfileSettings,
  saveRiderProfileSettings,
} from '@/services/supabaseProfileSettings';

const LAGOS_DEFAULT = { latitude: 6.4541, longitude: 3.3947 };

function openMapsDirections(destination: string, lat?: number, lng?: number) {
  let url: string;
  if (lat && lng) {
    url = Platform.OS === 'ios'
      ? `maps://?daddr=${lat},${lng}`
      : `google.navigation:q=${lat},${lng}`;
  } else {
    const encoded = encodeURIComponent(destination);
    url = Platform.OS === 'ios'
      ? `maps://?daddr=${encoded}`
      : `google.navigation:q=${encoded}`;
  }
  Linking.openURL(url).catch(() => {
    const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(destination);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
  });
}

function callNumber(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => undefined);
}

export default function RiderHome() {
  const [isOnline, setIsOnline] = useState(false);
  const [hasRequest, setHasRequest] = useState(false);
  const [myCoords, setMyCoords] = useState(LAGOS_DEFAULT);
  const [locationGranted, setLocationGranted] = useState(false);
  const [settings, setSettings] = useState<RiderProfileSettings>(emptyRiderSettings);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { formatMoney } = useCurrency();
  const { orders, updateOrderStatus, assignRider, updateCashPaymentStatus } = useOrders();
  const { showAlert } = useAlert();

  const activeDelivery = orders.find(
    o => o.riderId === user?.id && ['assigned', 'picked_up'].includes(o.status)
  );
  const readyOrder = orders.find(o => o.status === 'ready' && !o.riderId);
  const profileReady = isRiderReadyForDeliveries(settings);

  const request = readyOrder
    ? {
        id: readyOrder.id,
        restaurant: readyOrder.restaurantName,
        restaurantAddress: 'Restaurant pickup',
        customerAddress: readyOrder.address,
        customerPhone: readyOrder.customerPhone,
        distance: '3.2 km',
        estimatedTime: `${(readyOrder.prepTime || 15) + (readyOrder.deliveryTime || 20)} min`,
        earnings: Math.max(900, Math.round(readyOrder.deliveryFee * 0.8)),
        items: readyOrder.items.reduce((sum, item) => sum + item.quantity, 0),
        paymentMethod: readyOrder.paymentMethod,
        orderId: readyOrder.id,
        prepTime: readyOrder.prepTime,
        deliveryTime: readyOrder.deliveryTime,
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

  // Get location on mount + register for push notifications
  useEffect(() => {
    const userId = user?.id;
    if (userId) {
      registerForPushNotifications(userId).catch(() => undefined);
      loadRiderProfileSettings(userId).then(setSettings).catch(() => undefined);
    }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationGranted(true);
        const loc = await Location.getCurrentPositionAsync({});
        setMyCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    })();
    return () => { stopRiderTracking(); };
  }, [user?.id]);

  // Notify when new ready order appears while online
  useEffect(() => {
    if (isOnline && readyOrder && !hasRequest) {
      setHasRequest(true);
      sendRiderRequestNotification(
        readyOrder.restaurantName,
        Math.max(900, Math.round(readyOrder.deliveryFee * 0.8)),
        3.2
      ).catch(() => undefined);
    }
  }, [readyOrder, isOnline, hasRequest]);

  const handleToggle = async (val: boolean) => {
    if (val && !profileReady) {
      showAlert('Complete rider setup', 'Add vehicle details, a payout method, and at least one document in Profile before taking rides.');
      setIsOnline(false);
      return;
    }

    setIsOnline(val);
    if (val) {
      if (user?.id) {
        const started = await startRiderTracking(user.id);
        if (!started) {
          showAlert('Location Required', 'Grant location permission to go online and receive deliveries.');
          setIsOnline(false);
          return;
        }
        await setRiderOnlineStatus(user.id, true).catch(() => undefined);
        await saveRiderProfileSettings(user.id, { isOnline: true }).catch(() => undefined);
      }
      if (readyOrder) setHasRequest(true);
      showAlert('You are Online!', 'Your location is being tracked. You will receive nearby delivery requests.');
    } else {
      stopRiderTracking();
      if (user?.id) {
        setRiderOffline(user.id);
        await setRiderOnlineStatus(user.id, false).catch(() => undefined);
      }
      setHasRequest(false);
      showAlert('You are Offline', 'Location tracking stopped. No new requests will arrive.');
    }
  };

  const handleAccept = async () => {
    if (!request || !user?.id) return;
    try {
      await assignRider(request.orderId, user.id, user.name);
      await sendRiderAssignedNotification(request.restaurant, request.customerAddress);
      setHasRequest(false);
      showAlert('Delivery Accepted!', `Head to ${request.restaurant} to pick up the order.`);
    } catch {
      showAlert('Accept failed', 'Unable to accept this delivery. Try again.');
    }
  };

  const handleDelivered = async () => {
    if (!activeDelivery) return;
    try {
      if (isCashPayment(activeDelivery.paymentMethod)) {
        await updateCashPaymentStatus(activeDelivery.id, 'cash_collected');
      }
      await updateOrderStatus(activeDelivery.id, 'delivered');
      showAlert('Delivered!', 'Order marked as delivered. Earnings credited.');
    } catch {
      showAlert('Update failed', 'Unable to mark as delivered.');
    }
  };

  const handleDecline = () => {
    setHasRequest(false);
    setTimeout(() => { if (isOnline) setHasRequest(!!readyOrder); }, 15000);
  };

  const deliveredToday = orders.filter(o => o.riderId === user?.id && o.status === 'delivered');
  const earningsToday = deliveredToday.reduce((sum, o) => sum + Math.max(900, Math.round(o.deliveryFee * 0.8)), 0);

  const mapRegion = {
    latitude: myCoords.latitude,
    longitude: myCoords.longitude,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] || 'Rider'}</Text>
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
                ? 'Online - GPS active, waiting for nearby requests...'
                : 'Online - Enable location for full tracking'
              : profileReady
                ? 'Toggle online to start receiving orders'
                : 'Complete rider setup in Profile before taking rides'}
          </Text>
        </View>
        <View style={styles.statsRow}>
          {[
            { label: "Today's Trips", value: String(deliveredToday.length) },
            { label: 'Hours Online', value: '4.5h' },
            { label: "Today's Earn", value: formatMoney(earningsToday) },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Nearby Delivery Request */}
      {hasRequest && request ? (
        <View style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <View style={styles.requestHeaderLeft}>
              <MaterialIcons name="notifications-active" size={22} color={Colors.primary} />
              <Text style={styles.requestTitle}>Nearby Delivery Request</Text>
            </View>
            <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
          </View>

          <View style={styles.routeCard}>
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, { backgroundColor: Colors.warning + '22' }]}>
                <MaterialIcons name="restaurant" size={14} color={Colors.warning} />
              </View>
              <View style={styles.routeTextBlock}>
                <Text style={styles.routeRestaurant}>{request.restaurant}</Text>
                <Text style={styles.routeAddr}>{request.restaurantAddress}</Text>
              </View>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => openMapsDirections(request.restaurant)}
              >
                <MaterialIcons name="directions" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.routeDash} />
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, { backgroundColor: Colors.success + '22' }]}>
                <MaterialIcons name="home" size={14} color={Colors.success} />
              </View>
              <View style={styles.routeTextBlock}>
                <Text style={styles.routeRestaurant}>Customer</Text>
                <Text style={styles.routeAddr} numberOfLines={1}>{request.customerAddress}</Text>
              </View>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => openMapsDirections(request.customerAddress)}
              >
                <MaterialIcons name="directions" size={18} color={Colors.success} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.metaRow}>
            {[
              { icon: 'straighten', val: request.distance },
              { icon: 'access-time', val: request.estimatedTime },
              { icon: 'shopping-bag', val: `${request.items} items` },
              { icon: 'payments', val: request.paymentMethod },
            ].map(m => (
              <View key={m.val} style={styles.metaChip}>
                <MaterialIcons name={m.icon as any} size={13} color={Colors.textMuted} />
                <Text style={styles.metaChipText}>{m.val}</Text>
              </View>
            ))}
          </View>

          {request.customerPhone ? (
            <TouchableOpacity style={styles.phoneRow} onPress={() => callNumber(request.customerPhone!)}>
              <MaterialIcons name="phone" size={16} color={Colors.success} />
              <Text style={styles.phoneText}>Call customer: {request.customerPhone}</Text>
            </TouchableOpacity>
          ) : null}

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

      {/* Active Delivery Card */}
      {activeDelivery ? (
        <View style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <View style={styles.requestHeaderLeft}>
              <MaterialIcons name="delivery-dining" size={22} color={Colors.success} />
              <Text style={styles.requestTitle}>Active Delivery</Text>
            </View>
            <View style={[styles.newBadge, { backgroundColor: Colors.success }]}>
              <Text style={styles.newBadgeText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.routeCard}>
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, { backgroundColor: Colors.warning + '22' }]}>
                <MaterialIcons name="restaurant" size={14} color={Colors.warning} />
              </View>
              <View style={styles.routeTextBlock}>
                <Text style={styles.routeRestaurant}>{activeDelivery.restaurantName}</Text>
                <Text style={styles.routeAddr}>{activeDelivery.status === 'assigned' ? 'Go to restaurant for pickup' : 'Pickup completed'}</Text>
              </View>
            </View>
            <View style={styles.routeDash} />
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, { backgroundColor: Colors.success + '22' }]}>
                <MaterialIcons name="home" size={14} color={Colors.success} />
              </View>
              <View style={styles.routeTextBlock}>
                <Text style={styles.routeRestaurant}>Customer</Text>
                <Text style={styles.routeAddr} numberOfLines={1}>{activeDelivery.address}</Text>
              </View>
              <TouchableOpacity
                style={styles.directionsBtn}
                onPress={() => openMapsDirections(activeDelivery.address)}
              >
                <MaterialIcons name="navigation" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.contactRow}>
            {activeDelivery.customerPhone ? (
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => callNumber(activeDelivery.customerPhone!)}
              >
                <MaterialIcons name="phone" size={16} color={Colors.text} />
                <Text style={styles.contactBtnText}>Call Customer</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: Colors.surfaceElevated }]}
              onPress={() => openMapsDirections(activeDelivery.address)}
            >
              <MaterialIcons name="navigation" size={16} color={Colors.primary} />
              <Text style={[styles.contactBtnText, { color: Colors.primary }]}>Navigate</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>Delivery Earnings</Text>
            <Text style={styles.earningValue}>
              {formatMoney(Math.max(900, Math.round(activeDelivery.deliveryFee * 0.8)))}
            </Text>
          </View>
          {activeDelivery.status === 'assigned' ? (
            <TouchableOpacity style={styles.acceptBtn} onPress={() => updateOrderStatus(activeDelivery.id, 'picked_up')}>
              <MaterialIcons name="shopping-bag" size={16} color={Colors.text} />
              <Text style={styles.acceptBtnText}>Confirm Pickup</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.acceptBtn} onPress={handleDelivered}>
              <MaterialIcons name="check-circle" size={16} color={Colors.text} />
              <Text style={styles.acceptBtnText}>{isCashPayment(activeDelivery.paymentMethod) ? 'Cash Collected & Delivered' : 'Mark as Delivered'}</Text>
            </TouchableOpacity>
          )}
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
              <Marker
                coordinate={{ latitude: myCoords.latitude + 0.008, longitude: myCoords.longitude + 0.008 }}
                title={request.restaurant}
              />
              <Polyline
                coordinates={[
                  myCoords,
                  { latitude: myCoords.latitude + 0.008, longitude: myCoords.longitude + 0.008 },
                ]}
                strokeColor={Colors.warning}
                strokeWidth={4}
              />
            </>
          ) : null}
          {activeDelivery ? (
            <Polyline
              coordinates={[
                myCoords,
                { latitude: myCoords.latitude + 0.012, longitude: myCoords.longitude + 0.012 },
              ]}
              strokeColor={Colors.primary}
              strokeWidth={4}
            />
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
          { label: "Today's Earnings", value: formatMoney(earningsToday), icon: 'account-balance-wallet' as const, color: Colors.success },
          { label: 'This Week', value: formatMoney(47200), icon: 'calendar-today' as const, color: Colors.primary },
          { label: 'Avg Rating', value: '4.9', icon: 'star' as const, color: Colors.gold },
          { label: 'Total Trips', value: String(deliveredToday.length), icon: 'delivery-dining' as const, color: Colors.info },
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
  requestHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  requestHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  requestTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  newBadge: { backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  newBadgeText: { color: Colors.text, fontSize: 10, fontWeight: FontWeight.extrabold },
  routeCard: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  routeIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  routeTextBlock: { flex: 1 },
  routeRestaurant: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  routeAddr: { color: Colors.textMuted, fontSize: FontSize.xs },
  routeDash: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  directionsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  metaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 5, gap: 4 },
  metaChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.success + '15', borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  phoneText: { color: Colors.success, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  contactRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 10 },
  contactBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  earningRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginBottom: Spacing.md },
  earningLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  earningValue: { color: Colors.success, fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  requestActions: { flexDirection: 'row', gap: Spacing.sm },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.error, paddingVertical: 12, gap: 6 },
  declineBtnText: { color: Colors.error, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary, paddingVertical: 12, gap: 6 },
  acceptBtnText: { color: Colors.text, fontWeight: FontWeight.bold, fontSize: FontSize.sm },

  mapCard: { height: 220, marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
  map: { flex: 1 },
  mapOverlay: { position: 'absolute', top: 12, left: 12 },
  mapBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,10,10,0.85)', borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  mapDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.success },
  mapBadgeText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  myMarker: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, borderWidth: 2.5, borderColor: Colors.text, alignItems: 'center', justifyContent: 'center' },

  quickStats: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  quickCard: { width: '47%', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.border },
  quickValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  quickLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
});
