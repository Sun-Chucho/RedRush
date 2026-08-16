import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow, createThemedStyles } from '@/constants/theme';
import { useOrders } from '@/hooks/useOrders';
import { fetchOnlineRiders, assignRiderToOrder, DispatchRider } from '@/services/supabaseDispatch';
import { useAlert } from '@/template';

export default function DispatchBoard() {
  const insets = useSafeAreaInsets();
  const { orders } = useOrders();
  const { showAlert } = useAlert();
  
  const [riders, setRiders] = useState<DispatchRider[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const loadRiders = async () => {
    const data = await fetchOnlineRiders();
    setRiders(data);
  };

  useEffect(() => {
    loadRiders();
    const interval = setInterval(loadRiders, 10000);
    return () => clearInterval(interval);
  }, []);

  const dispatchableOrders = orders.filter(
    o => (o.status === 'ready' || o.status === 'preparing') && !o.riderId
  );

  const handleAssignRider = async (orderId: string, rider: DispatchRider) => {
    try {
      await assignRiderToOrder(orderId, rider.id, rider.name);
      showAlert('Assigned', `Order assigned to ${rider.name}`);
      setSelectedOrder(null);
    } catch {
      showAlert('Error', 'Failed to assign rider');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Dispatch Board</Text>
      
      <View style={styles.content}>
        <View style={styles.ordersColumn}>
          <Text style={styles.columnTitle}>Orders Awaiting Rider ({dispatchableOrders.length})</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {dispatchableOrders.map(order => (
              <TouchableOpacity
                key={order.id}
                style={[
                  styles.card,
                  selectedOrder === order.id && styles.cardSelected
                ]}
                onPress={() => setSelectedOrder(order.id)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: order.status === 'ready' ? Colors.success : Colors.warning }]}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>
                <Text style={styles.restaurantName}>{order.restaurantName}</Text>
                <Text style={styles.customerInfo}>{order.address}</Text>
              </TouchableOpacity>
            ))}
            {dispatchableOrders.length === 0 && (
              <Text style={styles.emptyText}>No orders need dispatching</Text>
            )}
          </ScrollView>
        </View>

        <View style={styles.ridersColumn}>
          <Text style={styles.columnTitle}>Available Riders ({riders.length})</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {riders.map(rider => (
              <View key={rider.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.riderName}>{rider.name}</Text>
                  <View style={styles.onlineDot} />
                </View>
                <Text style={styles.riderMeta}>{rider.totalDeliveries} Deliveries • {rider.phone}</Text>
                {selectedOrder && (
                  <TouchableOpacity
                    style={styles.assignBtn}
                    onPress={() => handleAssignRider(selectedOrder, rider)}
                  >
                    <Text style={styles.assignBtnText}>Assign to Selected</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {riders.length === 0 && (
              <Text style={styles.emptyText}>No riders online</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = createThemedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, padding: Spacing.md },
  content: { flex: 1, flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  ordersColumn: { flex: 1 },
  ridersColumn: { flex: 1 },
  columnTitle: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surfaceCard, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  cardSelected: { borderColor: Colors.primary, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  orderId: { color: Colors.text, fontWeight: FontWeight.bold },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  restaurantName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  customerInfo: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  riderName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  riderMeta: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.sm },
  assignBtn: { backgroundColor: Colors.primary, paddingVertical: 8, borderRadius: BorderRadius.sm, alignItems: 'center' },
  assignBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
}));
