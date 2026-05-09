import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useOrders } from '@/hooks/useOrders';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useAlert } from '@/template';
import { ThemeToggle } from '@/components/ThemeToggle';
import { pickCompressAndUploadImage } from '@/services/cloudinary';
import {
  emptyVendorSettings,
  loadVendorProfileSettings,
  saveVendorProfileSettings,
  VendorProfileSettings,
} from '@/services/supabaseProfileSettings';

type Panel = 'profile' | 'payout' | 'mobileMoney' | 'legal' | 'notifications' | null;

export default function VendorProfile() {
  const [savingLocation, setSavingLocation] = useState(false);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [settings, setSettings] = useState<VendorProfileSettings>(emptyVendorSettings);
  const [draft, setDraft] = useState<VendorProfileSettings>(emptyVendorSettings);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { formatMoney } = useCurrency();
  const { orders } = useOrders();
  const { getVendorRestaurant, updateVendorRestaurantLocation, updateVendorRestaurantProfile } = useRestaurants();
  const restaurant = getVendorRestaurant();

  useEffect(() => {
    if (!user?.id) return;
    loadVendorProfileSettings(user.id).then(next => {
      const merged = {
        ...next,
        businessName: next.businessName || restaurant?.name || user.name || '',
        businessPhone: next.businessPhone || user.phone || '',
        businessAddress: next.businessAddress || restaurant?.address || user.address || '',
        restaurantId: restaurant?.id || next.restaurantId,
      };
      setSettings(merged);
      setDraft(merged);
    }).catch(() => undefined);
  }, [restaurant?.id, restaurant?.name, restaurant?.address, user?.id]);

  const deliveredOrders = orders.filter(order => order.status === 'delivered');
  const revenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0);
  const avgOrder = deliveredOrders.length ? Math.round(revenue / deliveredOrders.length) : 0;
  const activeItems = restaurant?.menu.filter(item => item.available).length || 0;

  const uploadStoreImage = async () => {
    try {
      const url = await pickCompressAndUploadImage('vendor');
      if (!url) return;
      await updateProfile({ avatar: url });
      await updateVendorRestaurantProfile({ image: url, coverImage: url });
      showAlert('Store image saved', 'Your vendor image has been updated.');
    } catch (error) {
      showAlert('Image upload', error instanceof Error ? error.message : 'Unable to upload this image.');
    }
  };

  const saveCurrentLocation = async () => {
    setSavingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        showAlert('Location required', 'Allow location access so RedRush can save your shop position.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [place] = await Location.reverseGeocodeAsync(current.coords);
      const address = [
        place?.name,
        place?.street,
        place?.district,
        place?.city,
        place?.region,
        place?.country,
      ].filter(Boolean).join(', ') || `${current.coords.latitude.toFixed(6)}, ${current.coords.longitude.toFixed(6)}`;

      await updateVendorRestaurantLocation({
        address,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      if (user?.id) {
        await saveVendorProfileSettings(user.id, { businessAddress: address });
        setSettings(prev => ({ ...prev, businessAddress: address }));
      }

      showAlert('Shop location saved', 'Customers near this area can now find your store more accurately.');
    } catch (error) {
      showAlert('Location not saved', error instanceof Error ? error.message : 'Unable to save shop location.');
    } finally {
      setSavingLocation(false);
    }
  };

  const openPanel = (panel: Panel) => {
    setDraft(settings);
    setActivePanel(panel);
  };

  const savePanel = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await saveVendorProfileSettings(user.id, draft);
      await updateProfile({
        name: draft.businessName || user.name,
        phone: draft.businessPhone || user.phone,
        address: draft.businessAddress || user.address,
        restaurantId: restaurant?.id || draft.restaurantId,
      });
      await updateVendorRestaurantProfile({
        name: draft.businessName || restaurant?.name,
        address: draft.businessAddress || restaurant?.address,
      });
      setSettings(draft);
      setActivePanel(null);
      showAlert('Settings saved', 'Your vendor settings have been updated.');
    } catch (error) {
      showAlert('Settings', error instanceof Error ? error.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const uploadLegalDocument = async () => {
    try {
      const url = await pickCompressAndUploadImage('vendor');
      if (!url) return;
      setDraft(prev => ({ ...prev, legalDocumentUrl: url }));
    } catch (error) {
      showAlert('Document upload', error instanceof Error ? error.message : 'Unable to upload this document image.');
    }
  };

  const stats = useMemo(() => [
    { label: 'Orders', value: String(orders.length), icon: 'receipt-long', color: Colors.primary },
    { label: 'Revenue', value: formatMoney(revenue), icon: 'payments', color: Colors.success },
    { label: 'Avg Order', value: formatMoney(avgOrder), icon: 'trending-up', color: Colors.info },
    { label: 'Menu Items', value: String(activeItems), icon: 'restaurant-menu', color: Colors.gold },
  ], [activeItems, avgOrder, formatMoney, orders.length, revenue]);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={styles.storeCard}>
        <TouchableOpacity style={styles.storeLogo} onPress={uploadStoreImage} activeOpacity={0.85}>
          {user?.avatar || restaurant?.image ? (
            <Image source={{ uri: user?.avatar || restaurant?.image }} style={styles.storeLogoImage} contentFit="cover" />
          ) : (
            <MaterialIcons name="restaurant" size={36} color={Colors.primary} />
          )}
          <View style={styles.avatarEditBadge}>
            <MaterialIcons name="photo-camera" size={13} color={Colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{restaurant?.name || settings.businessName || user?.name}</Text>
          <Text style={styles.storeEmail}>{user?.email}</Text>
          <View style={styles.verifiedBadge}>
            <MaterialIcons name={settings.approvalStatus === 'approved' ? 'verified' : 'pending-actions'} size={14} color={settings.approvalStatus === 'approved' ? Colors.success : Colors.warning} />
            <Text style={[styles.verifiedText, { color: settings.approvalStatus === 'approved' ? Colors.success : Colors.warning }]}>
              {settings.approvalStatus === 'approved' ? 'Verified Restaurant' : 'Pending approval'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => openPanel('profile')}>
          <MaterialIcons name="edit" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.perfCard}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.perfGrid}>
          {stats.map(p => (
            <View key={p.label} style={styles.perfItem}>
              <MaterialIcons name={p.icon as any} size={20} color={p.color} />
              <Text style={[styles.perfValue, { color: p.color }]} numberOfLines={1}>{p.value}</Text>
              <Text style={styles.perfLabel}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Restaurant Details</Text>
        {[
          { label: 'Cuisine Type', value: restaurant?.cuisine || 'Not set' },
          { label: 'Address', value: restaurant?.address || settings.businessAddress || 'Not set' },
          {
            label: 'GPS Pin',
            value: typeof restaurant?.latitude === 'number' && typeof restaurant?.longitude === 'number'
              ? `${restaurant.latitude.toFixed(5)}, ${restaurant.longitude.toFixed(5)}`
              : 'Not set',
          },
          { label: 'Phone', value: settings.businessPhone || user?.phone || 'Not set' },
          { label: 'Min Order', value: formatMoney(restaurant?.minOrder || 0) },
          { label: 'Delivery Fee', value: formatMoney(restaurant?.deliveryFee || 0) },
        ].map(d => (
          <View key={d.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{d.label}</Text>
            <Text style={styles.detailValue}>{d.value}</Text>
          </View>
        ))}
        <TouchableOpacity style={[styles.locationBtn, savingLocation && styles.locationBtnDisabled]} onPress={saveCurrentLocation} disabled={savingLocation}>
          <MaterialIcons name="my-location" size={18} color={Colors.text} />
          <Text style={styles.locationBtnText}>{savingLocation ? 'Saving location...' : 'Use current location as shop address'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Theme</Text>
          <ThemeToggle showLabel />
        </View>
        {[
          { icon: 'credit-card', label: 'Payout Settings', panel: 'payout' as const },
          { icon: 'phone-android', label: 'Mobile Money', panel: 'mobileMoney' as const },
          { icon: 'description', label: 'Legal Documents', panel: 'legal' as const },
          { icon: 'notifications', label: 'Notification Settings', panel: 'notifications' as const },
        ].map(s => (
          <TouchableOpacity key={s.label} style={styles.menuItem} onPress={() => openPanel(s.panel)}>
            <MaterialIcons name={s.icon as any} size={20} color={Colors.textSecondary} />
            <Text style={styles.menuLabel}>{s.label}</Text>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/support')}>
          <MaterialIcons name="help" size={20} color={Colors.textSecondary} />
          <Text style={styles.menuLabel}>Help & Support</Text>
          <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); router.replace('/auth'); }}>
        <MaterialIcons name="logout" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <VendorSettingsModal
        panel={activePanel}
        draft={draft}
        setDraft={setDraft}
        saving={saving}
        onClose={() => setActivePanel(null)}
        onSave={savePanel}
        onUploadLegalDocument={uploadLegalDocument}
      />

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

function VendorSettingsModal({
  panel,
  draft,
  setDraft,
  saving,
  onClose,
  onSave,
  onUploadLegalDocument,
}: {
  panel: Panel;
  draft: VendorProfileSettings;
  setDraft: React.Dispatch<React.SetStateAction<VendorProfileSettings>>;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onUploadLegalDocument: () => void;
}) {
  const title = {
    profile: 'Restaurant Profile',
    payout: 'Payout Settings',
    mobileMoney: 'Mobile Money',
    legal: 'Legal Documents',
    notifications: 'Notification Settings',
  }[panel || 'profile'];

  return (
    <Modal visible={!!panel} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {panel === 'profile' ? (
              <>
                <Field label="Restaurant name" value={draft.businessName} onChangeText={businessName => setDraft(prev => ({ ...prev, businessName }))} />
                <Field label="Business phone" value={draft.businessPhone} keyboardType="phone-pad" onChangeText={businessPhone => setDraft(prev => ({ ...prev, businessPhone }))} />
                <Field label="Business address" value={draft.businessAddress} multiline onChangeText={businessAddress => setDraft(prev => ({ ...prev, businessAddress }))} />
              </>
            ) : null}

            {panel === 'payout' ? (
              <>
                <Field label="Bank name" value={draft.payoutBankName} onChangeText={payoutBankName => setDraft(prev => ({ ...prev, payoutBankName }))} />
                <Field label="Account name" value={draft.payoutAccountName} onChangeText={payoutAccountName => setDraft(prev => ({ ...prev, payoutAccountName }))} />
                <Field label="Account number" value={draft.payoutAccountNumber} keyboardType="number-pad" onChangeText={payoutAccountNumber => setDraft(prev => ({ ...prev, payoutAccountNumber }))} />
              </>
            ) : null}

            {panel === 'mobileMoney' ? (
              <>
                <Field label="Provider" value={draft.payoutMobileMoneyProvider} placeholder="M-Pesa, Airtel Money, MTN MoMo" onChangeText={payoutMobileMoneyProvider => setDraft(prev => ({ ...prev, payoutMobileMoneyProvider }))} />
                <Field label="Mobile money phone" value={draft.payoutMobileMoneyPhone} keyboardType="phone-pad" onChangeText={payoutMobileMoneyPhone => setDraft(prev => ({ ...prev, payoutMobileMoneyPhone }))} />
              </>
            ) : null}

            {panel === 'legal' ? (
              <TouchableOpacity style={styles.uploadRow} onPress={onUploadLegalDocument}>
                <MaterialIcons name={draft.legalDocumentUrl ? 'check-circle' : 'upload-file'} size={22} color={draft.legalDocumentUrl ? Colors.success : Colors.primary} />
                <View style={styles.uploadText}>
                  <Text style={styles.dataTitle}>Business license or permit</Text>
                  <Text style={styles.dataSub}>{draft.legalDocumentUrl ? 'Uploaded' : 'Tap to upload image'}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : null}

            {panel === 'notifications' ? (
              <>
                <View style={styles.switchRow}>
                  <Text style={styles.dataTitle}>Auto-accept orders</Text>
                  <Switch
                    value={draft.autoAcceptOrders}
                    onValueChange={autoAcceptOrders => setDraft(prev => ({ ...prev, autoAcceptOrders }))}
                    trackColor={{ false: Colors.border, true: Colors.primary + '66' }}
                    thumbColor={Colors.primary}
                  />
                </View>
                {[
                  { key: 'orderUpdates', label: 'Order notifications' },
                  { key: 'payouts', label: 'Payout updates' },
                  { key: 'account', label: 'Account and approval updates' },
                ].map(item => (
                  <View key={item.key} style={styles.switchRow}>
                    <Text style={styles.dataTitle}>{item.label}</Text>
                    <Switch
                      value={draft.notificationSettings[item.key as keyof VendorProfileSettings['notificationSettings']]}
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
  storeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, margin: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, ...Shadow.md },
  storeLogo: { width: 64, height: 64, borderRadius: BorderRadius.md, backgroundColor: 'rgba(204,0,0,0.1)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  storeLogoImage: { width: '100%', height: '100%' },
  avatarEditBadge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.surfaceCard },
  storeInfo: { flex: 1 },
  storeName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  storeEmail: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  verifiedText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  sectionTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  perfCard: { backgroundColor: Colors.surfaceCard, margin: Spacing.md, marginTop: 0, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.md },
  perfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  perfItem: { width: '47%', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  perfValue: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold },
  perfLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  detailsCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  detailValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1, textAlign: 'right', marginLeft: Spacing.md },
  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 13, marginTop: Spacing.md },
  locationBtnDisabled: { opacity: 0.7 },
  locationBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  settingsCard: { backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadow.md },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingLabel: { color: Colors.text, fontSize: FontSize.body },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
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
