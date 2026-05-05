import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { MOCK_RESTAURANTS, MenuItem } from '@/constants/mockData';
import { useCart } from '@/hooks/useCart';
import { useAlert } from '@/template';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addItem, items, itemCount } = useCart();
  const { showAlert } = useAlert();

  const restaurant = MOCK_RESTAURANTS.find(r => r.id === id);
  const [selectedCategory, setSelectedCategory] = useState('All');

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

  const handleAdd = (item: MenuItem) => {
    if (!restaurant.isOpen) {
      showAlert('Restaurant Closed', 'This restaurant is currently closed.');
      return;
    }
    addItem(item, restaurant.id, restaurant.name);
  };

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
            <View style={[styles.heroBadge, { top: insets.top + 8, right: Spacing.md }]}>
              <Text style={styles.heroBadgeText}>{restaurant.promo}</Text>
            </View>
          ) : null}
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
              <Text style={styles.statValue}>{restaurant.rating}</Text>
              <Text style={styles.statLabel}>({restaurant.reviewCount})</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="access-time" size={16} color={Colors.primary} />
              <Text style={styles.statValue}>{restaurant.deliveryTime}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="delivery-dining" size={16} color={Colors.textSecondary} />
              <Text style={styles.statValue}>₦{restaurant.deliveryFee.toLocaleString()}</Text>
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
                  <Text style={styles.menuItemPrice}>₦{item.price.toLocaleString()}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  notFoundText: { color: Colors.text, fontSize: FontSize.lg },
  backLink: { color: Colors.primary, marginTop: Spacing.md },
  heroContainer: { height: 250, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  backBtn: { position: 'absolute', left: Spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
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
});
