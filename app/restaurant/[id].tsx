import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { MenuItem } from '@/constants/mockData';
import { useCart } from '@/hooks/useCart';
import { useCurrency } from '@/hooks/useCurrency';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useAlert } from '@/template';
import { fetchRestaurantReviews, Review } from '@/services/supabaseRatings';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addItem, items, itemCount } = useCart();
  const { formatMoney } = useCurrency();
  const { favouriteRestaurantIds, toggleFavouriteRestaurant } = useCustomerData();
  const { getRestaurantById } = useRestaurants();
  const { showAlert } = useAlert();

  const restaurant = getRestaurantById(id || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoadingReviews(true);
    fetchRestaurantReviews(id, 10).then(r => {
      setReviews(r);
      setLoadingReviews(false);
    });
  }, [id]);

  if (!restaurant) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Restaurant not found</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backLink}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const filteredMenu = selectedCategory === 'All'
    ? restaurant.menu
    : restaurant.menu.filter(m => m.category === selectedCategory);

  const getItemQty = (itemId: string) => items.find(i => i.menuItem.id === itemId)?.quantity || 0;
  const isFavourite = favouriteRestaurantIds.includes(restaurant.id);

  const handleAdd = (item: MenuItem) => {
    if (!restaurant.isOpen) {
      showAlert('Restaurant Closed', 'This restaurant is currently closed.');
      return;
    }
    addItem(item, restaurant.id, restaurant.name);
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : restaurant.rating;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: restaurant.coverImage }} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          {!restaurant.isOpen ? (
            <View style={styles.closedBanner}>
              <Text style={styles.closedBannerText}>Currently Closed</Text>
            </View>
          ) : null}
          {restaurant.promo ? (
            <View style={[styles.heroBadge, { top: insets.top + 8, right: 68 }]}>
              <Text style={styles.heroBadgeText}>{restaurant.promo}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.favouriteBtn, { top: insets.top + 8 }]}
            onPress={() => toggleFavouriteRestaurant(restaurant.id)}
          >
            <MaterialIcons name={isFavourite ? 'favorite' : 'favorite-border'} size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Restaurant Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <Text style={styles.cuisineText}>{restaurant.cuisine}  •  {restaurant.address}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={16} color={Colors.gold} />
              <Text style={styles.statValue}>{avgRating}</Text>
              <Text style={styles.statLabel}>({reviews.length || restaurant.reviewCount})</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="access-time" size={16} color={Colors.primary} />
              <Text style={styles.statValue}>{restaurant.deliveryTime}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="delivery-dining" size={16} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{formatMoney(restaurant.deliveryFee)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="location-on" size={16} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{restaurant.distance}</Text>
            </View>
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {['All', ...restaurant.categories].map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Menu */}
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>
            {selectedCategory === 'All' ? 'Full Menu' : selectedCategory}
            <Text style={styles.menuCount}> ({filteredMenu.length})</Text>
          </Text>
          {filteredMenu.map(item => (
            <View key={item.id} style={[styles.menuItem, !item.available && styles.menuItemDisabled]}>
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemName}>{item.name}</Text>
                <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.menuItemFoot}>
                  <Text style={styles.menuItemPrice}>{formatMoney(item.price)}</Text>
                  <View style={styles.prepTime}>
                    <MaterialIcons name="access-time" size={12} color={Colors.textMuted} />
                    <Text style={styles.prepTimeText}> {item.preparationTime} min</Text>
                  </View>
                </View>
              </View>
              <View style={styles.menuItemRight}>
                <Image source={{ uri: item.image }} style={styles.menuItemImg} contentFit="cover" />
                {getItemQty(item.id) > 0 ? (
                  <View style={styles.qtyControl}>
                    <Text style={styles.qtyBadge}>{getItemQty(item.id)}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[styles.addBtn, !item.available && styles.addBtnDisabled]}
                  onPress={() => handleAdd(item)}
                  disabled={!item.available}
                >
                  <MaterialIcons name="add" size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* ── Reviews Section ── */}
        <View style={styles.reviewsSection}>
          <TouchableOpacity
            style={styles.reviewsHeader}
            onPress={() => setShowReviews(v => !v)}
          >
            <View style={styles.reviewsHeaderLeft}>
              <MaterialIcons name="star" size={18} color={Colors.gold} />
              <Text style={styles.reviewsTitle}>Customer Reviews</Text>
              {reviews.length > 0 ? (
                <View style={styles.reviewCountBadge}>
                  <Text style={styles.reviewCountText}>{reviews.length}</Text>
                </View>
              ) : null}
            </View>
            <MaterialIcons
              name={showReviews ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={22}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {showReviews ? (
            loadingReviews ? (
              <View style={styles.reviewsLoading}>
                <Text style={styles.reviewsLoadingText}>Loading reviews...</Text>
              </View>
            ) : reviews.length === 0 ? (
              <View style={styles.reviewsEmpty}>
                <MaterialIcons name="star-border" size={36} color={Colors.textMuted} />
                <Text style={styles.reviewsEmptyText}>No reviews yet.</Text>
                <Text style={styles.reviewsEmptySub}>Be the first to review after delivery!</Text>
              </View>
            ) : (
              <View style={styles.reviewsList}>
                {/* Aggregate row */}
                <View style={styles.ratingAggregate}>
                  <Text style={styles.ratingBig}>{avgRating}</Text>
                  <View style={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <MaterialIcons
                        key={n}
                        name={n <= Math.round(Number(avgRating)) ? 'star' : 'star-border'}
                        size={18}
                        color={Colors.gold}
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
                </View>

                {reviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </View>
            )
          ) : null}
        </View>

        <View style={{ height: itemCount > 0 ? 100 : 20 }} />
      </ScrollView>

      {/* Cart Bar */}
      {itemCount > 0 ? (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{itemCount}</Text>
            </View>
            <Text style={styles.cartBarText}>View Cart</Text>
          </View>
          <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/(customer)/cart')}>
            <Text style={styles.cartBtnText}>Go to Cart</Text>
            <MaterialIcons name="shopping-cart" size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const timeAgo = (iso: string) => {
    const d = new Date(iso);
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMo = Math.floor(diffDays / 30);
    return `${diffMo} month${diffMo !== 1 ? 's' : ''} ago`;
  };

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTop}>
        <View style={styles.reviewAvatar}>
          <MaterialIcons name="person" size={18} color={Colors.primary} />
        </View>
        <View style={styles.reviewMeta}>
          <View style={styles.reviewStars}>
            {[1, 2, 3, 4, 5].map(n => (
              <MaterialIcons
                key={n}
                name={n <= review.rating ? 'star' : 'star-border'}
                size={14}
                color={Colors.gold}
              />
            ))}
          </View>
          <Text style={styles.reviewTime}>{timeAgo(review.createdAt)}</Text>
        </View>
      </View>

      {review.comment ? (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      ) : null}

      <View style={styles.reviewSubRatings}>
        <View style={styles.subRating}>
          <MaterialIcons name="restaurant" size={12} color={Colors.textMuted} />
          <Text style={styles.subRatingText}>Food {review.foodRating}/5</Text>
        </View>
        <View style={styles.subRating}>
          <MaterialIcons name="delivery-dining" size={12} color={Colors.textMuted} />
          <Text style={styles.subRatingText}>Delivery {review.deliveryRating}/5</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  notFoundText: { color: Colors.text, fontSize: FontSize.lg },
  backLink: { color: Colors.primary, marginTop: Spacing.md },
  heroContainer: { height: 250, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  backBtn: { position: 'absolute', left: Spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  favouriteBtn: { position: 'absolute', right: Spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  closedBanner: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.8)', padding: 8, alignItems: 'center' },
  closedBannerText: { color: Colors.textMuted, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  heroBadge: { position: 'absolute', backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  infoCard: { backgroundColor: Colors.surfaceCard, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  infoLeft: {},
  restaurantName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  cuisineText: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  statValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  statDivider: { width: 1, height: 20, backgroundColor: Colors.border },
  categoryRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  categoryChip: { paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceCard, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  categoryTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  menuContainer: { padding: Spacing.md },
  menuTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  menuCount: { color: Colors.textMuted, fontWeight: FontWeight.regular, fontSize: FontSize.sm },
  menuItem: { flexDirection: 'row', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, padding: Spacing.md, gap: Spacing.md, ...Shadow.md },
  menuItemDisabled: { opacity: 0.5 },
  menuItemInfo: { flex: 1 },
  menuItemName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  menuItemDesc: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4, lineHeight: 20 },
  menuItemFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  menuItemPrice: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  prepTime: { flexDirection: 'row', alignItems: 'center' },
  prepTimeText: { color: Colors.textMuted, fontSize: FontSize.xs },
  menuItemRight: { alignItems: 'center', gap: Spacing.sm, position: 'relative' },
  menuItemImg: { width: 80, height: 80, borderRadius: BorderRadius.md },
  qtyControl: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  qtyBadge: { color: Colors.text, fontSize: 10, fontWeight: FontWeight.bold },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  addBtnDisabled: { backgroundColor: Colors.textMuted },
  cartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surfaceElevated, borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cartCount: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  cartCountText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  cartBarText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  cartBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 10, paddingHorizontal: 20, gap: Spacing.sm },
  cartBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // Reviews
  reviewsSection: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.md },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  reviewsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reviewsTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  reviewCountBadge: { backgroundColor: Colors.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  reviewCountText: { color: Colors.text, fontSize: 11, fontWeight: FontWeight.bold },
  reviewsLoading: { padding: Spacing.md, alignItems: 'center' },
  reviewsLoadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  reviewsEmpty: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  reviewsEmptyText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  reviewsEmptySub: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  reviewsList: { paddingBottom: Spacing.sm },
  ratingAggregate: { alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  ratingBig: { color: Colors.text, fontSize: 42, fontWeight: FontWeight.extrabold },
  ratingStars: { flexDirection: 'row', marginVertical: 4 },
  ratingCount: { color: Colors.textMuted, fontSize: FontSize.sm },
  reviewCard: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary + '18', justifyContent: 'center', alignItems: 'center' },
  reviewMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewStars: { flexDirection: 'row' },
  reviewTime: { color: Colors.textMuted, fontSize: FontSize.xs },
  reviewComment: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.xs },
  reviewSubRatings: { flexDirection: 'row', gap: Spacing.md },
  subRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subRatingText: { color: Colors.textMuted, fontSize: FontSize.xs },
});
