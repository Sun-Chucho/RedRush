import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, createThemedStyles } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';

export function LanguageToggle({ style }: { style?: ViewStyle }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={toggleLanguage}>
      <MaterialIcons name="language" size={16} color={Colors.text} />
      <Text style={styles.text}>{language === 'en' ? 'EN' : 'SW'}</Text>
    </TouchableOpacity>
  );
}

export default LanguageToggle;

const styles = createThemedStyles(() => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  text: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
}));
