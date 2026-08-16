import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform, View } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { applyThemeColors, ThemeMode } from '@/constants/theme';

type ThemeContextValue = {
  mode: ThemeMode;
  toggleTheme: () => Promise<void>;
};

const STORAGE_KEY = 'redrush-theme-mode';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialMode(): ThemeMode {
  return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const initialMode = getInitialMode();
    applyThemeColors(initialMode);
    return initialMode;
  });

  const syncSystemChrome = async (nextMode: ThemeMode) => {
    await SystemUI.setBackgroundColorAsync(nextMode === 'dark' ? '#0A0A0A' : '#FFF8F8').catch(() => undefined);
    if (Platform.OS === 'android') {
      await NavigationBar.setBackgroundColorAsync(nextMode === 'dark' ? '#0A0A0A' : '#FFF8F8').catch(() => undefined);
      await NavigationBar.setButtonStyleAsync(nextMode === 'dark' ? 'light' : 'dark').catch(() => undefined);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async stored => {
        const nextMode = stored === 'light' || stored === 'dark' ? stored : getInitialMode();
        applyThemeColors(nextMode);
        Appearance.setColorScheme?.(nextMode);
        setMode(nextMode);
        await syncSystemChrome(nextMode);
      })
      .catch(() => {
        // Theme persistence is cosmetic and must never block the application.
        applyThemeColors(getInitialMode());
      });
  }, []);

  const toggleTheme = async () => {
    const nextMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    applyThemeColors(nextMode);
    Appearance.setColorScheme?.(nextMode);
    setMode(nextMode);
    await Promise.all([
      syncSystemChrome(nextMode),
      AsyncStorage.setItem(STORAGE_KEY, nextMode),
    ]);
  };

  const value = useMemo(() => ({ mode, toggleTheme }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Re-renders the visual tree so every deferred StyleSheet reads the new palette. */
export function ThemeRefreshBoundary({ children }: { children: ReactNode }) {
  const { mode } = useThemeMode();

  return (
    <View key={mode} style={{ flex: 1 }}>
      {children}
    </View>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeMode must be used inside ThemeProvider');
  return context;
}
