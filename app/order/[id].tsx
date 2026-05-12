import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
  Linking, Platform,
} from 'react-native';
import { MapView, Marker, Polyline } from '@/components/MapViewCompat';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useAlert } from '@/template';
import { RiderCoords, subscribeToRiderLocation } from '@/services/riderLocation';

const STEPS = [
  { key: 'pending',   label: 'Order Placed',    icon: 'receipt',          desc: 'Your order has been received' },
  { key: 'accepted',  label: 'Accepted',         icon: 'check-circle',     desc: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing',        icon: 'restaurant',       desc: 'Your food is being cooked' },
  { key: 'ready',     label: 'Ready for Pickup', icon: 'done-all',         desc: 'Waiting for a rider to pick it up' },
  { key: 'assigned',  label: 'Rider Assigned',   icon: 'person-pin-circle', desc: 'A rider is heading to the restaurant' },
  { key: 'picked_up', label: 'On the Way',       icon: 'delivery-dining',  desc: 'Rider is heading to you' },
  { key: 'delivered', label: 'Delivered',        icon: 'home',             desc: 'Enjoy your meal!' },
];

const RESTAURANT_COORDS = { latitude: -1.2833, longitude: 36.8172 };
const CUSTOMER_COORDS   = { latitude: -1.2921, longitude: 36.8219 };
const RIDER_DEFAULT     = { latitude: -1.2868, longitude: 36.8201 };

function callNumber(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => undefined);
}

function openMapsTo(address: string) {
  const encoded = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `maps://?daddr=${encoded}`
    : `google.navigation:q=${encoded}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`)
  );
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getOrderById } = useOrders();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();
  const { addReview } = useCustomerData();
  const order = getOrderById(id || '');
  const [riderCoords, setRiderCoords] = useState<RiderCoords | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Live rider GPS subscription
  useEffect(() => {
    if (!order?.riderId || !['assigned', 'picked_up'].includes(order.status)) {
      setRiderCoords(null);
      return undefined;
    }
    return subscribeToRiderLocation(order.riderId, setRiderCoords);
  }, [order?.riderId, order?.status]);

  // Pulsing animation for active step
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const route = useMemo(() => {
    const rider = riderCoords
      ? { latitude: riderCoords.latitude, longitude: riderCoords.longitude }
      : RIDER_DEFAULT;
    return {
      rider,
      restaurantToRider: [RESTAURANT_COORDS, rider],
      riderToCustomer:   [rider, CUSTOMER_COORDS],
    };
  }, [riderCoords]);

  if (!order) {
    return (
      <View style={styles.notFound}>
        <MaterialIcons name="receipt-long" size={48} color={Colors.textMuted} />
        <Text style={styles.notFoundText}>Order not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.key === order.status);
  const isLive = ['accepted', 'preparing', 'ready', 'assigned', 'picked_up'].includes(order.status);
  const showRiderOnMap = order.status === 'picked_up';

  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const mapCenter = showRiderOnMap ? route.rider : RESTAURANT_COORDS;

  const totalEta = (order.prepTime || 0) + (order.deliveryTime || 0);
  const etaLabel = order.status === 'delivered'
    ? 'Delivered'
    : totalEta > 0
    ? `~${totalEta} min`
    : `ETA: ${formatTime(order.estimatedDelivery)}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Track Order</Text>
          {isLive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/support', params: { orderId: order.id.slice(-6).toUpperCase() } })}
        >
          <MaterialIcons name="headset-mic" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Full Map ── */}
        <View style={styles.mapShell}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: mapCenter.latitude,
              longitude: mapCenter.longitude,
              latitudeDelta: 0.032,
              longitudeDelta: 0.032,
            }}
          >
            {/* Restaurant pin */}
            <Marker coordinate={RESTAURANT_COORDS} title={order.restaurantName}>
              <View style={styles.restaurantMarker}>
                <MaterialIcons name="restaurant" size={16} color={Colors.text} />
              </View>
            </Marker>

            {/* Customer pin */}
            <Marker coordinate={CUSTOMER_COORDS} title="Your location">
              <View style={styles.customerMarker}>
                <MaterialIcons name="home" size={16} color={Colors.text} />
              </View>
            </Marker>

            {/* Rider pin — only when picked_up */}
            {showRiderOnMap ? (
              <>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Marker coordinate={route.rider} title={order.riderName || 'Rider'}>
                    <View style={styles.riderMarker}>
                      <MaterialIcons name="delivery-dining" size={18} color={Colors.text} />
                    </View>
                  </Marker>
                </Animated.View>
                {/* Route: rider → customer */}
                <Polyline
                  coordinates={route.riderToCustomer}
                  strokeColor={Colors.primary}
                  strokeWidth={4}
                  lineDashPattern={[1]}
                />
              </>
            ) : null}

            {/* Route: restaurant → rider (before pickup) */}
            {!showRiderOnMap && order.status !== 'delivered' && order.status !== 'cancelled' ? (
              <Polyline
                coordinates={[RESTAURANT_COORDS, CUSTOMER_COORDS]}
                strokeColor={Colors.border}
                strokeWidth={3}
                lineDashPattern={[6, 4]}
              />
            ) : null}
          </MapView>

          {/* Map overlay badges */}
          <View style={styles.mapTopLeft}>
            <View style={styles.mapBadge}>
              {riderCoords ? <View style={styles.mapDot} /> : null}
              <Text style={styles.mapBadgeText}>
                {riderCoords ? 'Live GPS' : 'Route preview'}
              </Text>
            </View>
          </View>

          {/* ETA chip */}
          <View style={styles.mapEtaChip}>
            <MaterialIcons name="access-time" size={13} color={Colors.primary} />
            <Text style={styles.mapEtaText}>{etaLabel}</Text>
          </View>
        </View>

        {/* ── Order Info Card ── */}
        <View style={styles.orderCard}>
          <View style={styles.orderCardRow}>
            <View>
              <Text style={styles.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.restaurantName}>{order.restaurantName}</Text>
            </View>
            <View style={styles.etaBadge}>
              <MaterialIcons name="access-time" size={13} color={Colors.primary} />
              <Text style={styles.etaBadgeText}>{etaLabel}</Text>
            </View>
          </View>

          {/* Prep + delivery breakdown */}
          {order.prepTime || order.deliveryTime ? (
            <View style={styles.timeBreakdown}>
              <View style={styles.timeChip}>
                <MaterialIcons name="restaurant" size={12} color={Colors.warning} />
                <Text style={styles.timeChipText}>{order.prepTime || '?'}m prep</Text>
              </View>
              <MaterialIcons name="add" size={12} color={Colors.textMuted} />
              <View style={styles.timeChip}>
                <MaterialIcons name="delivery-dining" size={12} color={Colors.primary} />
                <Text style={styles.timeChipText}>{order.deliveryTime || '?'}m delivery</Text>
              </View>
              <MaterialIcons name="drag-handle" size={12} color={Colors.textMuted} />
              <View style={[styles.timeChip, { backgroundColor: Colors.primary + '20' }]}>
                <Text style={[styles.timeChipText, { color: Colors.primary }]}>
                  {(order.prepTime || 0) + (order.deliveryTime || 0)}m total
                </Text>
              </View>
            </View>
          ) : null}

          {/* Rider card */}
          {order.riderName ? (
            <View style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <MaterialIcons name="delivery-dining" size={24} color={Colors.primary} />
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{order.riderName}</Text>
                <Text style={styles.riderLabel}>Your Delivery Rider</Text>
                {order.riderPhone ? (
                  <Text style={styles.riderPhone}>{order.riderPhone}</Text>
                ) : null}
              </View>
              <View style={styles.riderActions}>
                <TouchableOpacity
                  style={styles.riderBtn}
                  onPress={() =>
                    order.riderPhone
                      ? callNumber(order.riderPhone)
                      : showAlert('Call Rider', `${order.riderName} does not have a phone number on record.`)
                  }
                >
                  <MaterialIcons name="phone" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.riderBtn}
                  onPress={() =>
                    showAlert('Message Rider', `In-app messaging coming soon. Call ${order.riderName} directly.`)
                  }
                >
                  <MaterialIcons name="chat" size={20} color={Colors.primary} />
                </TouchableOpacity>
                {order.address ? (
                  <TouchableOpacity
                    style={[styles.riderBtn, { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
                    onPress={() => openMapsTo(order.address)}
                  >
                    <MaterialIcons name="navigation" size={20} color={Colors.text} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        {/* ── Live Progress Steps ── */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Order Progress</Text>
          {STEPS.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isActive    = index === currentStepIndex;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepIconCol}>
                  <View
                    style={[
                      styles.stepIcon,
                      isCompleted && styles.stepIconDone,
                      isActive && styles.stepIconActive,
                    ]}
                  >
                    {isActive ? (
                      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <MaterialIcons
                          name={step.icon as any}
                          size={16}
                          color={Colors.text}
                        />
                      </Animated.View>
                    ) : (
                      <MaterialIcons
                        name={step.icon as any}
                        size={16}
                        color={isCompleted ? Colors.text : Colors.textMuted}
                      />
                    )}
                  </View>
                  {index < STEPS.length - 1 ? (
                    <View style={[styles.stepLine, isCompleted && index < currentStepIndex && styles.stepLineDone]} />
                  ) : null}
                </View>
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepLabel, isCompleted && styles.stepLabelActive]}>
                    {step.label}
                  </Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
                {isActive ? (
                  <Animated.View style={[styles.activePulse, { transform: [{ scale: pulseAnim }] }]} />
                ) : isCompleted ? (
                  <MaterialIcons name="check" size={16} color={Colors.success} />
                ) : null}
              </View>
            );
          })}
        </View>

        {/* ── Items ── */}
        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>Items Ordered</Text>
          {order.items.map((item, i) => (
            <View key={`${order.id}-${item.menuItem.id}-${i}`} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
              <Text style={styles.itemName}>{item.menuItem.name}</Text>
              <Text style={styles.itemPrice}>{formatMoney(item.menuItem.price * item.quantity)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>{formatMoney(order.total)}</Text>
          </View>
        </View>

        {/* ── Delivered: Review CTA ── */}
        {order.status === 'delivered' ? (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => {
              addReview({
                restaurantId: order.restaurantId,
                restaurantName: order.restaurantName,
                rating: 5,
                comment: 'Great food and smooth delivery.',
              });
              showAlert('Review saved', `Thanks for reviewing ${order.restaurantName}.`);
            }}
          >
            <MaterialIcons name="star" size={20} color={Colors.gold} />
            <Text style={styles.reviewBtnText}>Rate Your Experience</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 0 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, gap: Spacing.md },
  notFoundText: { color: Colors.text, fontSize: FontSize.lg },
  backLink: { color: Colors.primary, marginTop: Spacing.md },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '20', borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  liveBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: FontWeight.extrabold },

  // Map
  mapShell: { height: 260, margin: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
  map: { flex: 1 },
  mapTopLeft: { position: 'absolute', top: 12, left: 12 },
  mapBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(10,10,10,0.82)', borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6 },
  mapDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.primary },
  mapBadgeText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  mapEtaChip: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  mapEtaText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  // Map markers
  restaurantMarker: { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.warning, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.text },
  customerMarker:   { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.text },
  riderMarker:      { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.text },

  // Order card
  orderCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.md },
  orderCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  orderId: { color: Colors.textMuted, fontSize: FontSize.xs },
  restaurantName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold, marginTop: 2 },
  etaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '18', borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  etaBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  timeBreakdown: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  timeChipText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.sm, gap: Spacing.sm },
  riderAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  riderInfo: { flex: 1 },
  riderName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  riderLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  riderPhone: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginTop: 2 },
  riderActions: { flexDirection: 'row', gap: Spacing.sm },
  riderBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },

  // Progress steps
  stepsContainer: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.md },
  stepsTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.xs, position: 'relative' },
  stepIconCol: { alignItems: 'center', width: 38 },
  stepIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  stepIconDone: { backgroundColor: Colors.primary + '30', borderColor: Colors.primary + '60' },
  stepIconActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryLight, ...Shadow.sm },
  stepLine: { width: 2, height: 26, backgroundColor: Colors.border, marginVertical: 2 },
  stepLineDone: { backgroundColor: Colors.primary },
  stepInfo: { flex: 1, paddingLeft: Spacing.sm, paddingBottom: Spacing.sm },
  stepLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  stepLabelActive: { color: Colors.text },
  stepDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  activePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 12 },

  // Items card
  itemsCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.md },
  itemsTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs, gap: Spacing.sm },
  itemQty: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 26 },
  itemName: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  itemPrice: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  totalLabel: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  totalValue: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.extrabold },

  // Review
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.md, padding: Spacing.md, backgroundColor: Colors.gold + '18', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.gold + '44', gap: Spacing.sm, marginBottom: Spacing.md },
  reviewBtnText: { color: Colors.gold, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
