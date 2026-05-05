import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';

export default function RiderProfile() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <MaterialIcons name="delivery-dining" size={36} color={Colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.verifiedRow}>
            <MaterialIcons name="verified" size={14} color={Colors.success} />
            <Text style={styles.verifiedText}> ID Verified  •  4.9 ⭐ Rating</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[{ l: 'Trips', v: '312' }, { l: 'This Month', v: '₦137k' }, { l: 'Acceptance', v: '94%' }].map(s => (
          <View key={s.l} style={styles.statCard}>
            <Text style={styles.statVal}>{s.v}</Text>
            <Text style={styles.statLbl}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Vehicle Info */}
      <View style={styles.vehicleCard}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        {[
          { label: 'Vehicle Type', value: 'Motorcycle' },
          { label: 'Plate Number', value: 'LND-234-ZB' },
          { label: 'Insurance', value: 'Valid until Dec 2026' },
          { label: 'ID Verification', value: 'Approved ✓' },
        ].map(d => (
          <View key={d.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{d.label}</Text>
            <Text style={styles.detailValue}>{d.value}</Text>
          </View>
        ))}
      </View>

      {/* Menu */}
      <View style={styles.menuCard}>
        {[
          { icon: 'account-balance-wallet', label: 'Bank Account' },
          { icon: 'phone-android', label: 'Mobile Money' },
          { icon: 'directions-bike', label: 'Vehicle Documents' },
          { icon: 'notifications', label: 'Notification Settings' },
          { icon: 'help', label: 'Support & Help' },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => showAlert(item.label, 'Coming soon!')}>
            <MaterialIcons name={item.icon as any} size={20} color={Colors.primary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
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
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, margin: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, ...Shadow.md },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(204,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  profileInfo: { flex: 1 },
  name: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  email: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  verifiedText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statVal: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  statLbl: { color: Colors.textMuted, fontSize: FontSize.xs },
  vehicleCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  detailValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  menuCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.xs, marginBottom: Spacing.md, overflow: 'hidden', ...Shadow.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  menuLabel: { flex: 1, color: Colors.text, fontSize: FontSize.body },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.error + '44', gap: Spacing.sm },
  logoutText: { color: Colors.error, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
