import type { AuthUser } from '@/contexts/AuthContext';
import { UserRole } from '@/constants/mockData';
import { isSupabaseConfigured, supabase } from './supabase';

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole | null;
  avatar: string | null;
  address: string | null;
  restaurant_id: string | null;
};

function safeSignupRole(role: Partial<AuthUser>['role']) {
  return role === 'vendor' || role === 'rider' ? role : 'customer';
}

const launchApiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_WEB_URL ||
  'https://red-rush.vercel.app'
).replace(/\/$/, '');

export function shouldUseSupabaseAuth() {
  return isSupabaseConfigured;
}

function defaultNameForRole(role: UserRole) {
  if (role === 'vendor') return 'RedRush Vendor';
  if (role === 'rider') return 'RedRush Rider';
  if (role === 'admin') return 'RedRush Admin';
  return 'RedRush Customer';
}

function toAuthUser(row: ProfileRow, fallbackEmail = ''): AuthUser {
  const role = row.role || 'customer';

  return {
    id: row.id,
    name: row.name || defaultNameForRole(role),
    email: row.email || fallbackEmail,
    phone: row.phone || '',
    role,
    avatar: row.avatar || undefined,
    address: row.address || undefined,
    restaurantId: row.restaurant_id || undefined,
  };
}

function toProfilePayload(data: Partial<AuthUser>) {
  return Object.fromEntries(Object.entries({
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    avatar: data.avatar,
    address: data.address,
    restaurant_id: data.restaurantId,
  }).filter(([, value]) => value !== undefined));
}

async function ensureSupabaseProfile(userId: string, data: Partial<AuthUser>): Promise<AuthUser> {
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    return toAuthUser(existing as ProfileRow, data.email);
  }

  const role = data.role || 'customer';
  const payload = {
    id: userId,
    name: data.name || defaultNameForRole(role),
    email: data.email || '',
    phone: data.phone || '',
    role,
    avatar: data.avatar,
    address: data.address,
    restaurant_id: data.restaurantId,
    status: 'active',
  };

  const { data: created, error } = await supabase.from('profiles').insert(payload).select('*').single();
  if (error) throw error;

  await ensureSupabaseRoleDetails(userId, { ...data, role });

  return toAuthUser(created as ProfileRow, data.email);
}

async function ensureSupabaseRoleDetails(userId: string, data: Partial<AuthUser>) {
  const role = data.role || 'customer';

  try {
    await supabase.from('customer_profile_data').upsert({ user_id: userId }).throwOnError();

    if (role === 'vendor') {
      await supabase
        .from('vendor_profiles')
        .upsert({
          user_id: userId,
          business_name: data.name || '',
          business_phone: data.phone || '',
          business_address: data.address || '',
          restaurant_id: data.restaurantId || null,
        })
        .throwOnError();
    }

    if (role === 'rider') {
      await supabase.from('rider_profiles').upsert({ user_id: userId }).throwOnError();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (!message.includes('schema cache') && !message.includes('could not find the table')) throw error;
  }
}

export async function getCurrentSupabaseUser() {
  if (!shouldUseSupabaseAuth()) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return ensureSupabaseProfile(data.user.id, {
    email: data.user.email || '',
    name: data.user.user_metadata?.name,
    phone: data.user.user_metadata?.phone,
    role: 'customer',
  });
}

export async function loginWithSupabaseEmail(email: string, password: string) {
  if (!shouldUseSupabaseAuth()) return null;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Unable to sign in.');

  return ensureSupabaseProfile(data.user.id, {
    email: data.user.email || email,
    name: data.user.user_metadata?.name,
    phone: data.user.user_metadata?.phone,
    role: 'customer',
  });
}

export async function registerWithSupabaseEmail(data: Partial<AuthUser> & { password: string }) {
  if (!shouldUseSupabaseAuth()) return null;

  const email = (data.email || '').trim();
  const role = safeSignupRole(data.role);

  const response = await fetch(`${launchApiBaseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: data.name,
      email,
      phone: data.phone,
      password: data.password,
      role,
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to create account.');
  }

  const { data: signInResult, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: data.password,
  });

  if (signInError) throw signInError;
  if (!signInResult.user) throw new Error('Account created, but sign in failed.');

  return ensureSupabaseProfile(signInResult.user.id, {
    name: data.name,
    email,
    phone: data.phone,
    role,
    address: data.address,
  });
}

export async function updateSupabaseProfile(userId: string, data: Partial<AuthUser>) {
  if (!shouldUseSupabaseAuth()) return false;

  const payload = toProfilePayload(data);
  if (!Object.keys(payload).length) return true;

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) throw error;

  return true;
}

export async function logoutSupabase() {
  if (!shouldUseSupabaseAuth()) return false;

  await supabase.auth.signOut();
  return true;
}
