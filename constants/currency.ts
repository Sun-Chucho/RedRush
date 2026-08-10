import {
  marketForCoordinates,
  marketForCountry,
  SUPPORTED_MARKETS,
} from './locationTiers.ts';

export type SupportedCurrency = 'KES' | 'TZS';

export const DEFAULT_CURRENCY: SupportedCurrency = 'KES';

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  KES: 'KSh',
  TZS: 'TSh',
};

export function currencyForCountry(country?: string | null): SupportedCurrency {
  return SUPPORTED_MARKETS[marketForCountry(country)].currency;
}

export function currencyForCoordinates(latitude?: number, longitude?: number): SupportedCurrency {
  if (latitude == null || longitude == null) {
    return DEFAULT_CURRENCY;
  }

  return SUPPORTED_MARKETS[marketForCoordinates(latitude, longitude)].currency;
}

export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const label = CURRENCY_LABELS[currency];

  return `${label} ${Math.round(amount).toLocaleString()}`;
}
