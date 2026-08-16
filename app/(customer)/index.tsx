import React, { useMemo, useState } from 'react';
import {
  Linking, Platform, View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow, createThemedStyles } from '@/constants/theme';
import { Restaurant } from '@/constants/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useLanguage } from '@/hooks/useLanguage';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useAlert } from '@/template';
import { TranslationKey } from '@/contexts/LanguageContext';
import { projectRestaurantForCustomer, sortRestaurantsForCustomer } from '@/services/restaurantLocation';

const PROMO_BANNERS: {
  id: string;
  title?: string;
  subtitle?: string;
  titleKey?: TranslationKey;
  subtitleKey?: TranslationKey;
  image: number;
}[] = [
  { id: '1', titleKey: 'freeDelivery', subtitleKey: 'first3Orders', image: require('@/home-1.webp') },
  { id: '2', title: '20% OFF', subtitle: 'Chicken Republic today only', image: require('@/home-2.webp') },
  { id: '3', title: 'Cash on Delivery', subtitle: 'Pay when your food arrives', image: require('@/home-3.webp') },
];

export default function CustomerHome() {
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { formatMoney, locationLabel, refreshLocationCurrency, coords, locationStatus } = useCurrency();
  const { notificationSettings, enablePushNotifications } = useCustomerData();
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const { restaurants, categories, isLoading, error, refreshRestaurants } = useRestaurants();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const cuisines = useMemo(() => {
    if (categories.length > 0) {
      return ['All', ...categories.map(c => c.name)];
    }
    return Array.from(new Set(['All', ...restaurants.map(r => r.cuisine)]));
  }, [categories, restaurants]);

  const filtered = useMemo(() => sortRestaurantsForCustomer(restaurants
    .map(restaurant => projectRestaurantForCustomer(restaurant, coords))
    .filter(r => {
      const matchCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
      const matchArea = !coords || r.inServiceArea;
      return matchCuisine && matchArea;
    })), [coords, restaurants, selectedCuisine]);

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, isWide && styles.contentWidth]}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>DELIVERING TO</Text>
          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => {
              if (locationStatus === 'denied' && Platform.OS !== 'web') {
                void Linking.openSettings();
                return;
              }
              void refreshLocationCurrency().catch(() => undefined);
            }}
          >
            <MaterialIcons name="location-on" size={14} color={Colors.primary} />
            <Text style={[styles.locationText, locationStatus === 'denied' && styles.locationTextDenied]} numberOfLines={1}>
              {locationStatus === 'requesting'
                ? 'Finding your location…'
                : locationStatus === 'denied'
                ? Platform.OS === 'web' ? 'Location blocked — enable it in site settings' : 'Location blocked — open settings'
                : locationStatus === 'unavailable'
                ? 'Location unavailable — tap to retry'
                : locationLabel}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => {
            if (notificationSettings.pushEnabled) {
              router.push('/(customer)/profile');
              return;
            }
            enablePushNotifications().then(outcome => {
              if (!outcome.enabled && outcome.reason === 'denied' && outcome.canAskAgain === false) {
                showAlert('Notifications blocked', outcome.message || 'Allow notifications in phone settings.', [
                  { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => undefined) },
                  { text: 'Not now', style: 'cancel' },
                ]);
                return;
              }
              showAlert('Notifications', outcome.enabled ? 'Order notifications are enabled on this phone.' : outcome.message || 'Unable to enable notifications.');
            });
          }}
        >
          <MaterialIcons name="notifications-none" size={24} color={Colors.text} />
          {notificationSettings.pushEnabled ? <View style={styles.notifDot} /> : null}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={[styles.scrollContent, isWide && styles.contentWidth]}>
        <View style={[styles.intro, isWide && styles.introWide]}>
          <View style={[styles.introCopy, isWide && styles.introCopyWide]}>
            <View style={[styles.welcomeBlock, isWide && styles.welcomeBlockWide]}>
              <Text style={[styles.greeting, isWide && styles.greetingWide]}>{t('hello')}, {firstName}</Text>
              <Text style={styles.welcomeText}>What would you like to eat today?</Text>
            </View>

            <TouchableOpacity style={[styles.searchRow, isWide && styles.searchRowWide]} onPress={() => router.push('/(customer)/search')} activeOpacity={0.8} accessibilityRole="button">
              <MaterialIcons name="search" size={20} color={Colors.textMuted} />
              <Text style={styles.searchPlaceholder}>{t('searchRestaurantsDishes')}</Text>
              <MaterialIcons name="arrow-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.promoBanner, isWide && styles.promoBannerWide]} activeOpacity={0.9}>
          <View style={styles.promoTextBlock}>
            <Text style={styles.promoKicker}>WELCOME OFFER</Text>
            <Text style={styles.promoTitle}>{PROMO_BANNERS[0].titleKey ? t(PROMO_BANNERS[0].titleKey) : PROMO_BANNERS[0].title}</Text>
            <Text style={styles.promoSubtitle}>{PROMO_BANNERS[0].subtitleKey ? t(PROMO_BANNERS[0].subtitleKey) : PROMO_BANNERS[0].subtitle}</Text>
          </View>
          <View style={styles.promoImageFrame}>
            <Image source={PROMO_BANNERS[0].image} style={styles.promoImage} contentFit="cover" />
            <View style={styles.promoImageShade} />
          </View>
          </TouchableOpacity>
        </View>

        {/* Cuisine Filter */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('restaurantsNearYou')}</Text>
          <Text style={styles.sectionCount}>{filtered.length} {t('open')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cuisineContent}>
          {cuisines.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.cuisineChip, selectedCuisine === c && styles.cuisineChipActive]}
              onPress={() => setSelectedCuisine(c)}
            >
              <Text style={[styles.cuisineChipText, selectedCuisine === c && styles.cuisineChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle2}>{selectedCuisine === 'All' ? t('allRestaurants') : selectedCuisine}</Text>
        {isLoading && restaurants.length === 0 ? (
          <View accessibilityLabel="Loading restaurants" style={[styles.restaurantGrid, isWide && styles.restaurantGridWide]}>
            {[0, 1, 2].map(item => <RestaurantSkeleton key={item} wide={isWide} />)}
          </View>
        ) : null}
        {!isLoading && error ? (
          <View style={styles.feedbackCard}>
            <MaterialIcons name="cloud-off" size={28} color={Colors.textMuted} />
            <Text style={styles.feedbackTitle}>Restaurants could not load</Text>
            <Text style={styles.feedbackBody}>Check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshRestaurants}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {!isLoading && !error && filtered.length === 0 ? (
          <View style={styles.feedbackCard}>
            <MaterialIcons name="restaurant" size={28} color={Colors.textMuted} />
            <Text style={styles.feedbackTitle}>No restaurants nearby yet</Text>
            <Text style={styles.feedbackBody}>Refresh your location or check again shortly.</Text>
          </View>
        ) : null}
        <View style={[styles.restaurantGrid, isWide && styles.restaurantGridWide]}>
          {filtered.map(r => (
            <RestaurantCard key={r.id} restaurant={r} wide={isWide} closedLabel={t('closed')} deliveryLabel={t('delivery')} formatMoney={formatMoney} onPress={() => router.push(`/restaurant/${r.id}`)} />
          ))}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

function RestaurantSkeleton({ wide }: { wide: boolean }) {
  return (
    <View style={[styles.restaurantCard, wide && styles.restaurantCardWide]}>
      <View style={[styles.restaurantImg, styles.skeleton]} />
      <View style={styles.restaurantInfo}>
        <View style={[styles.skeletonLine, { width: '62%' }]} />
        <View style={[styles.skeletonLine, { width: '42%' }]} />
        <View style={[styles.skeletonLine, { width: '78%' }]} />
      </View>
    </View>
  );
}

function RestaurantCard({ restaurant, wide, closedLabel, deliveryLabel, formatMoney, onPress }: { restaurant: Restaurant; wide: boolean; closedLabel: string; deliveryLabel: string; formatMoney: (amount: number) => string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.restaurantCard, wide && styles.restaurantCardWide]} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: restaurant.image }} style={styles.restaurantImg} contentFit="cover" cachePolicy="memory-disk" transition={120} />
      <View style={styles.restaurantInfo}>
        <View style={styles.restaurantNameRow}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          {!restaurant.isOpen ? <View style={styles.closedPill}><Text style={styles.closedPillText}>{closedLabel}</Text></View> : null}
        </View>
        <Text style={styles.restaurantCuisine}>{restaurant.cuisine}  •  {restaurant.distance}</Text>
        <View style={styles.restaurantMeta}>
          <MaterialIcons name="star" size={12} color={Colors.gold} />
          <Text style={styles.metaText}> {restaurant.rating} ({restaurant.reviewCount})</Text>
          <Text style={styles.metaDivider}>  •  </Text>
          <MaterialIcons name="access-time" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}> {restaurant.deliveryTime}</Text>
        </View>
        <View style={styles.restaurantFoot}>
          <Text style={styles.deliveryFee}>{deliveryLabel}: {formatMoney(restaurant.deliveryFee)}</Text>
          {restaurant.promo ? <View style={styles.promoTag}><Text style={styles.promoTagText}>{restaurant.promo}</Text></View> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = createThemedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },
  contentWidth: { width: '100%', maxWidth: 1280, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  headerCopy: { flex: 1, paddingRight: Spacing.md },
  eyebrow: { color: Colors.textMuted, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.1 },
  greeting: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  welcomeBlock: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  welcomeText: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, maxWidth: '82%', marginHorizontal: 3 },
  locationTextDenied: { color: Colors.warning },
  notifBtn: { position: 'relative', width: 42, height: 42, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border },
  notifDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  intro: {},
  introWide: { flexDirection: 'row', alignItems: 'stretch', gap: 24, paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  introCopy: {},
  introCopyWide: { width: '38%', justifyContent: 'center' },
  welcomeBlockWide: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: Spacing.lg },
  greetingWide: { fontSize: 30 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, paddingHorizontal: Spacing.md, height: 50, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  searchPlaceholder: { flex: 1, color: Colors.textMuted, fontSize: FontSize.sm, marginLeft: Spacing.sm },
  searchRowWide: { marginHorizontal: 0, marginBottom: 0 },
  promoBanner: { height: 142, borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: Colors.primaryDark, marginHorizontal: Spacing.md, marginBottom: Spacing.lg, flexDirection: 'row' },
  promoImageFrame: { width: '42%', height: '100%', overflow: 'hidden' },
  promoImageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
  promoImage: { width: '100%', height: '100%' },
  promoTextBlock: { width: '58%', padding: Spacing.md, justifyContent: 'center' },
  promoBannerWide: { flex: 1, height: 210, marginHorizontal: 0, marginBottom: Spacing.lg },
  promoKicker: { color: 'rgba(255,255,255,0.72)', fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1.1, marginBottom: 5 },
  promoTitle: { color: '#FFFFFF', fontSize: FontSize.md, fontWeight: FontWeight.extrabold },
  promoSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: FontSize.xs, marginTop: 5, lineHeight: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  sectionCount: { color: Colors.textMuted, fontSize: FontSize.sm },
  cuisineContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  cuisineChip: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cuisineChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cuisineChipText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  cuisineChipTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  sectionTitle2: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  restaurantCard: { flexDirection: 'row', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, overflow: 'hidden', ...Shadow.md },
  restaurantGrid: {},
  restaurantGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, paddingHorizontal: Spacing.md },
  restaurantCardWide: { width: '48.8%', marginHorizontal: 0, marginBottom: 0, minHeight: 112 },
  restaurantImg: { width: 100, height: 100 },
  restaurantInfo: { flex: 1, padding: Spacing.sm },
  restaurantNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  restaurantName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold, flex: 1 },
  closedPill: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  closedPillText: { color: Colors.textMuted, fontSize: FontSize.xs },
  restaurantCuisine: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  restaurantMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  metaDivider: { color: Colors.textMuted, fontSize: FontSize.xs },
  restaurantFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  deliveryFee: { color: Colors.textMuted, fontSize: FontSize.xs },
  promoTag: { backgroundColor: 'rgba(204,0,0,0.2)', borderRadius: BorderRadius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  promoTagText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  skeleton: { backgroundColor: Colors.surfaceElevated },
  skeletonLine: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.sm, height: 11, marginBottom: 10 },
  feedbackCard: { alignItems: 'center', backgroundColor: Colors.surfaceCard, borderColor: Colors.border, borderRadius: BorderRadius.lg, borderWidth: 1, marginHorizontal: Spacing.md, padding: Spacing.lg },
  feedbackTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginTop: Spacing.sm },
  feedbackBody: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4, textAlign: 'center' },
  retryButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, marginTop: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  retryButtonText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
}));
