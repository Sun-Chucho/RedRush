import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { MapView, Marker, Polyline } from '@/components/MapViewCompat';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { useAlert } from '@/template';
import { subscribeToRiderLocation, RiderCoords } from '@/services/riderLocation';
import { sendOrderStatusNotification } from '@/services/notifications';

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: 'receipt' as const, desc: 'Your order has been received' },
  { key: 'accepted', label: 'Accepted', icon: 'check-circle' as const, desc: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', icon: 'restaurant' as const, desc: 'Your food is being prepared' },
  { key: 'ready', label: 'Ready', icon: 'done-all' as const, desc: 'Food is ready for pickup' },
  { key: 'picked_up', label: 'On the Way', icon: 'delivery-dining' as const, desc: 'Rider is heading to you' },
  { key: 'delivered', label: 'Delivered', icon: 'home' as const, desc: 'Enjoy your meal!' },
];

const RESTAURANT_COORDS = { latitude: 6.4541, longitude: 3.3947 };  // Lagos coords
const CUSTOMER_COORDS   = { latitude: 6.4280, longitude: 3.4215 };

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getOrderById } = useOrders();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();

  const [riderCoords, setRiderCoords] = useState<RiderCoords>({
    latitude: 6.4420,
    longitude: 3.4050,
  });
  const [prevStatus, setPrevStatus] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const order = getOrderById(id || '');

  // Pulse animation for live dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Subscribe to live rider location from Firestore
  useEffect(() => {
    if (!order?.riderId) return;
    const unsub = subscribeToRiderLocation(order.riderId, coords => {
      setRiderCoords(coords);
    });
    return () => unsub();
  }, [order?.riderId]);

  // Fire local notification when order status changes
  useEffect(() => {
    if (!order) return;
    if (order.status !== prevStatus && prevStatus !== '') {
      sendOrderStatusNotification(order.status, order.restaurantName);
    }
    setPrevStatus(order.status);
  }, [order?.status]);

  if (!order) {
    return (
      <View style={styles.notFound}>
        <MaterialIcons name="receipt-long" size={56} color={Colors.textMuted} />
        <Text style={styles.notFoundText}>Order not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.key === order.status);
  const isActive = !['delivered', 'cancelled'].includes(order.status);

  const mapRegion = {
    latitude: (RESTAURANT_COORDS.latitude + CUSTOMER_COORDS.latitude) / 2,
    longitude: (RESTAURANT_COORDS.longitude + CUSTOMER_COORDS.longitude) / 2,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Track Order</Text>
          {isActive ? (
            <View style={styles.liveBadge}>
              <Animated.View style={[styles.livePulse, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity style={styles.supportBtn} onPress={() => showAlert('Order Support', 'Our support team will be notified. Chat feature coming soon!')}>
          <MaterialIcons name="headset-mic" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Live Map */}
        <View style={styles.mapShell}>
          <MapView style={styles.map} initialRegion={mapRegion}>
            {/* Route polyline */}
            <Polyline
              coordinates={[RESTAURANT_COORDS, riderCoords, CUSTOMER_COORDS]}
              strokeColor={Colors.primary}
              strokeWidth={4}
              lineDashPattern={[1]}
            />
            {/* Restaurant marker */}
            <Marker coordinate={RESTAURANT_COORDS} title={order.restaurantName} description="Pickup point" />
            {/* Rider marker (animated position) */}
            <Marker coordinate={riderCoords} title={order.riderName || 'Rider'}>
              <View style={styles.riderMarker}>
                <MaterialIcons name="delivery-dining" size={18} color={Colors.text} />
              </View>
            </Marker>
            {/* Customer marker */}
            <Marker coordinate={CUSTOMER_COORDS} title="Your location" description={order.address} />
          </MapView>

          {/* Map overlay info */}
          <View style={styles.mapOverlay}>
            <View style={styles.mapBadge}>
              <View style={styles.mapLiveDot} />
              <Text style={styles.mapBadgeText}>Live Tracking</Text>
            </View>
            {isActive ? (
              <View style={styles.etaChip}>
                <MaterialIcons name="access-time" size={12} color={Colors.primary} />
                <Text style={styles.etaChipText}>
                  ETA {new Date(order.estimatedDelivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.orderCard}>
          <View style={styles.orderCardTop}>
            <View>
              <Text style={styles.orderRestaurant}>{order.restaurantName}</Text>
              <Text style={styles.orderId}>Order #{order.id.slice(-8).toUpperCase()}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: order.status === 'delivered' ? Colors.success + '22' : Colors.primary + '22' }]}>
              <Text style={[styles.statusPillText, { color: order.status === 'delivered' ? Colors.success : Colors.primary }]}>
                {STEPS.find(s => s.key === order.status)?.label || order.status}
              </Text>
            </View>
          </View>

          {/* Rider info */}
          {order.riderName ? (
            <View style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <MaterialIcons name="delivery-dining" size={22} color={Colors.primary} />
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{order.riderName}</Text>
                <Text style={styles.riderLabel}>Your Delivery Rider</Text>
              </View>
              <TouchableOpacity style={styles.riderBtn} onPress={() => showAlert('Call Rider', 'Phone call feature coming soon!')}>
                <MaterialIcons name="phone" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.riderBtn} onPress={() => showAlert('Chat Rider', 'In-app messaging coming soon!')}>
                <MaterialIcons name="chat-bubble-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Progress Steps */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Order Progress</Text>
          {STEPS.map((step, index) => {
            const done = index <= currentStepIndex;
            const current = index === currentStepIndex;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  <View style={[styles.stepCircle, done && styles.stepCircleDone, current && styles.stepCircleCurrent]}>
                    <MaterialIcons name={step.icon} size={14} color={done ? Colors.text : Colors.border} />
                  </View>
                  {index < STEPS.length - 1 ? (
                    <View style={[styles.stepConnector, done && index < currentStepIndex && styles.stepConnectorDone]} />
                  ) : null}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
                {current ? (
                  <Animated.View style={[styles.stepPulse, { transform: [{ scale: pulseAnim }] }]} />
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>Items Ordered</Text>
          {order.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName}>{item.menuItem.name}</Text>
              <Text style={styles.itemPrice}>{formatMoney(item.menuItem.price * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>{formatMoney(order.total)}</Text>
          </View>
        </View>

        {/* Review prompt */}
        {order.status === 'delivered' ? (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => showAlert('Rate Your Experience', 'Ratings & reviews are coming in the next update!')}
          >
            <MaterialIcons name="star" size={20} color={Colors.gold} />
            <Text style={styles.reviewText}>Rate Your Experience</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: 12 },
  notFoundText: { color: Colors.textMuted, fontSize: FontSize.lg },
  backBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  backBtnText: { color: Colors.text, fontWeight: FontWeight.semibold },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(204,0,0,0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  liveText: { color: Colors.primary, fontSize: 10, fontWeight: FontWeight.extrabold },
  supportBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },

  mapShell: { height: 260, margin: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, ...Shadow.lg },
  map: { flex: 1 },
  mapOverlay: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,10,10,0.85)', borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  mapLiveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.success },
  mapBadgeText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  etaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,10,10,0.85)', borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
  etaChipText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  riderMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.text, alignItems: 'center', justifyContent: 'center' },

  orderCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.md },
  orderCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  orderRestaurant: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  orderId: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  statusPill: { borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.sm, gap: Spacing.sm },
  riderAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(204,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  riderInfo: { flex: 1 },
  riderName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  riderLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  riderBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.primary + '55', alignItems: 'center', justifyContent: 'center' },

  progressCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.md },
  progressTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', position: 'relative' },
  stepLeft: { alignItems: 'center', width: 34 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceElevated },
  stepCircleDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepCircleCurrent: { borderColor: Colors.primaryLight },
  stepConnector: { width: 2, height: 28, backgroundColor: Colors.border, marginVertical: 2 },
  stepConnectorDone: { backgroundColor: Colors.primary },
  stepContent: { flex: 1, paddingLeft: Spacing.sm, paddingBottom: Spacing.sm },
  stepLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  stepLabelDone: { color: Colors.text },
  stepDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  stepPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 11 },

  itemsCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.md },
  itemsTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs, gap: Spacing.sm },
  itemQty: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 28 },
  itemName: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  itemPrice: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  totalLabel: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  totalValue: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.extrabold },

  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.md, padding: Spacing.md, backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)', gap: Spacing.sm },
  reviewText: { color: Colors.gold, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
