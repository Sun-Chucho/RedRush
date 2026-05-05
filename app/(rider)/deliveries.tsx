import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';

const DELIVERY_HISTORY = [
  { id: 'd1', restaurant: 'Chicken Republic', customer: 'Adaeze O.', address: '45 Saka Tinubu St', distance: '3.2 km', earnings: 1200, status: 'completed', time: '2:45 PM', date: 'Today' },
  { id: 'd2', restaurant: 'Mama Put Kitchen', customer: 'Emeka C.', address: '7 Broad Street', distance: '1.8 km', earnings: 900, status: 'completed', time: '1:10 PM', date: 'Today' },
  { id: 'd3', restaurant: 'Pizza Palace', customer: 'Ngozi A.', address: '23 Lekki Phase 1', distance: '5.1 km', earnings: 1800, status: 'completed', time: '11:20 AM', date: 'Today' },
  { id: 'd4', restaurant: 'Grillmaster BBQ', customer: 'Tunde B.', address: '12 Victoria Island', distance: '4.3 km', earnings: 1500, status: 'completed', time: '6:30 PM', date: 'Yesterday' },
  { id: 'd5', restaurant: 'Sushi & More', customer: 'Chioma K.', address: '9 Eko Hotel Way', distance: '2.7 km', earnings: 1100, status: 'cancelled', time: '3:15 PM', date: 'Yesterday' },
];

export default function RiderDeliveries() {
  const [filter, setFilter] = useState('All');
  const insets = useSafeAreaInsets();

  const filtered = DELIVERY_HISTORY.filter(d => filter === 'All' || d.status === filter.toLowerCase());

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Delivery History</Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Completed', value: DELIVERY_HISTORY.filter(d => d.status === 'completed').length.toString(), color: Colors.success },
          { label: 'Cancelled', value: DELIVERY_HISTORY.filter(d => d.status === 'cancelled').length.toString(), color: Colors.error },
          { label: 'Total Distance', value: '17.1 km', color: Colors.info },
        ].map(s => (
          <View key={s.label} style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {['All', 'Completed', 'Cancelled'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.deliveryCard, { borderLeftColor: item.status === 'completed' ? Colors.success : Colors.error }]}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.restaurantName}>{item.restaurant}</Text>
                <Text style={styles.customerName}>{item.customer}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.earning, { color: item.status === 'completed' ? Colors.success : Colors.textMuted }]}>
                  {item.status === 'completed' ? `+₦${item.earnings.toLocaleString()}` : 'Cancelled'}
                </Text>
                <Text style={styles.cardTime}>{item.date}  {item.time}</Text>
              </View>
            </View>
            <View style={styles.cardMeta}>
              <MaterialIcons name="location-on" size={12} color={Colors.textMuted} />
              <Text style={styles.metaText}> {item.address}</Text>
              <MaterialIcons name="straighten" size={12} color={Colors.textMuted} style={{ marginLeft: 8 }} />
              <Text style={styles.metaText}> {item.distance}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: { flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  summaryLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  filterBtn: { paddingHorizontal: 16, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceCard, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  filterTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  deliveryCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 4, ...Shadow.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  restaurantName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  customerName: { color: Colors.textMuted, fontSize: FontSize.xs },
  cardRight: { alignItems: 'flex-end' },
  earning: { fontSize: FontSize.body, fontWeight: FontWeight.bold },
  cardTime: { color: Colors.textMuted, fontSize: FontSize.xs },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { color: Colors.textMuted, fontSize: FontSize.xs },
});
