import type { AuthUser } from '@/contexts/AuthContext';
import { UserRole } from '@/constants/mockData';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { isSupabaseConfigured, supabase } from './supabase';
import { withTimeout } from './asyncUtils';

WebBrowser.maybeCompleteAuthSession();

const NATIVE_AUTH_CALLBACK = 'redrush://auth-callback';

function redirectUriFor(path: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/${path}`;
  }

  // Expo Go cannot open the standalone redrush:// scheme. During QR testing,
  // use Expo's current exp:// development URL; installed builds always return
  // directly to the RedRush app through its registered custom scheme.
  if (Constants.appOwnership === 'expo') return makeRedirectUri({ path });
  return path === 'auth-callback' ? NATIVE_AUTH_CALLBACK : `redrush://${path}`;
}

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

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return null;

  return getSupabaseProfileForSessionUser(data.session.user);
}

export function getSupabaseProfileForSessionUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}) {
  return ensureSupabaseProfile(user.id, {
    email: user.email || '',
    name: user.user_metadata?.name,
    phone: user.user_metadata?.phone,
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

function googleProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata || {};
  const metadataName = metadata.full_name || metadata.name;
  const metadataAvatar = metadata.avatar_url || metadata.picture;

  return ensureSupabaseProfile(user.id, {
    email: user.email || '',
    name: typeof metadataName === 'string' ? metadataName : undefined,
    avatar: typeof metadataAvatar === 'string' ? metadataAvatar : undefined,
    role: 'customer',
  });
}

function nativeSessionParams(callbackUrl: string) {
  const parsed = new URL(callbackUrl);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));

  return {
    accessToken: hash.get('access_token'),
    refreshToken: hash.get('refresh_token'),
    code: parsed.searchParams.get('code'),
    error: parsed.searchParams.get('error_description') || hash.get('error_description'),
  };
}

/**
 * Starts Google OAuth. Web redirects back to /auth-callback; native completes
 * inside the secure system browser and exchanges the returned session locally.
 */
export async function loginWithSupabaseGoogle(): Promise<AuthUser | null> {
  if (!shouldUseSupabaseAuth()) return null;

  const redirectTo = redirectUriFor('auth-callback');

  const { data, error } = await withTimeout(
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    }),
    15000,
    'Google sign-in could not start. Check your connection and try again.'
  );

  if (error) throw error;
  if (Platform.OS === 'web') return null;
  if (!data.url) throw new Error('Google did not return a sign-in URL.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Google sign-in was cancelled.');
  }
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in did not complete.');
  }

  const params = nativeSessionParams(result.url);
  if (params.error) throw new Error(params.error);

  if (params.code) {
    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
    if (exchangeError) throw exchangeError;
    if (!sessionData.user) throw new Error('Google sign-in returned no user.');
    return googleProfile(sessionData.user);
  }

  if (!params.accessToken || !params.refreshToken) {
    throw new Error('Google sign-in returned an invalid session.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: params.accessToken,
    refresh_token: params.refreshToken,
  });
  if (sessionError) throw sessionError;
  if (!sessionData.user) throw new Error('Google sign-in returned no user.');

  return googleProfile(sessionData.user);
}

export async function completeSupabaseOAuthCallback(callbackUrl?: string): Promise<AuthUser> {
  const { data: current } = await supabase.auth.getSession();
  if (current.session?.user) return googleProfile(current.session.user);

  if (!callbackUrl) throw new Error('Google sign-in returned no callback URL.');
  const params = nativeSessionParams(callbackUrl);
  if (params.error) throw new Error(params.error);

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    if (!data.user) throw new Error('Google sign-in returned no user.');
    return googleProfile(data.user);
  }

  if (params.accessToken && params.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Google sign-in returned no user.');
    return googleProfile(data.user);
  }

  throw new Error('Google sign-in returned an invalid callback.');
}

function authRedirectUrl(path: string) {
  return redirectUriFor(path);
}

export async function requestSupabasePasswordReset(email: string) {
  if (!shouldUseSupabaseAuth()) throw new Error('Backend not configured.');

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: authRedirectUrl('reset-password'),
  });
  if (error) throw error;
}

export async function completeSupabaseRecoveryCallback(callbackUrl?: string) {
  const { data: current } = await supabase.auth.getSession();
  if (current.session) return true;
  if (!callbackUrl) throw new Error('The password reset link is invalid.');

  const params = nativeSessionParams(callbackUrl);
  if (params.error) throw new Error(params.error);

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return true;
  }

  if (params.accessToken && params.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });
    if (error) throw error;
    return true;
  }

  throw new Error('The password reset link is invalid or expired.');
}

export async function updateSupabasePassword(password: string) {
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
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
