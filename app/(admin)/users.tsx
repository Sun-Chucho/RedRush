import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { UserRole } from '@/constants/mockData';
import { db } from '@/services/firebase';
import { useAlert } from '@/template';
import { reviewRoleRequestOnBackend } from '@/services/backend';
import { fetchSupabaseAdminUsers, fetchSupabaseRoleRequests } from '@/services/supabaseRoles';

const ROLE_TABS = ['All', 'Customers', 'Vendors', 'Riders'];

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  joined: string;
  orders: number;
};

type RoleRequest = {
  id: string;
  userName: string;
  email: string;
  requestedRole: UserRole;
  status: string;
};

const ROLE_COLOR: Record<string, string> = {
  customer: Colors.info,
  vendor: Colors.warning,
  rider: Colors.success,
  admin: Colors.primary,
};

export default function AdminUsers() {
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchSupabaseAdminUsers().then(nextUsers => {
      if (nextUsers?.length) setUsers(nextUsers);
    });

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      snapshot => {
        if (snapshot.empty) return;

        setUsers(snapshot.docs.map(userDoc => {
          const data = userDoc.data() as Partial<AdminUser> & { createdAt?: { toDate?: () => Date } };
          const createdAt = data.createdAt?.toDate?.();

          return {
            id: userDoc.id,
            name: data.name || 'Unnamed user',
            email: data.email || '',
            role: data.role || 'customer',
            status: data.status || 'active',
            joined: createdAt ? createdAt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'New',
            orders: Number(data.orders || 0),
          };
        }));
      },
      () => undefined
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    fetchSupabaseRoleRequests().then(nextRequests => {
      if (nextRequests) setRoleRequests(nextRequests);
    });

    const unsubscribe = onSnapshot(
      collection(db, 'roleRequests'),
      snapshot => {
        setRoleRequests(snapshot.docs.map(requestDoc => {
          const data = requestDoc.data() as Partial<RoleRequest>;
          return {
            id: requestDoc.id,
            userName: data.userName || 'Unnamed user',
            email: data.email || '',
            requestedRole: data.requestedRole || 'vendor',
            status: data.status || 'pending',
          };
        }));
      },
      () => undefined
    );

    return unsubscribe;
  }, []);

  const filtered = users.filter(u => {
    const matchTab = tab === 'All' || u.role === tab.toLowerCase().slice(0, -1);
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const handleAction = (user: AdminUser, action: string) => {
    if (action === 'Suspend') {
      updateDoc(doc(db, 'users', user.id), {
        status: 'suspended',
        updatedAt: serverTimestamp(),
      }).catch(() => undefined);
    }

    showAlert(`${action} User`, `${action} action recorded for ${user.name}. Status changes are written to Firestore when permissions allow it.`);
  };

  const handleReviewRoleRequest = async (request: RoleRequest, decision: 'approved' | 'rejected') => {
    try {
      await reviewRoleRequestOnBackend(request.id, decision);
      showAlert('Role Request', `${request.userName}'s ${request.requestedRole} request was ${decision}.`);
    } catch (error) {
      showAlert('Role Request', error instanceof Error ? error.message : 'Unable to review this request.');
    }
  };

  const pendingRoleRequests = roleRequests.filter(request => request.status === 'pending');

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
        ListHeaderComponent={pendingRoleRequests.length ? (
          <View style={styles.requestsSection}>
            <Text style={styles.requestsTitle}>Pending Role Requests</Text>
            {pendingRoleRequests.map(request => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{request.userName}</Text>
                  <Text style={styles.userEmail}>{request.email}</Text>
                  <Text style={styles.requestRole}>Requested: {request.requestedRole}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReviewRoleRequest(request, 'rejected')}>
                    <MaterialIcons name="close" size={16} color={Colors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleReviewRoleRequest(request, 'approved')}>
                    <MaterialIcons name="check" size={16} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={[styles.userAvatar, { backgroundColor: ROLE_COLOR[item.role] + '22' }]}>
              <MaterialIcons name={item.role === 'customer' ? 'person' : item.role === 'vendor' ? 'restaurant' : item.role === 'admin' ? 'admin-panel-settings' : 'delivery-dining'} size={22} color={ROLE_COLOR[item.role]} />
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
  requestsSection: { marginBottom: Spacing.md },
  requestsTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  requestCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '55', ...Shadow.md },
  requestRole: { color: Colors.primary, fontSize: FontSize.xs, marginTop: 4, fontWeight: FontWeight.semibold },
  requestActions: { flexDirection: 'row', gap: Spacing.sm },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
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
