import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useOrders } from '@/hooks/useOrders';
import { useCurrency } from '@/hooks/useCurrency';
import { useAlert } from '@/template';
import { Order } from '@/constants/mockData';
import { sendOrderStatusNotification, sendNewOrderNotification, registerForPushNotifications } from '@/services/notifications';
import { useAuth } from '@/hooks/useAuth';

const TABS = ['All', 'Pending', 'Preparing', 'Ready', 'Completed'];
const STATUS_COLOR: Record<string, string> = {
  pending: Colors.warning,
  accepted: Colors.info,
  preparing: Colors.warning,
  ready: Colors.success,
  picked_up: Colors.primary,
  delivered: Colors.success,
  cancelled: Colors.error,
};

export default function VendorOrders() {
  const [tab, setTab] = useState('All');
  const [prepModalOrder, setPrepModalOrder] = useState<Order | null>(null);
  const [prepMin, setPrepMin] = useState('20');
  const [delivMin, setDelivMin] = useState('25');

  const insets = useSafeAreaInsets();
  const { orders, updateOrderStatus, setPrepAndDeliveryTime } = useOrders();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();
  const { user } = useAuth();

  // Register for push notifications so vendor receives new order alerts
  useEffect(() => {
    if (user?.id) registerForPushNotifications(user.id).catch(() => undefined);
  }, [user?.id]);

  const filtered = orders.filter(o => {
    if (tab === 'All') return true;
    if (tab === 'Pending') return o.status === 'pending';
    if (tab === 'Preparing') return ['accepted', 'preparing'].includes(o.status);
    if (tab === 'Ready') return o.status === 'ready';
    if (tab === 'Completed') return ['delivered', 'cancelled'].includes(o.status);
    return true;
  });

  const openPrepModal = (order: Order) => {
    setPrepMin(String(order.prepTime || 20));
    setDelivMin(String(order.deliveryTime || 25));
    setPrepModalOrder(order);
  };

  const savePrepTime = async () => {
    if (!prepModalOrder) return;
    const prep = parseInt(prepMin, 10);
    const deliv = parseInt(delivMin, 10);
    if (!prep || !deliv || prep < 1 || deliv < 1) {
      showAlert('Invalid times', 'Enter valid preparation and delivery times in minutes.');
      return;
    }
    await setPrepAndDeliveryTime(prepModalOrder.id, prep, deliv);
    setPrepModalOrder(null);
    showAlert('Times updated', `Customer will see: ${prep} min prep + ${deliv} min delivery = ~${prep + deliv} min total.`);
  };

  const handleAction = async (order: Order, action: string) => {
    try {
      if (action === 'accept') {
        await updateOrderStatus(order.id, 'accepted');
        await sendNewOrderNotification(0, order.restaurantName, order.total); // vendor already saw it
        showAlert('Order Accepted', 'Start preparing the order.');
      } else if (action === 'prepare') {
        await updateOrderStatus(order.id, 'preparing');
        await sendOrderStatusNotification('preparing', order.restaurantName);
        openPrepModal(order);
      } else if (action === 'ready') {
        await updateOrderStatus(order.id, 'ready');
        await sendOrderStatusNotification('ready', order.restaurantName);
        showAlert('Order Ready', 'Riders near your area will be notified for pickup.');
      } else if (action === 'reject') {
        showAlert('Reject Order', 'Are you sure you want to reject this order?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              await updateOrderStatus(order.id, 'cancelled');
              await sendOrderStatusNotification('cancelled', order.restaurantName);
            },
          },
        ]);
      }
    } catch {
      showAlert('Order update failed', 'Unable to update this order status.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Orders</Text>

      {/* Tabs */}
      <View style={styles.tabsScroll}>
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={t => t}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={o => o.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.orderCard, { borderLeftColor: STATUS_COLOR[item.status] || Colors.border }]}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>#{item.id.slice(-6).toUpperCase()}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] || Colors.border) + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || Colors.textMuted }]}>
                  {item.status.toUpperCase().replace('_', ' ')}
                </Text>
              </View>
            </View>

            <Text style={styles.orderAddress}>{item.address}</Text>

            {/* Customer contact */}
            {item.customerPhone ? (
              <View style={styles.customerContact}>
                <MaterialIcons name="person" size={13} color={Colors.textMuted} />
                <Text style={styles.customerName}>{item.customerName || 'Customer'}</Text>
                <MaterialIcons name="phone" size={13} color={Colors.primary} style={{ marginLeft: 8 }} />
                <Text style={styles.customerPhone}>{item.customerPhone}</Text>
              </View>
            ) : null}

            {item.items.map((i, idx) => (
              <Text key={`${item.id}-${i.menuItem.id}-${idx}`} style={styles.orderItem}>
                {i.quantity}x {i.menuItem.name}
              </Text>
            ))}

            {/* Prep & delivery time indicator */}
            {(item.prepTime || item.deliveryTime) ? (
              <TouchableOpacity style={styles.timeRow} onPress={() => openPrepModal(item)}>
                <MaterialIcons name="access-time" size={14} color={Colors.info} />
                <Text style={styles.timeText}>
                  {item.prepTime}m prep + {item.deliveryTime}m delivery ≈ {(item.prepTime || 0) + (item.deliveryTime || 0)} min total
                </Text>
                <MaterialIcons name="edit" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.timeRowEmpty} onPress={() => openPrepModal(item)}>
                <MaterialIcons name="timer" size={14} color={Colors.textMuted} />
                <Text style={styles.timeEmptyText}>Set prep & delivery time</Text>
              </TouchableOpacity>
            )}

            <View style={styles.orderFoot}>
              <Text style={styles.orderTotal}>{formatMoney(item.total)}</Text>
              <Text style={styles.payMethod}>{item.paymentMethod}</Text>
            </View>

            <View style={styles.actions}>
              {item.status === 'pending' ? (
                <>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(item, 'reject')}>
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction(item, 'accept')}>
                    <Text style={styles.actionText}>Accept</Text>
                  </TouchableOpacity>
                </>
              ) : item.status === 'accepted' ? (
                <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={() => handleAction(item, 'prepare')}>
                  <Text style={styles.actionText}>Start Preparing</Text>
                </TouchableOpacity>
              ) : item.status === 'preparing' ? (
                <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={() => handleAction(item, 'ready')}>
                  <Text style={styles.actionText}>Mark as Ready</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="receipt" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No {tab.toLowerCase()} orders</Text>
          </View>
        }
      />

      {/* Prep Time Modal */}
      <Modal visible={!!prepModalOrder} transparent animationType="slide" onRequestClose={() => setPrepModalOrder(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Order Timing</Text>
              <TouchableOpacity onPress={() => setPrepModalOrder(null)}>
                <MaterialIcons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Customer receives a live ETA based on these values.
            </Text>

            <View style={styles.timeInputRow}>
              <View style={styles.timeInput}>
                <Text style={styles.timeInputLabel}>Preparation (min)</Text>
                <TextInput
                  style={styles.timeInputField}
                  value={prepMin}
                  onChangeText={setPrepMin}
                  keyboardType="number-pad"
                  placeholder="20"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.plusSign}><Text style={styles.plusText}>+</Text></View>
              <View style={styles.timeInput}>
                <Text style={styles.timeInputLabel}>Delivery (min)</Text>
                <TextInput
                  style={styles.timeInputField}
                  value={delivMin}
                  onChangeText={setDelivMin}
                  keyboardType="number-pad"
                  placeholder="25"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.etaPreview}>
              <MaterialIcons name="access-time" size={18} color={Colors.primary} />
              <Text style={styles.etaPreviewText}>
                Customer sees: ~{(parseInt(prepMin, 10) || 0) + (parseInt(delivMin, 10) || 0)} min total
              </Text>
            </View>

            <TouchableOpacity style={styles.saveTimeBtn} onPress={savePrepTime}>
              <Text style={styles.saveTimeBtnText}>Save Timing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  tabsScroll: { marginBottom: Spacing.sm },
  tabsContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceCard, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  tabTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  orderCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 4, ...Shadow.md },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  orderId: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  orderAddress: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.xs },
  customerContact: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs, gap: 4 },
  customerName: { color: Colors.textSecondary, fontSize: FontSize.xs },
  customerPhone: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  orderItem: { color: Colors.textSecondary, fontSize: FontSize.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.info + '15', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  timeText: { flex: 1, color: Colors.info, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  timeRowEmpty: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  timeEmptyText: { color: Colors.textMuted, fontSize: FontSize.xs },
  orderFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  orderTotal: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  payMethod: { color: Colors.textMuted, fontSize: FontSize.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  rejectBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.error, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  rejectText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  actionBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center' },
  actionText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.md },
  // Prep time modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.md, paddingBottom: Spacing.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  modalSubtitle: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.lg },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  timeInput: { flex: 1 },
  timeInputLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginBottom: 6 },
  timeInputField: { backgroundColor: Colors.surfaceCard, color: Colors.text, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center', paddingVertical: 14 },
  plusSign: { paddingTop: 22 },
  plusText: { color: Colors.textMuted, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  etaPreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  etaPreviewText: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  saveTimeBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 15, alignItems: 'center' },
  saveTimeBtnText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
