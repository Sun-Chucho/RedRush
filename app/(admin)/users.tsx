import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAlert } from '@/template';

const ROLE_TABS = ['All', 'Customers', 'Vendors', 'Riders'];

const MOCK_USERS = [
  { id: 'u1', name: 'Adaeze Okonkwo', email: 'adaeze@example.com', role: 'customer', status: 'active', joined: 'Jan 2026', orders: 12 },
  { id: 'u2', name: 'Chicken Republic', email: 'cr@example.com', role: 'vendor', status: 'active', joined: 'Mar 2025', orders: 1234 },
  { id: 'u3', name: 'Emeka Rider', email: 'emeka@example.com', role: 'rider', status: 'active', joined: 'Feb 2026', orders: 312 },
  { id: 'u4', name: 'Ngozi Eze', email: 'ngozi@example.com', role: 'customer', status: 'suspended', joined: 'Apr 2026', orders: 3 },
  { id: 'u5', name: 'Papa John\'s', email: 'pj@example.com', role: 'vendor', status: 'pending', joined: 'May 2026', orders: 0 },
  { id: 'u6', name: 'Tunde Balogun', email: 'tunde@example.com', role: 'rider', status: 'active', joined: 'Mar 2026', orders: 89 },
];

const ROLE_COLOR: Record<string, string> = {
  customer: Colors.info,
  vendor: Colors.warning,
  rider: Colors.success,
};

export default function AdminUsers() {
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  const filtered = MOCK_USERS.filter(u => {
    const matchTab = tab === 'All' || u.role === tab.toLowerCase().slice(0, -1);
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const handleAction = (user: typeof MOCK_USERS[0], action: string) => {
    showAlert(`${action} User`, `${action} action for ${user.name} — management features coming with OnSpace Cloud!`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>User Management</Text>

      {/* Search */}
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={18} color={Colors.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Search users..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      {/* Role Tabs */}
      <View style={styles.tabsRow}>
        {ROLE_TABS.map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={u => u.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={[styles.userAvatar, { backgroundColor: ROLE_COLOR[item.role] + '22' }]}>
              <MaterialIcons name={item.role === 'customer' ? 'person' : item.role === 'vendor' ? 'restaurant' : 'delivery-dining'} size={22} color={ROLE_COLOR[item.role]} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              <View style={styles.userMeta}>
                <View style={[styles.rolePill, { backgroundColor: ROLE_COLOR[item.role] + '22' }]}>
                  <Text style={[styles.rolePillText, { color: ROLE_COLOR[item.role] }]}>{item.role}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: item.status === 'active' ? Colors.success + '22' : item.status === 'pending' ? Colors.warning + '22' : Colors.error + '22' }]}>
                  <Text style={[styles.statusPillText, { color: item.status === 'active' ? Colors.success : item.status === 'pending' ? Colors.warning : Colors.error }]}>{item.status}</Text>
                </View>
                <Text style={styles.joinedText}>Joined {item.joined}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.moreBtn} onPress={() => showAlert(item.name, `Actions: View Profile, Suspend, Ban, Message`, [
              { text: 'Suspend', style: 'destructive', onPress: () => handleAction(item, 'Suspend') },
              { text: 'View', onPress: () => handleAction(item, 'View') },
              { text: 'Cancel', style: 'cancel' },
            ])}>
              <MaterialIcons name="more-vert" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, marginHorizontal: Spacing.md, paddingHorizontal: Spacing.md, height: 44, marginBottom: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.body },
  tabsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  tabTextActive: { color: Colors.text },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, padding: Spacing.md, gap: Spacing.sm, ...Shadow.md },
  userAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  userEmail: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 6, flexWrap: 'wrap' },
  rolePill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  rolePillText: { fontSize: 10, fontWeight: FontWeight.semibold },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 10, fontWeight: FontWeight.semibold },
  joinedText: { color: Colors.textMuted, fontSize: 10 },
  moreBtn: { padding: 4 },
});
