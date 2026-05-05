import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { useAlert } from '@/template';

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: 'receipt', desc: 'Your order has been received' },
  { key: 'accepted', label: 'Accepted', icon: 'check-circle', desc: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', icon: 'restaurant', desc: 'Your food is being prepared' },
  { key: 'ready', label: 'Ready', icon: 'done-all', desc: 'Food is ready for pickup' },
  { key: 'picked_up', label: 'On the Way', icon: 'delivery-dining', desc: 'Rider is heading to you' },
  { key: 'delivered', label: 'Delivered', icon: 'home', desc: 'Enjoy your meal!' },
];

const DELIVERY_ROUTE = {
  restaurant: { latitude: -1.2833, longitude: 36.8172, label: 'Restaurant' },
  rider: { latitude: -1.2868, longitude: 36.8219, label: 'Rider' },
  customer: { latitude: -1.2921, longitude: 36.8219, label: 'Delivery' },
};

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getOrderById } = useOrders();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  const order = getOrderById(id || '');

  if (!order) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Order not found</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backLink}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.key === order.status);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <TouchableOpacity onPress={() => showAlert('Order Support', 'Support chat coming soon!')}>
          <MaterialIcons name="headset-mic" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.mapShell}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: DELIVERY_ROUTE.rider.latitude,
              longitude: DELIVERY_ROUTE.rider.longitude,
              latitudeDelta: 0.026,
              longitudeDelta: 0.026,
            }}
          >
            <Polyline
              coordinates={[DELIVERY_ROUTE.restaurant, DELIVERY_ROUTE.rider, DELIVERY_ROUTE.customer]}
              strokeColor={Colors.primary}
              strokeWidth={4}
            />
            <Marker coordinate={DELIVERY_ROUTE.restaurant} title={order.restaurantName} />
            <Marker coordinate={DELIVERY_ROUTE.rider} title={order.riderName || 'Rider'}>
              <View style={styles.riderMarker}>
                <MaterialIcons name="delivery-dining" size={18} color={Colors.text} />
              </View>
            </Marker>
            <Marker coordinate={DELIVERY_ROUTE.customer} title="Delivery address" />
          </MapView>
          <View style={styles.mapBadge}>
            <Text style={styles.mapBadgeText}>Live map</Text>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.orderCard}>
          <View style={styles.orderCardRow}>
            <View>
              <Text style={styles.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.restaurantName}>{order.restaurantName}</Text>
            </View>
            <View style={styles.etaBadge}>
              <MaterialIcons name="access-time" size={14} color={Colors.primary} />
              <Text style={styles.etaText}>
                {order.status === 'delivered' ? 'Delivered' : `ETA: ${formatTime(order.estimatedDelivery)}`}
              </Text>
            </View>
          </View>

          {order.riderName ? (
            <View style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <MaterialIcons name="delivery-dining" size={24} color={Colors.primary} />
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{order.riderName}</Text>
                <Text style={styles.riderLabel}>Your Delivery Rider</Text>
              </View>
              <View style={styles.riderActions}>
                <TouchableOpacity style={styles.riderBtn} onPress={() => showAlert('Call Rider', 'Calling feature coming soon!')}>
                  <MaterialIcons name="phone" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.riderBtn} onPress={() => showAlert('Chat Rider', 'In-app chat coming soon!')}>
                  <MaterialIcons name="chat" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        {/* Tracking Steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Order Progress</Text>
          {STEPS.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isActive = index === currentStepIndex;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepIconCol}>
                  <View style={[styles.stepIcon, isCompleted && styles.stepIconActive, isActive && styles.stepIconCurrent]}>
                    <MaterialIcons name={step.icon as any} size={16} color={isCompleted ? Colors.text : Colors.textMuted} />
                  </View>
                  {index < STEPS.length - 1 ? (
                    <View style={[styles.stepLine, isCompleted && index < currentStepIndex && styles.stepLineActive]} />
                  ) : null}
                </View>
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepLabel, isCompleted && styles.stepLabelActive]}>{step.label}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
                {isActive ? (
                  <View style={styles.activeDot} />
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>Items Ordered</Text>
          {order.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
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

        {order.status === 'delivered' ? (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => showAlert('Leave Review', 'Rating & review feature coming soon!')}>
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
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  notFoundText: { color: Colors.text, fontSize: FontSize.lg },
  backLink: { color: Colors.primary, marginTop: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  mapShell: { height: 220, margin: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
  map: { flex: 1 },
  mapBadge: { position: 'absolute', left: 12, top: 12, backgroundColor: Colors.surface, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  mapBadgeText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  riderMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.text, alignItems: 'center', justifyContent: 'center' },
  orderCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.md },
  orderCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  orderId: { color: Colors.textMuted, fontSize: FontSize.xs },
  restaurantName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold, marginTop: 2 },
  etaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(204,0,0,0.1)', borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  etaText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.sm, gap: Spacing.sm },
  riderAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(204,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  riderInfo: { flex: 1 },
  riderName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  riderLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  riderActions: { flexDirection: 'row', gap: Spacing.sm },
  riderBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  stepsContainer: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.md },
  stepsTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.xs, position: 'relative' },
  stepIconCol: { alignItems: 'center', width: 36 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  stepIconActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepIconCurrent: { backgroundColor: Colors.primary, borderColor: Colors.primaryLight },
  stepLine: { width: 2, height: 24, backgroundColor: Colors.border, marginVertical: 2 },
  stepLineActive: { backgroundColor: Colors.primary },
  stepInfo: { flex: 1, paddingLeft: Spacing.sm, paddingBottom: Spacing.sm },
  stepLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  stepLabelActive: { color: Colors.text },
  stepDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 12 },
  itemsCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.md },
  itemsTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs, gap: Spacing.sm },
  itemQty: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 24 },
  itemName: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  itemPrice: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  totalLabel: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  totalValue: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.extrabold },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.md, padding: Spacing.md, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', gap: Spacing.sm },
  reviewBtnText: { color: Colors.gold, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
