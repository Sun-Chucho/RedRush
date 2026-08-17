import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from './supabase';

export type NotificationPrefs = {
  orderUpdates: boolean;
  payouts: boolean;
  account: boolean;
};

export type RiderProfileSettings = {
  vehicleType: string;
  vehiclePlate: string;
  idNumber: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  mobileMoneyProvider: string;
  mobileMoneyPhone: string;
  licenseDocumentUrl: string;
  insuranceDocumentUrl: string;
  idDocumentUrl: string;
  notificationSettings: NotificationPrefs;
  approvalStatus: string;
  isOnline: boolean;
  totalDeliveries: number;
};

export type VendorProfileSettings = {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  payoutBankName: string;
  payoutAccountName: string;
  payoutAccountNumber: string;
  payoutMobileMoneyProvider: string;
  payoutMobileMoneyPhone: string;
  legalDocumentUrl: string;
  notificationSettings: NotificationPrefs;
  autoAcceptOrders: boolean;
  approvalStatus: string;
  restaurantId?: string;
};

const defaultNotifications: NotificationPrefs = {
  orderUpdates: true,
  payouts: true,
  account: true,
};

export const emptyRiderSettings: RiderProfileSettings = {
  vehicleType: '',
  vehiclePlate: '',
  idNumber: '',
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
  mobileMoneyProvider: '',
  mobileMoneyPhone: '',
  licenseDocumentUrl: '',
  insuranceDocumentUrl: '',
  idDocumentUrl: '',
  notificationSettings: defaultNotifications,
  approvalStatus: 'pending',
  isOnline: false,
  totalDeliveries: 0,
};

export const emptyVendorSettings: VendorProfileSettings = {
  businessName: '',
  businessPhone: '',
  businessAddress: '',
  payoutBankName: '',
  payoutAccountName: '',
  payoutAccountNumber: '',
  payoutMobileMoneyProvider: '',
  payoutMobileMoneyPhone: '',
  legalDocumentUrl: '',
  notificationSettings: defaultNotifications,
  autoAcceptOrders: false,
  approvalStatus: 'pending',
};

function localKey(type: 'rider' | 'vendor', userId: string) {
  return `redrush-${type}-settings-${userId}`;
}

async function getSupabaseUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

async function readLocal<T>(type: 'rider' | 'vendor', userId: string, fallback: T) {
  const raw = await AsyncStorage.getItem(localKey(type, userId)).catch(() => null);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

async function saveLocal<T>(type: 'rider' | 'vendor', userId: string, data: T) {
  await AsyncStorage.setItem(localKey(type, userId), JSON.stringify(data)).catch(() => undefined);
}

function notificationPrefs(value: unknown): NotificationPrefs {
  return {
    ...defaultNotifications,
    ...(value && typeof value === 'object' ? value as Partial<NotificationPrefs> : {}),
  };
}

export function isRiderReadyForDeliveries(settings: RiderProfileSettings) {
  // Verification is required for withdrawals, not for accepting deliveries.
  return settings.approvalStatus !== 'suspended';
}

export function isRiderVerifiedForWithdrawal(settings: RiderProfileSettings) {
  return settings.approvalStatus === 'approved' && getRiderVerificationMissingItems(settings).length === 0;
}

export function getRiderVerificationMissingItems(settings: RiderProfileSettings) {
  const missing: string[] = [];
  if (!settings.vehicleType.trim() || !settings.vehiclePlate.trim()) missing.push('Vehicle details');
  if (!settings.idNumber.trim()) missing.push('Identity details');
  if (!settings.bankAccountNumber.trim() && !settings.mobileMoneyPhone.trim()) missing.push('Payout method');
  if (!settings.idDocumentUrl.trim()) missing.push('Government ID image');
  if (!settings.licenseDocumentUrl.trim()) missing.push('Rider licence image');
  return missing;
}

export function isRiderProfileComplete(settings: RiderProfileSettings) {
  return getRiderVerificationMissingItems(settings).length === 0;
}

export function getVendorVerificationMissingItems(settings: VendorProfileSettings) {
  const missing: string[] = [];
  if (!settings.businessName.trim() || !settings.businessPhone.trim() || !settings.businessAddress.trim()) {
    missing.push('Restaurant profile');
  }
  if (!settings.payoutAccountNumber.trim() && !settings.payoutMobileMoneyPhone.trim()) {
    missing.push('Payout method');
  }
  if (!settings.legalDocumentUrl.trim()) missing.push('Business registration document');
  return missing;
}

export function isVendorProfileComplete(settings: VendorProfileSettings) {
  return getVendorVerificationMissingItems(settings).length === 0;
}

export function isVendorVerifiedForWithdrawal(settings: VendorProfileSettings) {
  return settings.approvalStatus === 'approved' && getVendorVerificationMissingItems(settings).length === 0;
}

export async function loadRiderProfileSettings(userId: string): Promise<RiderProfileSettings> {
  const fallback = await readLocal('rider', userId, emptyRiderSettings);
  if (!isSupabaseConfigured) return fallback;

  try {
    const { data, error } = await supabase
      .from('rider_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return fallback;

    return {
      vehicleType: data.vehicle_type || '',
      vehiclePlate: data.vehicle_plate || '',
      idNumber: data.id_number || '',
      bankName: data.bank_name || '',
      bankAccountName: data.bank_account_name || '',
      bankAccountNumber: data.bank_account_number || '',
      mobileMoneyProvider: data.mobile_money_provider || '',
      mobileMoneyPhone: data.mobile_money_phone || '',
      licenseDocumentUrl: data.license_document_url || '',
      insuranceDocumentUrl: data.insurance_document_url || '',
      idDocumentUrl: data.id_document_url || '',
      notificationSettings: notificationPrefs(data.notification_settings),
      approvalStatus: data.approval_status || 'pending',
      isOnline: !!data.is_online,
      totalDeliveries: Number(data.total_deliveries || 0),
    };
  } catch {
    return fallback;
  }
}

export async function saveRiderProfileSettings(userId: string, patch: Partial<RiderProfileSettings>) {
  const current = await loadRiderProfileSettings(userId);
  const next = { ...current, ...patch };
  await saveLocal('rider', userId, next);

  if (!isSupabaseConfigured || await getSupabaseUserId() !== userId) return false;

  const payload: Record<string, unknown> = { user_id: userId };
  if (patch.vehicleType !== undefined) payload.vehicle_type = patch.vehicleType;
  if (patch.vehiclePlate !== undefined) payload.vehicle_plate = patch.vehiclePlate;
  if (patch.idNumber !== undefined) payload.id_number = patch.idNumber;
  if (patch.bankName !== undefined) payload.bank_name = patch.bankName;
  if (patch.bankAccountName !== undefined) payload.bank_account_name = patch.bankAccountName;
  if (patch.bankAccountNumber !== undefined) payload.bank_account_number = patch.bankAccountNumber;
  if (patch.mobileMoneyProvider !== undefined) payload.mobile_money_provider = patch.mobileMoneyProvider;
  if (patch.mobileMoneyPhone !== undefined) payload.mobile_money_phone = patch.mobileMoneyPhone;
  if (patch.licenseDocumentUrl !== undefined) payload.license_document_url = patch.licenseDocumentUrl;
  if (patch.insuranceDocumentUrl !== undefined) payload.insurance_document_url = patch.insuranceDocumentUrl;
  if (patch.idDocumentUrl !== undefined) payload.id_document_url = patch.idDocumentUrl;
  if (patch.notificationSettings !== undefined) payload.notification_settings = patch.notificationSettings;
  if (patch.isOnline !== undefined) payload.is_online = patch.isOnline;

  const { error } = await supabase.from('rider_profiles').upsert(payload, { onConflict: 'user_id' });
  if (error) return false;
  return true;
}

export async function loadVendorProfileSettings(userId: string): Promise<VendorProfileSettings> {
  const fallback = await readLocal('vendor', userId, emptyVendorSettings);
  if (!isSupabaseConfigured) return fallback;

  try {
    const { data, error } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return fallback;

    return {
      businessName: data.business_name || '',
      businessPhone: data.business_phone || '',
      businessAddress: data.business_address || '',
      payoutBankName: data.payout_bank_name || '',
      payoutAccountName: data.payout_account_name || '',
      payoutAccountNumber: data.payout_account_number || '',
      payoutMobileMoneyProvider: data.payout_mobile_money_provider || '',
      payoutMobileMoneyPhone: data.payout_mobile_money_phone || '',
      legalDocumentUrl: data.legal_document_url || '',
      notificationSettings: notificationPrefs(data.notification_settings),
      autoAcceptOrders: !!data.auto_accept_orders,
      approvalStatus: data.approval_status || 'pending',
      restaurantId: data.restaurant_id || undefined,
    };
  } catch {
    return fallback;
  }
}

export async function saveVendorProfileSettings(userId: string, patch: Partial<VendorProfileSettings>) {
  const current = await loadVendorProfileSettings(userId);
  const next = { ...current, ...patch };
  await saveLocal('vendor', userId, next);

  if (!isSupabaseConfigured || await getSupabaseUserId() !== userId) return false;

  const payload: Record<string, unknown> = { user_id: userId };
  if (patch.businessName !== undefined) payload.business_name = patch.businessName;
  if (patch.businessPhone !== undefined) payload.business_phone = patch.businessPhone;
  if (patch.businessAddress !== undefined) payload.business_address = patch.businessAddress;
  if (patch.payoutBankName !== undefined) payload.payout_bank_name = patch.payoutBankName;
  if (patch.payoutAccountName !== undefined) payload.payout_account_name = patch.payoutAccountName;
  if (patch.payoutAccountNumber !== undefined) payload.payout_account_number = patch.payoutAccountNumber;
  if (patch.payoutMobileMoneyProvider !== undefined) payload.payout_mobile_money_provider = patch.payoutMobileMoneyProvider;
  if (patch.payoutMobileMoneyPhone !== undefined) payload.payout_mobile_money_phone = patch.payoutMobileMoneyPhone;
  if (patch.legalDocumentUrl !== undefined) payload.legal_document_url = patch.legalDocumentUrl;
  if (patch.notificationSettings !== undefined) payload.notification_settings = patch.notificationSettings;
  if (patch.autoAcceptOrders !== undefined) payload.auto_accept_orders = patch.autoAcceptOrders;
  if (patch.restaurantId !== undefined) payload.restaurant_id = patch.restaurantId;

  const { error } = await supabase.from('vendor_profiles').upsert(payload, { onConflict: 'user_id' });
  if (error) return false;
  return true;
}
