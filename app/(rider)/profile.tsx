import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useOrders } from '@/hooks/useOrders';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAlert } from '@/template';
import {
  emptyRiderSettings,
  isRiderReadyForDeliveries,
  loadRiderProfileSettings,
  RiderProfileSettings,
  saveRiderProfileSettings,
} from '@/services/supabaseProfileSettings';

type Panel = 'bank' | 'mobileMoney' | 'vehicle' | 'identity' | 'notifications' | null;

export default function RiderProfile() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { orders } = useOrders();
  const router = useRouter();
  const { formatMoney } = useCurrency();
  const { showAlert } = useAlert();
  const [settings, setSettings] = useState<RiderProfileSettings>(emptyRiderSettings);
  const [draft, setDraft] = useState<RiderProfileSettings>(emptyRiderSettings);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadRiderProfileSettings(user.id).then(next => {
      setSettings(next);
      setDraft(next);
    }).catch(() => undefined);
  }, [user?.id]);

  const deliveredOrders = useMemo(
    () => orders.filter(order => order.riderId === user?.id && order.status === 'delivered'),
    [orders, user?.id]
  );
  const earnings = deliveredOrders.reduce((sum, order) => sum + Math.max(900, Math.round(order.deliveryFee * 0.8)), 0);
  const setupReady = isRiderReadyForDeliveries(settings);

  const openPanel = (panel: Panel) => {
    setDraft(settings);
    setActivePanel(panel);
  };

  const savePanel = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await saveRiderProfileSettings(user.id, draft);
      setSettings(draft);
      setActivePanel(null);
      showAlert('Settings saved', 'Your rider settings have been updated.');
    } catch (error) {
      showAlert('Settings', error instanceof Error ? error.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <MaterialIcons name="delivery-dining" size={36} color={Colors.primary} />
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.statusPill, { borderColor: setupReady ? Colors.success : Colors.warning }]}>
            <MaterialIcons name={setupReady ? 'verified' : 'pending-actions'} size={14} color={setupReady ? Colors.success : Colors.warning} />
            <Text style={[styles.statusPillText, { color: setupReady ? Colors.success : Colors.warning }]}>
              {setupReady ? 'Ready for deliveries' : 'Setup required'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { l: 'Trips', v: String(deliveredOrders.length) },
          { l: 'Earned', v: formatMoney(earnings) },
          { l: 'Status', v: settings.approvalStatus },
        ].map(s => (
          <View key={s.l} style={styles.statCard}>
            <Text style={styles.statVal} numberOfLines={1}>{s.v}</Text>
            <Text style={styles.statLbl}>{s.l}</Text>
          </View>
        ))}
      </View>

      <View style={styles.vehicleCard}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        {[
          { label: 'Vehicle Type', value: settings.vehicleType || 'Not set' },
          { label: 'Plate Number', value: settings.vehiclePlate || 'Not set' },
          { label: 'ID Number', value: settings.idNumber || 'Not set' },
          { label: 'Bank', value: settings.bankAccountNumber ? `${settings.bankName || 'Bank'} ending ${settings.bankAccountNumber.slice(-4)}` : 'Not set' },
          { label: 'Mobile Money', value: settings.mobileMoneyPhone || 'Not set' },
        ].map(d => (
          <View key={d.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{d.label}</Text>
            <Text style={styles.detailValue}>{d.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.menuCard}>
        <View style={styles.menuItem}>
          <MaterialIcons name="contrast" size={20} color={Colors.primary} />
          <Text style={styles.menuLabel}>Theme</Text>
          <ThemeToggle showLabel />
        </View>
        {[
          { icon: 'account-balance-wallet', label: 'Bank Account', panel: 'bank' as const },
          { icon: 'phone-android', label: 'Mobile Money', panel: 'mobileMoney' as const },
          { icon: 'directions-bike', label: 'Vehicle Details', panel: 'vehicle' as const },
          { icon: 'badge', label: 'Identity Details', panel: 'identity' as const },
          { icon: 'notifications', label: 'Notification Settings', panel: 'notifications' as const },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => openPanel(item.panel)}>
            <MaterialIcons name={item.icon as any} size={20} color={Colors.primary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/support')}>
          <MaterialIcons name="help" size={20} color={Colors.primary} />
          <Text style={styles.menuLabel}>Support & Help</Text>
          <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); router.replace('/auth'); }}>
        <MaterialIcons name="logout" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <SettingsModal
        panel={activePanel}
        draft={draft}
        setDraft={setDraft}
        saving={saving}
        onClose={() => setActivePanel(null)}
        onSave={savePanel}
      />

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

function SettingsModal({
  panel,
  draft,
  setDraft,
  saving,
  onClose,
  onSave,
}: {
  panel: Panel;
  draft: RiderProfileSettings;
  setDraft: React.Dispatch<React.SetStateAction<RiderProfileSettings>>;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const title = {
    bank: 'Bank Account',
    mobileMoney: 'Mobile Money',
    vehicle: 'Vehicle Details',
    identity: 'Identity Details',
    notifications: 'Notification Settings',
  }[panel || 'bank'];

  return (
    <Modal visible={!!panel} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {panel === 'bank' ? (
              <>
                <Field label="Bank name" value={draft.bankName} onChangeText={bankName => setDraft(prev => ({ ...prev, bankName }))} />
                <Field label="Account name" value={draft.bankAccountName} onChangeText={bankAccountName => setDraft(prev => ({ ...prev, bankAccountName }))} />
                <Field label="Account number" value={draft.bankAccountNumber} keyboardType="number-pad" onChangeText={bankAccountNumber => setDraft(prev => ({ ...prev, bankAccountNumber }))} />
              </>
            ) : null}

            {panel === 'mobileMoney' ? (
              <>
                <Field label="Provider" value={draft.mobileMoneyProvider} placeholder="M-Pesa, Airtel Money, MTN MoMo" onChangeText={mobileMoneyProvider => setDraft(prev => ({ ...prev, mobileMoneyProvider }))} />
                <Field label="Mobile money phone" value={draft.mobileMoneyPhone} keyboardType="phone-pad" onChangeText={mobileMoneyPhone => setDraft(prev => ({ ...prev, mobileMoneyPhone }))} />
              </>
            ) : null}

            {panel === 'vehicle' ? (
              <>
                <Field label="Vehicle type" value={draft.vehicleType} placeholder="Motorcycle, bicycle, car" onChangeText={vehicleType => setDraft(prev => ({ ...prev, vehicleType }))} />
                <Field label="Plate number" value={draft.vehiclePlate} autoCapitalize="characters" onChangeText={vehiclePlate => setDraft(prev => ({ ...prev, vehiclePlate }))} />
              </>
            ) : null}

            {panel === 'identity' ? (
              <>
                <Field label="Government ID number" value={draft.idNumber} autoCapitalize="characters" onChangeText={idNumber => setDraft(prev => ({ ...prev, idNumber }))} />
                <Text style={styles.dataSub}>Photo uploads are coming soon. For this release, RedRush verifies riders with ID number, vehicle type, plate number, and payout details.</Text>
              </>
            ) : null}

            {panel === 'notifications' ? (
              <>
                {[
                  { key: 'orderUpdates', label: 'Delivery requests and order updates' },
                  { key: 'payouts', label: 'Payout updates' },
                  { key: 'account', label: 'Account and approval updates' },
                ].map(item => (
                  <View key={item.key} style={styles.switchRow}>
                    <Text style={styles.dataTitle}>{item.label}</Text>
                    <Switch
                      value={draft.notificationSettings[item.key as keyof RiderProfileSettings['notificationSettings']]}
                      onValueChange={value => setDraft(prev => ({
                        ...prev,
                        notificationSettings: { ...prev.notificationSettings, [item.key]: value },
                      }))}
                      trackColor={{ false: Colors.border, true: Colors.primary + '66' }}
                      thumbColor={Colors.primary}
                    />
                  </View>
                ))}
              </>
            ) : null}

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={[styles.input, style]} placeholderTextColor={Colors.textMuted} {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, margin: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, ...Shadow.md },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(204,0,0,0.1)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarEditBadge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.surfaceCard },
  profileInfo: { flex: 1 },
  name: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  email: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statVal: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.extrabold, textTransform: 'capitalize' },
  statLbl: { color: Colors.textMuted, fontSize: FontSize.xs },
  vehicleCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.md },
  sectionTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.md },
  detailLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  detailValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1, textAlign: 'right' },
  menuCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.xs, marginBottom: Spacing.md, overflow: 'hidden', ...Shadow.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  menuLabel: { flex: 1, color: Colors.text, fontSize: FontSize.body },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.error + '44', gap: Spacing.sm },
  logoutText: { color: Colors.error, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modal: { maxHeight: '86%', backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  field: { marginBottom: Spacing.md },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: 6 },
  input: { color: Colors.text, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, fontSize: FontSize.body },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  uploadText: { flex: 1 },
  dataTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold, flex: 1 },
  dataSub: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  saveBtnText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
