import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useAlert } from '@/template';

export default function VendorProfile() {
  const [notifications, setNotifications] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Restaurant Header */}
      <View style={styles.storeCard}>
        <View style={styles.storeLogo}>
          <MaterialIcons name="restaurant" size={36} color={Colors.primary} />
        </View>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{user?.name}</Text>
          <Text style={styles.storeEmail}>{user?.email}</Text>
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={14} color={Colors.success} />
            <Text style={styles.verifiedText}> Verified Restaurant</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => showAlert('Edit Profile', 'Restaurant profile details are visible below. Connect the settings form to the users/vendorProfile Firestore document before release.')}>
          <MaterialIcons name="edit" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Performance */}
      <View style={styles.perfCard}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.perfGrid}>
          {[
            { label: 'Acceptance Rate', value: '94%', icon: 'check-circle', color: Colors.success },
            { label: 'Avg Prep Time', value: '18 min', icon: 'access-time', color: Colors.info },
            { label: 'Customer Score', value: '4.8/5', icon: 'star', color: Colors.gold },
            { label: 'Repeat Customers', value: '67%', icon: 'people', color: Colors.primary },
          ].map(p => (
            <View key={p.label} style={styles.perfItem}>
              <MaterialIcons name={p.icon as any} size={20} color={p.color} />
              <Text style={[styles.perfValue, { color: p.color }]}>{p.value}</Text>
              <Text style={styles.perfLabel}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Restaurant Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Restaurant Details</Text>
        {[
          { label: 'Cuisine Type', value: 'Fast Food, Nigerian' },
          { label: 'Address', value: '12 Allen Avenue, Ikeja' },
          { label: 'Phone', value: '+234 801 234 5678' },
          { label: 'Opening Hours', value: '8:00 AM - 10:00 PM' },
          { label: 'Min Order', value: formatMoney(2000) },
          { label: 'Delivery Radius', value: '5 km' },
        ].map(d => (
          <View key={d.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{d.label}</Text>
            <Text style={styles.detailValue}>{d.value}</Text>
          </View>
        ))}
      </View>

      {/* Settings */}
      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Order Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: Colors.border, true: Colors.primary + '44' }} thumbColor={notifications ? Colors.primary : Colors.textMuted} />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Auto-Accept Orders</Text>
          <Switch value={autoAccept} onValueChange={setAutoAccept} trackColor={{ false: Colors.border, true: Colors.primary + '44' }} thumbColor={autoAccept ? Colors.primary : Colors.textMuted} />
        </View>
        {[{ icon: 'credit-card', label: 'Payout Settings' }, { icon: 'description', label: 'Legal Documents' }, { icon: 'help', label: 'Help & Support' }].map(s => (
          <TouchableOpacity
            key={s.label}
            style={styles.menuItem}
            onPress={() => s.label === 'Help & Support' ? router.push('/support') : showAlert(s.label, `${s.label} opened. Persist this section to Firebase before production launch.`)}
          >
            <MaterialIcons name={s.icon as any} size={20} color={Colors.textSecondary} />
            <Text style={styles.menuLabel}>{s.label}</Text>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); router.replace('/auth'); }}>
        <MaterialIcons name="logout" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  storeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, margin: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, ...Shadow.md },
  storeLogo: { width: 64, height: 64, borderRadius: BorderRadius.md, backgroundColor: 'rgba(204,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  storeInfo: { flex: 1 },
  storeName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  storeEmail: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  verifiedText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  sectionTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  perfCard: { backgroundColor: Colors.surfaceCard, margin: Spacing.md, marginTop: 0, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.md },
  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  perfItem: { width: '47%', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  perfValue: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold },
  perfLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  detailsCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  detailValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  settingsCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.md },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingLabel: { color: Colors.text, fontSize: FontSize.body },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  menuLabel: { flex: 1, color: Colors.text, fontSize: FontSize.body },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.error + '44', gap: Spacing.sm },
  logoutText: { color: Colors.error, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
