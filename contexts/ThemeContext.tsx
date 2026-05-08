import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
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
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        const nextMode = stored === 'light' || stored === 'dark' ? stored : getInitialMode();
        applyThemeColors(nextMode);
        setMode(nextMode);
      })
      .finally(() => setReady(true));
  }, []);

  const toggleTheme = async () => {
    const nextMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    applyThemeColors(nextMode);
    setMode(nextMode);
    await AsyncStorage.setItem(STORAGE_KEY, nextMode);
  };

  const value = useMemo(() => ({ mode, toggleTheme }), [mode]);

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeMode must be used inside ThemeProvider');
  return context;
}
