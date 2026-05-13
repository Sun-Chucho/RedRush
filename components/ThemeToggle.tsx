import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeMode } from '@/contexts/ThemeContext';

export function ThemeToggle({ style, showLabel = false }: { style?: ViewStyle; showLabel?: boolean }) {
  const { mode, toggleTheme } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(204,0,0,0.08)',
          borderColor: Colors.border,
        },
        showLabel && styles.labelButton,
        style,
      ]}
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={18} color={Colors.text} />
      {showLabel ? <Text style={[styles.label, { color: Colors.text }]}>{isDark ? 'Light mode' : 'Dark mode'}</Text> : null}
    </TouchableOpacity>
  );
}

export default ThemeToggle;

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    width: 42,
  },
  labelButton: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: undefined,
  },
  label: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
