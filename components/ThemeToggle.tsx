import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useThemeMode } from '@/contexts/ThemeContext';

export function ThemeToggle({ style, showLabel = false }: { style?: ViewStyle; showLabel?: boolean }) {
  const { mode, toggleTheme } = useThemeMode();

  return (
    <TouchableOpacity style={[styles.button, showLabel && styles.labelButton, style]} onPress={toggleTheme} accessibilityRole="button">
      <MaterialIcons name={mode === 'dark' ? 'light-mode' : 'dark-mode'} size={18} color={Colors.text} />
      {showLabel ? <Text style={styles.label}>{mode === 'dark' ? 'Light mode' : 'Dark mode'}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: Colors.border,
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
