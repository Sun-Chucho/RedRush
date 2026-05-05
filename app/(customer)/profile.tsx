import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';

const MENU_ITEMS = [
  { icon: 'location-on', label: 'Saved Addresses', section: 'account' },
  { icon: 'payment', label: 'Payment Methods', section: 'account' },
  { icon: 'favorite', label: 'Favourite Restaurants', section: 'account' },
  { icon: 'local-offer', label: 'Promo Codes', section: 'account' },
  { icon: 'star', label: 'My Reviews', section: 'account' },
  { icon: 'notifications', label: 'Notifications', section: 'settings' },
  { icon: 'language', label: 'Language', section: 'settings' },
  { icon: 'help', label: 'Help & Support', section: 'settings' },
  { icon: 'info', label: 'About RedRush', section: 'settings' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();

  const accountItems = MENU_ITEMS.filter(i => i.section === 'account');
  const settingsItems = MENU_ITEMS.filter(i => i.section === 'settings');

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/auth'); } },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <Text style={styles.profilePhone}>{user?.phone}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => showAlert('Edit Profile', 'Profile editing coming soon!')}>
          <MaterialIcons name="edit" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[{ label: 'Orders', value: '12' }, { label: 'Reviews', value: '8' }, { label: 'Favourites', value: '5' }].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Loyalty */}
      <View style={styles.loyaltyCard}>
        <View style={styles.loyaltyLeft}>
          <MaterialIcons name="card-membership" size={24} color={Colors.gold} />
          <View style={{ marginLeft: Spacing.sm }}>
            <Text style={styles.loyaltyTitle}>RedRush Gold</Text>
            <Text style={styles.loyaltyPoints}>2,450 points</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.redeemBtn}>
          <Text style={styles.redeemText}>Redeem</Text>
        </TouchableOpacity>
      </View>

      {/* Account */}
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.menuSection}>
        {accountItems.map(item => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => showAlert(item.label, 'This feature is coming soon!')}>
            <MaterialIcons name={item.icon as any} size={22} color={Colors.primary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Settings */}
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.menuSection}>
        {settingsItems.map(item => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => showAlert(item.label, 'This feature is coming soon!')}>
            <MaterialIcons name={item.icon as any} size={22} color={Colors.textSecondary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surfaceCard, margin: Spacing.md, borderRadius: BorderRadius.lg, ...Shadow.md },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  profileInfo: { flex: 1, marginLeft: Spacing.md },
  profileName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  profileEmail: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  profilePhone: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  editBtn: { padding: 8 },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  loyaltyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  loyaltyLeft: { flexDirection: 'row', alignItems: 'center' },
  loyaltyTitle: { color: Colors.gold, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  loyaltyPoints: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  redeemBtn: { backgroundColor: Colors.gold, borderRadius: BorderRadius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  redeemText: { color: Colors.background, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  sectionTitle: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, paddingHorizontal: Spacing.md, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  menuSection: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  menuLabel: { flex: 1, color: Colors.text, fontSize: FontSize.body },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.error + '44', gap: Spacing.sm },
  logoutText: { color: Colors.error, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
