import { StyleSheet } from 'react-native';

// RedRush Design System Tokens
export const DarkColors = {
  primary: '#CC0000',
  primaryDark: '#990000',
  primaryLight: '#FF2222',
  background: '#0A0A0A',
  surface: '#141414',
  surfaceElevated: '#1E1E1E',
  surfaceCard: '#1A1A1A',
  border: '#2A2A2A',
  borderLight: '#333333',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  textInverse: '#FFFFFF',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gold: '#FFD700',
  overlay: 'rgba(0,0,0,0.6)',
};

export const LightColors = {
  primary: '#CC0000',
  primaryDark: '#990000',
  primaryLight: '#E62020',
  background: '#FFF8F8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFF1F1',
  surfaceCard: '#FFFFFF',
  border: '#F2CACA',
  borderLight: '#F7DCDC',
  text: '#1E1515',
  textSecondary: '#5E4B4B',
  textMuted: '#8E7474',
  textInverse: '#FFFFFF',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  gold: '#B88700',
  overlay: 'rgba(255,255,255,0.68)',
};

export type ThemeMode = 'dark' | 'light';

export const Colors = { ...DarkColors };

let themeRevision = 0;

export function applyThemeColors(mode: ThemeMode) {
  Object.assign(Colors, mode === 'light' ? LightColors : DarkColors);
  themeRevision += 1;
}

/**
 * Defers StyleSheet creation until a style is used and rebuilds it whenever
 * the active palette changes. Regular StyleSheet.create calls capture color
 * strings once at module load, which previously made a restart necessary for
 * light mode to appear across already-open screens.
 */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(factory: () => T): T {
  let cachedRevision = -1;
  let cachedStyles: T;

  const getStyles = () => {
    if (cachedRevision !== themeRevision) {
      cachedStyles = StyleSheet.create(factory()) as T;
      cachedRevision = themeRevision;
    }
    return cachedStyles;
  };

  return new Proxy({} as T, {
    get: (_target, property) => getStyles()[property as keyof T],
    has: (_target, property) => property in getStyles(),
    ownKeys: () => Reflect.ownKeys(getStyles()),
    getOwnPropertyDescriptor: (_target, property) => ({
      configurable: true,
      enumerable: true,
      value: getStyles()[property as keyof T],
    }),
  });
}

/** Defers non-StyleSheet color maps, such as status colors, in the same way. */
export function createThemedValues<T extends object>(factory: () => T): T {
  let cachedRevision = -1;
  let cachedValues: T;

  const getValues = () => {
    if (cachedRevision !== themeRevision) {
      cachedValues = factory();
      cachedRevision = themeRevision;
    }
    return cachedValues;
  };

  return new Proxy({} as T, {
    get: (_target, property) => getValues()[property as keyof T],
    has: (_target, property) => property in getValues(),
    ownKeys: () => Reflect.ownKeys(getValues()),
    getOwnPropertyDescriptor: (_target, property) => ({
      configurable: true,
      enumerable: true,
      value: getValues()[property as keyof T],
    }),
  });
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  body: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,
  hero: 34,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
};
