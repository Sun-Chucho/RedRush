import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeMode } from '@/contexts/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, toggleTheme } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Personalize your RedRush experience</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.iconWrap}>
              <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={21} color={Colors.primary} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Dark mode</Text>
              <Text style={styles.settingDescription}>
                {isDark ? 'A darker palette is currently active.' : 'A brighter palette is currently active.'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => toggleTheme()}
              trackColor={{ false: Colors.borderLight, true: Colors.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Dark mode"
            />
          </View>
        </View>

        <View style={styles.note}>
          <MaterialIcons name="info-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.noteText}>Your appearance choice is saved on this device.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backButton: { width: 42, height: 42, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border },
  headerCopy: { marginLeft: 12, flex: 1 },
  title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  sectionLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.8, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  card: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  iconWrap: { width: 42, height: 42, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(204,0,0,0.10)' },
  settingCopy: { flex: 1, marginHorizontal: 12 },
  settingTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  settingDescription: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 3, lineHeight: 17 },
  note: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, paddingHorizontal: Spacing.xs },
  noteText: { flex: 1, color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 17 },
});
