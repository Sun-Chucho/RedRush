import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useThemeMode } from '@/contexts/ThemeContext';

export function ThemeToggle({ style }: { style?: ViewStyle }) {
  const { mode, toggleTheme } = useThemeMode();

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={toggleTheme} accessibilityRole="button">
      <MaterialIcons name={mode === 'dark' ? 'light-mode' : 'dark-mode'} size={18} color={Colors.text} />
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
});
