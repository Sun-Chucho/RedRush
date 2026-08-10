import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Switch, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { MenuItem } from '@/constants/mockData';
import { useCurrency } from '@/hooks/useCurrency';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useAlert } from '@/template';
import { pickCompressAndUploadImage } from '@/services/cloudinary';

const DEFAULT_ITEM_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';

const emptyDraft = {
  name: '',
  description: '',
  price: '',
  category: 'Meals',
  preparationTime: '15',
  image: DEFAULT_ITEM_IMAGE,
};

export default function VendorMenu() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { formatMoney, currency } = useCurrency();
  const {
    getVendorRestaurant,
    ensureVendorRestaurant,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    isLoading,
  } = useRestaurants();

  const vendorRestaurant = getVendorRestaurant();
  const items = useMemo(() => vendorRestaurant?.menu || [], [vendorRestaurant?.menu]);

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const categories = useMemo(
    () => Array.from(new Set(['Meals', 'Drinks', ...(vendorRestaurant?.categories || []), ...items.map(item => item.category)])),
    [items, vendorRestaurant?.categories]
  );

  useEffect(() => {
    ensureVendorRestaurant().catch(() => undefined);
  }, [ensureVendorRestaurant]);

  const openAddModal = () => {
    setEditingItem(null);
    setDraft(emptyDraft);
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setDraft({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      preparationTime: String(item.preparationTime),
      image: item.image,
    });
    setShowModal(true);
  };

  const uploadItemImage = async () => {
    try {
      const url = await pickCompressAndUploadImage('dish');
      if (url) setDraft(prev => ({ ...prev, image: url }));
    } catch (error) {
      showAlert('Image upload', error instanceof Error ? error.message : 'Unable to upload this image.');
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const restaurantId = await ensureVendorRestaurant();
      await updateMenuItem(restaurantId, item.id, { available: !item.available });
    } catch (error) {
      showAlert('Menu update failed', error instanceof Error ? error.message : 'Unable to update this item.');
    }
  };

  const handleDelete = (item: MenuItem) => {
    showAlert('Delete Item', `Delete ${item.name} from your menu?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const restaurantId = await ensureVendorRestaurant();
            await deleteMenuItem(restaurantId, item.id);
          } catch (error) {
            showAlert('Delete failed', error instanceof Error ? error.message : 'Unable to delete this item.');
          }
        },
      },
    ]);
  };

  const saveItem = async () => {
    const price = Number(draft.price);
    const preparationTime = Number(draft.preparationTime);

    if (!draft.name.trim() || !Number.isFinite(price) || price <= 0) {
      showAlert('Menu item', 'Enter an item name and a valid price.');
      return;
    }

    setIsSaving(true);

    try {
      const restaurantId = await ensureVendorRestaurant();
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        price,
        category: draft.category.trim() || 'Meals',
        preparationTime: Number.isFinite(preparationTime) && preparationTime > 0 ? preparationTime : 15,
        image: draft.image || editingItem?.image || DEFAULT_ITEM_IMAGE,
        available: editingItem?.available ?? true,
      };

      if (editingItem) {
        await updateMenuItem(restaurantId, editingItem.id, payload);
      } else {
        await createMenuItem(restaurantId, payload);
      }

      setShowModal(false);
      setEditingItem(null);
      setDraft(emptyDraft);
      showAlert('Menu saved', editingItem ? 'Menu item updated.' : 'Menu item added.');
    } catch (error) {
      showAlert('Save failed', error instanceof Error ? error.message : 'Unable to save this menu item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Menu Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <MaterialIcons name="add" size={20} color={Colors.text} />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu items..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statNum}>{items.length}</Text>
          <Text style={styles.statLbl}> total items</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={[styles.statNum, { color: Colors.success }]}>{items.filter(i => i.available).length}</Text>
          <Text style={styles.statLbl}> available</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={[styles.statNum, { color: Colors.error }]}>{items.filter(i => !i.available).length}</Text>
          <Text style={styles.statLbl}> unavailable</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? <ActivityIndicator color={Colors.primary} /> : <MaterialIcons name="restaurant-menu" size={48} color={Colors.textMuted} />}
            <Text style={styles.emptyTitle}>{isLoading ? 'Loading menu...' : 'No menu items yet'}</Text>
            {!isLoading ? <Text style={styles.emptySubtitle}>Add the first item to publish your vendor menu.</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.menuCard, !item.available && styles.menuCardDisabled]}>
            <Image source={{ uri: item.image }} style={styles.menuImg} contentFit="cover" />
            <View style={styles.menuInfo}>
              <Text style={styles.menuName}>{item.name}</Text>
              <Text style={styles.menuCategory}>{item.category}</Text>
              <Text style={styles.menuPrice}>{formatMoney(item.price)}</Text>
              <Text style={styles.menuPrepTime}>{item.preparationTime} min prep</Text>
            </View>
            <View style={styles.menuActions}>
              <Switch
                value={item.available}
                onValueChange={() => toggleAvailability(item)}
                trackColor={{ false: Colors.border, true: Colors.primary + '44' }}
                thumbColor={item.available ? Colors.primary : Colors.textMuted}
              />
              <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                <MaterialIcons name="edit" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <MaterialIcons name="delete" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add Item Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Item Name</Text>
                <TextInput style={styles.fieldInput} placeholder="Enter item name" placeholderTextColor={Colors.textMuted} value={draft.name} onChangeText={name => setDraft(prev => ({ ...prev, name }))} />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput style={[styles.fieldInput, styles.multilineInput]} placeholder="Enter description" placeholderTextColor={Colors.textMuted} value={draft.description} onChangeText={description => setDraft(prev => ({ ...prev, description }))} multiline />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Price ({currency})</Text>
                <TextInput style={styles.fieldInput} placeholder="Enter price" placeholderTextColor={Colors.textMuted} value={draft.price} onChangeText={price => setDraft(prev => ({ ...prev, price }))} keyboardType="numeric" />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPicker}>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[styles.categoryChip, draft.category === category && styles.categoryChipActive]}
                      onPress={() => setDraft(prev => ({ ...prev, category }))}
                    >
                      <Text style={[styles.categoryChipText, draft.category === category && styles.categoryChipTextActive]}>{category}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput style={styles.fieldInput} placeholder="Or type a new category" placeholderTextColor={Colors.textMuted} value={draft.category} onChangeText={category => setDraft(prev => ({ ...prev, category }))} />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Preparation Time (min)</Text>
                <TextInput style={styles.fieldInput} placeholder="Enter preparation time" placeholderTextColor={Colors.textMuted} value={draft.preparationTime} onChangeText={preparationTime => setDraft(prev => ({ ...prev, preparationTime }))} keyboardType="numeric" />
              </View>
              <TouchableOpacity style={styles.imgPicker} onPress={uploadItemImage}>
                <Image source={{ uri: draft.image || DEFAULT_ITEM_IMAGE }} style={styles.imgPickerPreview} contentFit="cover" />
                <View style={styles.imgPickerOverlay}>
                  <MaterialIcons name="add-photo-alternate" size={28} color={Colors.text} />
                  <Text style={styles.imgPickerText}>{draft.image === DEFAULT_ITEM_IMAGE ? 'Add Item Photo' : 'Change Item Photo'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={saveItem}
                disabled={isSaving}
              >
                <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to Menu'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  addBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, marginHorizontal: Spacing.md, paddingHorizontal: Spacing.md, height: 44, marginBottom: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.body },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  statPill: { flexDirection: 'row', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.sm, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  statNum: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  statLbl: { color: Colors.textMuted, fontSize: FontSize.xs },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 80 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  menuCard: { flexDirection: 'row', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, overflow: 'hidden', ...Shadow.md },
  menuCardDisabled: { opacity: 0.5 },
  menuImg: { width: 90, height: 90 },
  menuInfo: { flex: 1, padding: Spacing.sm },
  menuName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  menuCategory: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  menuPrice: { color: Colors.primary, fontSize: FontSize.body, fontWeight: FontWeight.bold, marginTop: 4 },
  menuPrepTime: { color: Colors.textMuted, fontSize: FontSize.xs },
  menuActions: { alignItems: 'center', paddingHorizontal: Spacing.sm, justifyContent: 'center', gap: Spacing.sm },
  editBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.md, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  formField: { marginBottom: Spacing.md },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: 6 },
  fieldInput: { color: Colors.text, fontSize: FontSize.body, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 48, borderWidth: 1, borderColor: Colors.border },
  multilineInput: { height: 88, paddingTop: Spacing.sm, textAlignVertical: 'top' },
  categoryPicker: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  categoryChip: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', backgroundColor: Colors.surfaceCard },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryChipText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  categoryChipTextActive: { color: Colors.text, fontWeight: FontWeight.semibold },
  imgPicker: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: BorderRadius.lg, height: 128, marginBottom: Spacing.md, overflow: 'hidden', backgroundColor: Colors.surfaceCard },
  imgPickerPreview: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  imgPickerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: 'rgba(0,0,0,0.42)' },
  imgPickerText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 14, alignItems: 'center', marginBottom: Spacing.xl },
  saveBtnText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
