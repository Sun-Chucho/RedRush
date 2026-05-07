import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Switch, TextInput, Modal, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { MOCK_RESTAURANTS, MenuItem } from '@/constants/mockData';
import { useCurrency } from '@/hooks/useCurrency';
import { useAlert } from '@/template';

export default function VendorMenu() {
  const [items, setItems] = useState<MenuItem[]>(MOCK_RESTAURANTS[0].menu);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { formatMoney, currency } = useCurrency();

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const toggleAvailability = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, available: !i.available } : i));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Menu Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
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
                onValueChange={() => toggleAvailability(item.id)}
                trackColor={{ false: Colors.border, true: Colors.primary + '44' }}
                thumbColor={item.available ? Colors.primary : Colors.textMuted}
              />
              <TouchableOpacity style={styles.editBtn} onPress={() => showAlert('Edit Item', `${item.name} is ready to edit from this menu. Toggle availability now or delete and re-add with updated details.`)}>
                <MaterialIcons name="edit" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => showAlert('Delete Item', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => setItems(prev => prev.filter(i => i.id !== item.id)) },
              ])}>
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
              <Text style={styles.modalTitle}>Add Menu Item</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {['Item Name', 'Description', `Price (${currency})`, 'Category', 'Preparation Time (min)'].map(field => (
                <View key={field} style={styles.formField}>
                  <Text style={styles.fieldLabel}>{field}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={`Enter ${field.toLowerCase()}`}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.imgPicker} onPress={() => showAlert('Upload Image', 'Photo upload requires Firebase Storage rules and a production media picker. This draft item can still be saved with the default image.')}>
                <MaterialIcons name="add-photo-alternate" size={32} color={Colors.primary} />
                <Text style={styles.imgPickerText}>Add Item Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  setShowModal(false);
                  showAlert('Item Added', 'New menu item has been added! (mocked)');
                }}
              >
                <Text style={styles.saveBtnText}>Add to Menu</Text>
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
  imgPicker: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: BorderRadius.lg, height: 100, marginBottom: Spacing.md, gap: Spacing.sm },
  imgPickerText: { color: Colors.textMuted, fontSize: FontSize.sm },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 14, alignItems: 'center', marginBottom: Spacing.xl },
  saveBtnText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
