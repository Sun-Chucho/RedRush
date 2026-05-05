import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { MOCK_RESTAURANTS, CUISINES, Restaurant } from '@/constants/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';

const PROMO_BANNERS = [
  { id: '1', title: 'Free Delivery', subtitle: 'On your first 3 orders', bg: Colors.primary, icon: 'delivery-dining' },
  { id: '2', title: '20% OFF', subtitle: 'Chicken Republic today only', bg: '#1A1A2E', icon: 'local-offer' },
  { id: '3', title: 'MTN MoMo Pay', subtitle: 'Earn 500 cashback per order', bg: '#2A2A1A', icon: 'payment' },
];

export default function CustomerHome() {
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { formatMoney, locationLabel } = useCurrency();

  const filtered = MOCK_RESTAURANTS.filter(r => {
    const matchCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCuisine && matchSearch;
  });

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color={Colors.primary} />
            <Text style={styles.locationText}>{locationLabel}  </Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color={Colors.textSecondary} />
          </View>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <MaterialIcons name="notifications-none" size={24} color={Colors.text} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Search */}
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants or dishes..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => router.push('/(customer)/search')}
          />
          <TouchableOpacity style={styles.filterBtn}>
            <MaterialIcons name="tune" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Promo Banners */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promoScroll} contentContainerStyle={styles.promoContent}>
          {PROMO_BANNERS.map(banner => (
            <TouchableOpacity key={banner.id} style={[styles.promoBanner, { backgroundColor: banner.bg }]}>
              <View>
                <Text style={styles.promoTitle}>{banner.title}</Text>
                <Text style={styles.promoSubtitle}>{banner.subtitle}</Text>
              </View>
              <MaterialIcons name={banner.icon as any} size={40} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Cuisine Filter */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Restaurants Near You</Text>
          <Text style={styles.sectionCount}>{filtered.length} open</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cuisineContent}>
          {CUISINES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.cuisineChip, selectedCuisine === c && styles.cuisineChipActive]}
              onPress={() => setSelectedCuisine(c)}
            >
              <Text style={[styles.cuisineChipText, selectedCuisine === c && styles.cuisineChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredContent}>
          {filtered.slice(0, 3).map(r => <FeaturedCard key={r.id} restaurant={r} onPress={() => router.push(`/restaurant/${r.id}`)} />)}
        </ScrollView>

        {/* All Restaurants */}
        <Text style={styles.sectionTitle2}>All Restaurants</Text>
        {filtered.map(r => (
          <RestaurantCard key={r.id} restaurant={r} formatMoney={formatMoney} onPress={() => router.push(`/restaurant/${r.id}`)} />
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

function FeaturedCard({ restaurant, onPress }: { restaurant: Restaurant; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: restaurant.coverImage }} style={styles.featuredImg} contentFit="cover" />
      <View style={styles.featuredOverlay} />
      {restaurant.promo ? (
        <View style={styles.promoBadge}><Text style={styles.promoBadgeText}>{restaurant.promo}</Text></View>
      ) : null}
      {!restaurant.isOpen ? (
        <View style={styles.closedBadge}><Text style={styles.closedText}>CLOSED</Text></View>
      ) : null}
      <View style={styles.featuredInfo}>
        <Text style={styles.featuredName}>{restaurant.name}</Text>
        <View style={styles.featuredMeta}>
          <MaterialIcons name="star" size={12} color={Colors.gold} />
          <Text style={styles.featuredRating}> {restaurant.rating}  •  {restaurant.deliveryTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function RestaurantCard({ restaurant, formatMoney, onPress }: { restaurant: Restaurant; formatMoney: (amount: number) => string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.restaurantCard} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: restaurant.image }} style={styles.restaurantImg} contentFit="cover" />
      <View style={styles.restaurantInfo}>
        <View style={styles.restaurantNameRow}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          {!restaurant.isOpen ? <View style={styles.closedPill}><Text style={styles.closedPillText}>Closed</Text></View> : null}
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
          <Text style={styles.deliveryFee}>Delivery: {formatMoney(restaurant.deliveryFee)}</Text>
          {restaurant.promo ? <View style={styles.promoTag}><Text style={styles.promoTagText}>{restaurant.promo}</Text></View> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  greeting: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  notifBtn: { position: 'relative', padding: 4 },
  notifDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  scroll: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, marginHorizontal: Spacing.md, paddingHorizontal: Spacing.md, height: 48, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.body, marginLeft: Spacing.sm },
  filterBtn: { backgroundColor: 'rgba(204,0,0,0.15)', borderRadius: BorderRadius.sm, padding: 6 },
  promoScroll: { marginBottom: Spacing.md },
  promoContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  promoBanner: { width: 220, height: 90, borderRadius: BorderRadius.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  promoSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  sectionCount: { color: Colors.textMuted, fontSize: FontSize.sm },
  cuisineContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  cuisineChip: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cuisineChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cuisineChipText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  cuisineChipTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  featuredContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.md },
  featuredCard: { width: 220, height: 150, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative', ...Shadow.md },
  featuredImg: { width: '100%', height: '100%' },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  promoBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  promoBadgeText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  closedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  closedText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  featuredInfo: { position: 'absolute', bottom: Spacing.sm, left: Spacing.sm },
  featuredName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  featuredRating: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs },
  sectionTitle2: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  restaurantCard: { flexDirection: 'row', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, overflow: 'hidden', ...Shadow.md },
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
});
