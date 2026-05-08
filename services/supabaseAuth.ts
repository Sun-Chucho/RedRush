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
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    avatar: data.avatar,
    address: data.address,
    restaurant_id: data.restaurantId,
  };
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

  return toAuthUser(created as ProfileRow, data.email);
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
  const { data: result, error } = await supabase.auth.signUp({
    email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        phone: data.phone,
      },
    },
  });

  if (error) throw error;
  if (!result.user) throw new Error('Unable to create account.');

  return ensureSupabaseProfile(result.user.id, {
    name: data.name,
    email,
    phone: data.phone,
    role: 'customer',
    address: data.address,
  });
}

export async function updateSupabaseProfile(userId: string, data: Partial<AuthUser>) {
  if (!shouldUseSupabaseAuth()) return false;

  const { error } = await supabase.from('profiles').update(toProfilePayload(data)).eq('id', userId);
  if (error) throw error;

  return true;
}

export async function logoutSupabase() {
  if (!shouldUseSupabaseAuth()) return false;

  await supabase.auth.signOut();
  return true;
}
