import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import {
  DEFAULT_CURRENCY,
  SupportedCurrency,
  currencyForCoordinates,
  currencyForCountry,
  formatCurrency,
} from '@/constants/currency';

interface CurrencyContextType {
  currency: SupportedCurrency;
  country: string;
  locationLabel: string;
  formatMoney: (amount: number) => string;
  refreshLocationCurrency: () => Promise<void>;
}

export const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<SupportedCurrency>(DEFAULT_CURRENCY);
  const [country, setCountry] = useState('Kenya');
  const [locationLabel, setLocationLabel] = useState('Kenya');

  const refreshLocationCurrency = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      setCurrency(DEFAULT_CURRENCY);
      setCountry('Kenya');
      setLocationLabel('Kenya');
      return;
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const [place] = await Location.reverseGeocodeAsync(current.coords);
    const nextCountry = place?.country || undefined;
    const nextCurrency = nextCountry
      ? currencyForCountry(nextCountry)
      : currencyForCoordinates(current.coords.latitude, current.coords.longitude);

    setCurrency(nextCurrency);
    setCountry(nextCountry || (nextCurrency === 'TZS' ? 'Tanzania' : 'Kenya'));
    setLocationLabel(
      [place?.city, place?.region, nextCountry].filter(Boolean).join(', ') ||
        (nextCurrency === 'TZS' ? 'Tanzania' : 'Kenya')
    );
  };

  useEffect(() => {
    refreshLocationCurrency().catch(() => {
      setCurrency(DEFAULT_CURRENCY);
      setCountry('Kenya');
      setLocationLabel('Kenya');
    });
  }, []);

  const value = useMemo(
    () => ({
      currency,
      country,
      locationLabel,
      formatMoney: (amount: number) => formatCurrency(amount, currency),
      refreshLocationCurrency,
    }),
    [currency, country, locationLabel]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
