export type SupportedCurrency = 'KES' | 'TZS';

export const DEFAULT_CURRENCY: SupportedCurrency = 'KES';

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  KES: 'KSh',
  TZS: 'TSh',
};

export function currencyForCountry(country?: string | null): SupportedCurrency {
  const normalized = country?.trim().toLowerCase();

  if (normalized?.includes('tanzania')) {
    return 'TZS';
  }

  return 'KES';
}

export function currencyForCoordinates(latitude?: number, longitude?: number): SupportedCurrency {
  if (latitude == null || longitude == null) {
    return DEFAULT_CURRENCY;
  }

  const isTanzania =
    latitude >= -11.9 &&
    latitude <= -0.7 &&
    longitude >= 29.0 &&
    longitude <= 40.8;

  return isTanzania ? 'TZS' : 'KES';
}

export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const label = CURRENCY_LABELS[currency];

  return `${label} ${Math.round(amount).toLocaleString()}`;
}
