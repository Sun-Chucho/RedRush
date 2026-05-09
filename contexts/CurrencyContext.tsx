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
  coords: { latitude: number; longitude: number } | null;
  formatMoney: (amount: number) => string;
  refreshLocationCurrency: () => Promise<string>;
}

export const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<SupportedCurrency>(DEFAULT_CURRENCY);
  const [country, setCountry] = useState('Kenya');
  const [locationLabel, setLocationLabel] = useState('Kenya');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const refreshLocationCurrency = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      setCurrency(DEFAULT_CURRENCY);
      setCountry('Kenya');
      setLocationLabel('Kenya');
      setCoords(null);
      return 'Kenya';
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setCoords({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });
    const [place] = await Location.reverseGeocodeAsync(current.coords);
    const nextCountry = place?.country || undefined;
    const nextCurrency = nextCountry
      ? currencyForCountry(nextCountry)
      : currencyForCoordinates(current.coords.latitude, current.coords.longitude);

    setCurrency(nextCurrency);
    setCountry(nextCountry || (nextCurrency === 'TZS' ? 'Tanzania' : 'Kenya'));
    const nextLocationLabel =
      [place?.city, place?.region, nextCountry].filter(Boolean).join(', ') ||
      (nextCurrency === 'TZS' ? 'Tanzania' : 'Kenya');

    setLocationLabel(nextLocationLabel);
    return nextLocationLabel;
  };

  useEffect(() => {
    refreshLocationCurrency().catch(() => {
      setCurrency(DEFAULT_CURRENCY);
      setCountry('Kenya');
      setLocationLabel('Kenya');
      setCoords(null);
    });
  }, []);

  const value = useMemo(
    () => ({
      currency,
      country,
      locationLabel,
      coords,
      formatMoney: (amount: number) => formatCurrency(amount, currency),
      refreshLocationCurrency,
    }),
    [currency, country, locationLabel, coords]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
