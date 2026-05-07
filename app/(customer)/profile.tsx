import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { MOCK_RESTAURANTS } from '@/constants/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useCurrency } from '@/hooks/useCurrency';
import { useOrders } from '@/hooks/useOrders';
import { useAlert } from '@/template';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKey } from '@/contexts/LanguageContext';

type PanelKey =
  | 'savedAddresses'
  | 'paymentMethods'
  | 'favouriteRestaurants'
  | 'promoCodes'
  | 'myReviews'
  | 'notifications'
  | 'helpSupport'
  | 'aboutRedRush'
  | null;

type MenuItem = {
  icon: string;
  labelKey: TranslationKey;
  section: 'account' | 'settings';
  panel?: PanelKey;
};

const MENU_ITEMS: MenuItem[] = [
  { icon: 'location-on', labelKey: 'savedAddresses', section: 'account', panel: 'savedAddresses' },
  { icon: 'payment', labelKey: 'paymentMethods', section: 'account', panel: 'paymentMethods' },
  { icon: 'favorite', labelKey: 'favouriteRestaurants', section: 'account', panel: 'favouriteRestaurants' },
  { icon: 'local-offer', labelKey: 'promoCodes', section: 'account', panel: 'promoCodes' },
  { icon: 'star', labelKey: 'myReviews', section: 'account', panel: 'myReviews' },
  { icon: 'notifications', labelKey: 'notifications', section: 'settings', panel: 'notifications' },
  { icon: 'language', labelKey: 'language', section: 'settings' },
  { icon: 'help', labelKey: 'helpSupport', section: 'settings', panel: 'helpSupport' },
  { icon: 'info', labelKey: 'aboutRedRush', section: 'settings', panel: 'aboutRedRush' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { language, toggleLanguage, t } = useLanguage();
  const { refreshLocationCurrency } = useCurrency();
  const { orders } = useOrders();
  const customerData = useCustomerData();
  const [activePanel, setActivePanel] = useState<PanelKey>(null);
  const [newAddress, setNewAddress] = useState('');

  const favouriteRestaurants = useMemo(
    () => MOCK_RESTAURANTS.filter(restaurant => customerData.favouriteRestaurantIds.includes(restaurant.id)),
    [customerData.favouriteRestaurantIds]
  );
  const deliveredOrders = orders.filter(order => order.status === 'delivered');

  const accountItems = MENU_ITEMS.filter(i => i.section === 'account');
  const settingsItems = MENU_ITEMS.filter(i => i.section === 'settings');

  const handleLogout = () => {
    showAlert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: () => { logout(); router.replace('/auth'); } },
    ]);
  };

  const addCurrentLocation = async () => {
    try {
      const label = await refreshLocationCurrency();
      customerData.addSavedAddress({ label: 'Current location', details: label, isDefault: true });
      showAlert('Location saved', 'Your current location is now saved as the default delivery address.');
    } catch {
      showAlert('Location', 'Unable to read your current location. Check location permission and try again.');
    }
  };

  const addManualAddress = () => {
    if (!newAddress.trim()) {
      showAlert('Address', 'Enter an address before saving.');
      return;
    }

    customerData.addSavedAddress({ label: 'Saved address', details: newAddress.trim(), isDefault: false });
    setNewAddress('');
  };

  const enableNotifications = async () => {
    const granted = await customerData.enablePushNotifications();
    showAlert(
      'Notifications',
      granted ? 'In-app notifications are enabled for order updates and account alerts.' : 'Notification permission was not granted.'
    );
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0] || 'U'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <Text style={styles.profilePhone}>{user?.phone}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => showAlert(t('editProfile'), 'Profile edits are saved from the account record in Firebase Auth and Firestore.')}>
          <MaterialIcons name="edit" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: t('orders'), value: String(orders.length) },
          { label: t('reviews'), value: String(customerData.reviews.length) },
          { label: t('favourites'), value: String(customerData.favouriteRestaurantIds.length) },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.loyaltyCard}>
        <View style={styles.loyaltyLeft}>
          <MaterialIcons name="card-membership" size={24} color={Colors.gold} />
          <View style={{ marginLeft: Spacing.sm }}>
            <Text style={styles.loyaltyTitle}>RedRush Gold</Text>
            <Text style={styles.loyaltyPoints}>{Math.max(2450, orders.length * 120)} {t('points')}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.redeemBtn} onPress={() => setActivePanel('promoCodes')}>
          <Text style={styles.redeemText}>{t('redeem')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('account')}</Text>
      <View style={styles.menuSection}>
        {accountItems.map(item => (
          <TouchableOpacity key={item.labelKey} style={styles.menuItem} onPress={() => setActivePanel(item.panel || null)}>
            <MaterialIcons name={item.icon as any} size={22} color={Colors.primary} />
            <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
            <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('settings')}</Text>
      <View style={styles.menuSection}>
        {settingsItems.map(item => (
          <TouchableOpacity
            key={item.labelKey}
            style={styles.menuItem}
            onPress={item.labelKey === 'language' ? toggleLanguage : () => setActivePanel(item.panel || null)}
          >
            <MaterialIcons name={item.icon as any} size={22} color={Colors.textSecondary} />
            <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
            {item.labelKey === 'language' ? (
              <Text style={styles.languageValue}>{language === 'en' ? t('languageEnglish') : t('languageKiswahili')}</Text>
            ) : (
              <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialIcons name="logout" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>{t('signOut')}</Text>
      </TouchableOpacity>

      <PanelModal title={activePanel ? t(activePanel) : ''} visible={!!activePanel} onClose={() => setActivePanel(null)}>
        {activePanel === 'savedAddresses' ? (
          <>
            {customerData.savedAddresses.map(address => (
              <TouchableOpacity key={address.id} style={styles.dataRow} onPress={() => customerData.setDefaultAddress(address.id)}>
                <MaterialIcons name={address.isDefault ? 'home' : 'place'} size={22} color={Colors.primary} />
                <View style={styles.dataText}>
                  <Text style={styles.dataTitle}>{address.label}</Text>
                  <Text style={styles.dataSub}>{address.details}</Text>
                </View>
                {address.isDefault ? <MaterialIcons name="check-circle" size={20} color={Colors.success} /> : null}
              </TouchableOpacity>
            ))}
            <TextInput style={styles.input} value={newAddress} onChangeText={setNewAddress} placeholder="Add delivery address" placeholderTextColor={Colors.textMuted} />
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={addCurrentLocation}><Text style={styles.secondaryBtnText}>Use current location</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={addManualAddress}><Text style={styles.primaryBtnText}>Save</Text></TouchableOpacity>
            </View>
          </>
        ) : null}

        {activePanel === 'paymentMethods' ? customerData.paymentMethods.map(method => (
          <TouchableOpacity key={method.id} style={styles.dataRow} onPress={() => customerData.setDefaultPaymentMethod(method.id)}>
            <MaterialIcons name={method.type === 'card' ? 'credit-card' : method.type === 'cash' ? 'payments' : 'phone-android'} size={22} color={Colors.primary} />
            <View style={styles.dataText}>
              <Text style={styles.dataTitle}>{method.label}</Text>
              <Text style={styles.dataSub}>{method.detail}</Text>
            </View>
            {method.isDefault ? <MaterialIcons name="check-circle" size={20} color={Colors.success} /> : null}
          </TouchableOpacity>
        )) : null}

        {activePanel === 'favouriteRestaurants' ? (
          <>
            {favouriteRestaurants.map(restaurant => (
              <TouchableOpacity key={restaurant.id} style={styles.dataRow} onPress={() => router.push(`/restaurant/${restaurant.id}`)}>
                <MaterialIcons name="storefront" size={22} color={Colors.primary} />
                <View style={styles.dataText}>
                  <Text style={styles.dataTitle}>{restaurant.name}</Text>
                  <Text style={styles.dataSub}>{restaurant.cuisine} - {restaurant.deliveryTime}</Text>
                </View>
                <TouchableOpacity onPress={() => customerData.toggleFavouriteRestaurant(restaurant.id)}>
                  <MaterialIcons name="favorite" size={22} color={Colors.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {favouriteRestaurants.length === 0 ? <EmptyPanel text="Tap the heart on a restaurant to save it here." /> : null}
          </>
        ) : null}

        {activePanel === 'promoCodes' ? customerData.promoCodes.map(promo => (
          <View key={promo.id} style={[styles.dataRow, promo.used && styles.disabledRow]}>
            <MaterialIcons name="local-offer" size={22} color={promo.used ? Colors.textMuted : Colors.primary} />
            <View style={styles.dataText}>
              <Text style={styles.dataTitle}>{promo.code} - {promo.title}</Text>
              <Text style={styles.dataSub}>{promo.description} Expires {promo.expiresAt}</Text>
            </View>
            <Text style={styles.badgeText}>{promo.used ? 'Used' : `${promo.discountPercent}%`}</Text>
          </View>
        )) : null}

        {activePanel === 'myReviews' ? (
          <>
            {customerData.reviews.map(review => (
              <View key={review.id} style={styles.dataRow}>
                <MaterialIcons name="star" size={22} color={Colors.gold} />
                <View style={styles.dataText}>
                  <Text style={styles.dataTitle}>{review.restaurantName} - {review.rating}/5</Text>
                  <Text style={styles.dataSub}>{review.comment}</Text>
                </View>
              </View>
            ))}
            {deliveredOrders.map(order => (
              <TouchableOpacity
                key={`review-order-${order.id}`}
                style={styles.secondaryFullBtn}
                onPress={() => customerData.addReview({
                  restaurantId: order.restaurantId,
                  restaurantName: order.restaurantName,
                  rating: 5,
                  comment: 'Great food and smooth delivery.',
                })}
              >
                <Text style={styles.secondaryBtnText}>Add review for {order.restaurantName}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        {activePanel === 'notifications' ? (
          <>
            {[
              { key: 'orderUpdates', label: 'Order updates' },
              { key: 'promos', label: 'Promotions and discounts' },
              { key: 'account', label: 'Account and security' },
            ].map(item => (
              <View key={item.key} style={styles.switchRow}>
                <Text style={styles.dataTitle}>{item.label}</Text>
                <Switch
                  value={customerData.notificationSettings[item.key as 'orderUpdates' | 'promos' | 'account']}
                  onValueChange={value => customerData.updateNotificationSetting(item.key as 'orderUpdates' | 'promos' | 'account', value)}
                  trackColor={{ false: Colors.border, true: Colors.primary + '66' }}
                  thumbColor={Colors.primary}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.primaryFullBtn} onPress={enableNotifications}><Text style={styles.primaryBtnText}>Enable in-app notifications</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondaryFullBtn} onPress={() => customerData.sendLocalNotification('RedRush test', 'In-app notifications are working on this device.')}><Text style={styles.secondaryBtnText}>Send test notification</Text></TouchableOpacity>
          </>
        ) : null}

        {activePanel === 'helpSupport' ? (
          <View style={styles.infoBlock}>
            <Text style={styles.infoText}>Support is available for order issues, refunds, rider delays, vendor questions, and account access.</Text>
            <TouchableOpacity style={styles.primaryFullBtn} onPress={() => { setActivePanel(null); router.push('/support'); }}>
              <Text style={styles.primaryBtnText}>Open support chat</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {activePanel === 'aboutRedRush' ? (
          <View style={styles.infoBlock}>
            <Text style={styles.infoText}>RedRush is a multi-role food delivery app for customers, vendors, riders, and administrators. This build uses Firebase Auth and Firestore for signed-in user profiles, orders, customer preferences, and operations data.</Text>
            <Text style={styles.infoText}>Version 1.0.0 - Expo SDK 54 - React Native 0.81.</Text>
          </View>
        ) : null}
      </PanelModal>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

function PanelModal({ title, visible, children, onClose }: { title: string; visible: boolean; children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <View style={styles.emptyPanel}>
      <MaterialIcons name="inbox" size={36} color={Colors.textMuted} />
      <Text style={styles.dataSub}>{text}</Text>
    </View>
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
  languageValue: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.error + '44', gap: Spacing.sm },
  logoutText: { color: Colors.error, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCard: { maxHeight: '82%', backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.md },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  disabledRow: { opacity: 0.55 },
  dataText: { flex: 1 },
  dataTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  dataSub: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 3, lineHeight: 19 },
  badgeText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  input: { color: Colors.text, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  primaryBtn: { flex: 1, alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md },
  secondaryBtn: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md },
  primaryFullBtn: { alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  secondaryFullBtn: { alignItems: 'center', borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  primaryBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  secondaryBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  infoBlock: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  infoText: { color: Colors.textSecondary, fontSize: FontSize.body, lineHeight: 22 },
  emptyPanel: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
});
