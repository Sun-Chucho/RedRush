import React, { createContext, ReactNode, useCallback, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';
import {
  DEFAULT_CURRENCY,
  SupportedCurrency,
  currencyForCoordinates,
  currencyForCountry,
  formatCurrency,
} from '@/constants/currency';
import { marketForCoordinates, marketForCountry, nearestServiceTier, SUPPORTED_MARKETS } from '@/constants/locationTiers';
import { withTimeout } from '@/services/asyncUtils';

interface CurrencyContextType {
  currency: SupportedCurrency;
  country: string;
  locationLabel: string;
  coords: { latitude: number; longitude: number } | null;
  formatMoney: (amount: number) => string;
  refreshLocationCurrency: () => Promise<{
    label: string;
    coords: { latitude: number; longitude: number };
  }>;
}

export const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

type ReadableLocation = {
  coords: { latitude: number; longitude: number };
};

function browserLocation(): Promise<ReadableLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not supported by this browser.'));
      return;
    }

    // Calling getCurrentPosition directly is intentional: it lets the browser
    // own the permission UX and show its native site-permission prompt.
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      }),
      error => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Location access was denied. Allow it in your browser site settings to see nearby restaurants.'));
          return;
        }
        if (error.code === error.TIMEOUT) {
          reject(new Error('Location took too long to respond. Check that location services are enabled and try again.'));
          return;
        }
        reject(new Error('Your current location could not be determined.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  });
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const localeRegion = getLocales()[0]?.regionCode;
  const localeMarket = marketForCountry(localeRegion === 'TZ' ? 'Tanzania' : 'Kenya');
  const localeCountry = SUPPORTED_MARKETS[localeMarket].country;
  const [currency, setCurrency] = useState<SupportedCurrency>(SUPPORTED_MARKETS[localeMarket].currency || DEFAULT_CURRENCY);
  const [country, setCountry] = useState(localeCountry);
  const [locationLabel, setLocationLabel] = useState(localeCountry);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const applyLocation = useCallback(async (current: ReadableLocation) => {
    setCoords({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });
    const nextMarket = marketForCoordinates(current.coords.latitude, current.coords.longitude);
    const marketCountry = SUPPORTED_MARKETS[nextMarket].country;

    // Coordinates are enough to select a market and currency. Address lookup is
    // best-effort because reverse geocoding can be unavailable on some devices.
    setCurrency(currencyForCoordinates(current.coords.latitude, current.coords.longitude));
    setCountry(marketCountry);
    setLocationLabel(marketCountry);

    const [place] = await withTimeout(
      Location.reverseGeocodeAsync(current.coords),
      6000,
      'Address lookup took too long.'
    ).catch(() => []);
    const nextCountry = place?.country || marketCountry;
    const nextTier = nearestServiceTier(
      { latitude: current.coords.latitude, longitude: current.coords.longitude },
      nextMarket
    );
    const nextCurrency = nextCountry
      ? currencyForCountry(nextCountry)
      : SUPPORTED_MARKETS[nextMarket].currency;

    setCurrency(nextCurrency);
    setCountry(nextCountry);
    const nextLocationLabel =
      [place?.city || nextTier?.label, place?.region, nextCountry]
        .filter(Boolean)
        .join(', ') ||
      SUPPORTED_MARKETS[nextMarket].country;

    setLocationLabel(nextLocationLabel);
    return {
      label: nextLocationLabel,
      coords: { latitude: current.coords.latitude, longitude: current.coords.longitude },
    };
  }, []);

  const refreshLocationCurrency = useCallback(async () => {
    if (Platform.OS === 'web') {
      return applyLocation(await browserLocation());
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) throw new Error('Turn on device location services and try again.');

    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted' && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== 'granted') {
      setCoords(null);
      throw new Error('Allow location access in your phone settings to show nearby restaurants and local prices.');
    }

    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000, requiredAccuracy: 5000 });
    if (lastKnown) await applyLocation(lastKnown);

    try {
      const current = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        15000,
        'GPS took too long to respond.'
      );
      return applyLocation(current);
    } catch (error) {
      if (lastKnown) return applyLocation(lastKnown);
      throw error;
    }
  }, [applyLocation]);

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
