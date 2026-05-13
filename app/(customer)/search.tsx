import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';

import { useCurrency } from '@/hooks/useCurrency';
import { useLanguage } from '@/hooks/useLanguage';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useCustomerData } from '@/hooks/useCustomerData';
import { TranslationKey } from '@/contexts/LanguageContext';

const SORT_OPTIONS: { value: 'Relevance' | 'Rating' | 'Delivery Time' | 'Price'; labelKey: TranslationKey }[] = [
  { value: 'Relevance', labelKey: 'relevance' },
  { value: 'Rating', labelKey: 'rating' },
  { value: 'Delivery Time', labelKey: 'deliveryTime' },
  { value: 'Price', labelKey: 'price' },
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [sortBy, setSortBy] = useState('Relevance');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { formatMoney } = useCurrency();
  const { t } = useLanguage();
  const { restaurants, categories } = useRestaurants();
  const { searchHistory, addSearchHistory, clearSearchHistory } = useCustomerData();

  const cuisines = useMemo(() => {
    if (categories.length > 0) {
      return ['All', ...categories.map(c => c.name)];
    }
    return Array.from(new Set(['All', ...restaurants.map(r => r.cuisine)]));
  }, [categories, restaurants]);

  const results = restaurants.filter(r => {
    const matchQ = !query || r.name.toLowerCase().includes(query.toLowerCase()) || r.cuisine.toLowerCase().includes(query.toLowerCase());
    const matchC = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
    return matchQ && matchC;
  }).sort((a, b) => {
    if (sortBy === 'Rating') return b.rating - a.rating;
    if (sortBy === 'Delivery Time') return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
    if (sortBy === 'Price') return a.deliveryFee - b.deliveryFee;
    return 0;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchRestaurantsCuisines')}
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => addSearchHistory(query)}
            onBlur={() => addSearchHistory(query)}
            autoFocus
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Cuisine Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cuisineRow}>
        {cuisines.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.cuisineChip, selectedCuisine === c && styles.cuisineChipActive]}
            onPress={() => setSelectedCuisine(c)}
          >
            <Text style={[styles.cuisineText, selectedCuisine === c && styles.cuisineTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
        {SORT_OPTIONS.map(s => (
          <TouchableOpacity
            key={s.value}
            style={[styles.sortBtn, sortBy === s.value && styles.sortBtnActive]}
            onPress={() => setSortBy(s.value)}
          >
            <Text style={[styles.sortText, sortBy === s.value && styles.sortTextActive]}>{t(s.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!query && searchHistory.length > 0 ? (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Recent searches</Text>
            <TouchableOpacity onPress={clearSearchHistory}>
              <Text style={styles.clearHistory}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.historyChips}>
            {searchHistory.map(item => (
              <TouchableOpacity
                key={`${item.query}-${item.createdAt}`}
                style={styles.historyChip}
                onPress={() => {
                  setQuery(item.query);
                  addSearchHistory(item.query);
                }}
              >
                <MaterialIcons name="history" size={14} color={Colors.textMuted} />
                <Text style={styles.historyChipText}>{item.query}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultCard}
            onPress={() => {
              addSearchHistory(query || item.name);
              router.push(`/restaurant/${item.id}`);
            }}
            activeOpacity={0.85}
          >
            <Image source={{ uri: item.image }} style={styles.resultImg} contentFit="cover" />
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultCuisine}>{item.cuisine}  •  {item.distance}</Text>
              <View style={styles.resultMeta}>
                <MaterialIcons name="star" size={12} color={Colors.gold} />
                <Text style={styles.metaText}> {item.rating}  •  {item.deliveryTime}</Text>
              </View>
              <Text style={styles.deliveryFee}>{t('delivery')}: {formatMoney(item.deliveryFee)}</Text>
            </View>
            {!item.isOpen ? (
              <View style={styles.closedOverlay}>
                <Text style={styles.closedText}>{t('closed')}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('noResultsFound')}</Text>
            <Text style={styles.emptySubtitle}>{t('tryDifferentKeywords')}</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  backBtn: { padding: 4 },
  searchRow: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 44, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.body },
  cuisineRow: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.sm },
  cuisineChip: { paddingHorizontal: 14, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceCard, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  cuisineChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cuisineText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  cuisineTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  sortRow: { paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  sortBtn: { paddingHorizontal: 14, height: 32, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center' },
  sortBtnActive: { borderColor: Colors.primary },
  sortText: { color: Colors.textMuted, fontSize: FontSize.xs },
  sortTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  historySection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  historyTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  clearHistory: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  historyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  historyChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: Colors.surfaceCard },
  historyChipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  resultCard: { flexDirection: 'row', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, overflow: 'hidden', position: 'relative', ...Shadow.md },
  resultImg: { width: 90, height: 90 },
  resultInfo: { flex: 1, padding: Spacing.sm },
  resultName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  resultCuisine: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  deliveryFee: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  closedOverlay: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  closedText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.md },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.xs },
});
