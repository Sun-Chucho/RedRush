/**
 * AuthContext — Supabase-only authentication
 * Firebase has been fully removed from auth flow.
 */
import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { UserRole } from '@/constants/mockData';
import { isSupabaseConfigured, supabase } from '@/services/supabase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  address?: string;
  restaurantId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Partial<AuthUser> & { password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function defaultNameForRole(role: UserRole): string {
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

function safeRole(role?: UserRole | string | null): UserRole {
  if (role === 'vendor' || role === 'rider') return role;
  if (role === 'admin') return 'admin';
  return 'customer';
}

function getSupabaseErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.toLowerCase().includes('invalid login credentials')) return 'Incorrect email or password.';
  if (msg.toLowerCase().includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (msg.toLowerCase().includes('user already registered')) return 'An account with this email already exists.';
  if (msg.toLowerCase().includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (msg.toLowerCase().includes('network')) return 'Network error. Check your connection and try again.';
  return msg || 'Authentication failed. Please try again.';
}

async function ensureProfile(
  userId: string,
  data: Partial<AuthUser> & { email?: string }
): Promise<AuthUser> {
  // Try to load existing profile
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (selectError && !selectError.message.includes('No rows')) throw selectError;

  if (existing) {
    return toAuthUser(existing as ProfileRow, data.email);
  }

  // Create new profile
  const role = safeRole(data.role);
  const payload = {
    id: userId,
    name: data.name || defaultNameForRole(role),
    email: data.email || '',
    phone: data.phone || '',
    role,
    avatar: data.avatar || null,
    address: data.address || null,
    restaurant_id: data.restaurantId || null,
    status: 'active',
  };

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert(payload)
    .select('*')
    .single();

  if (insertError) throw insertError;

  // Create role-specific sub-profile
  await createRoleProfile(userId, data).catch(() => undefined);

  return toAuthUser(created as ProfileRow, data.email);
}

async function createRoleProfile(userId: string, data: Partial<AuthUser>) {
  const role = safeRole(data.role);
  // Always create customer profile data
  await supabase.from('customer_profile_data').upsert({ user_id: userId });

  if (role === 'vendor') {
    await supabase.from('vendor_profiles').upsert({
      user_id: userId,
      business_name: data.name || '',
      business_phone: data.phone || '',
      business_address: data.address || '',
      restaurant_id: data.restaurantId || null,
    });
  }

  if (role === 'rider') {
    await supabase.from('rider_profiles').upsert({
      user_id: userId,
      is_online: false,
      vehicle_type: 'motorcycle',
    });
  }
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session restore on mount
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Load existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const profile = await ensureProfile(session.user.id, {
            email: session.user.email || '',
            name: session.user.user_metadata?.name,
            phone: session.user.user_metadata?.phone,
            role: session.user.user_metadata?.role,
          });
          setUser(profile);
        } catch {
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    // Listen for auth state changes (login/logout from other tabs, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          const profile = await ensureProfile(session.user.id, {
            email: session.user.email || '',
            name: session.user.user_metadata?.name,
            phone: session.user.user_metadata?.phone,
            role: session.user.user_metadata?.role,
          });
          setUser(profile);
        } catch {
          // Profile creation may fail on schema mismatch — still consider signed in
        }
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Backend not configured. Please contact support.');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw new Error(getSupabaseErrorMessage(error));
    if (!data.user) throw new Error('Sign in failed. Please try again.');

    const profile = await ensureProfile(data.user.id, {
      email: data.user.email || email,
      name: data.user.user_metadata?.name,
      phone: data.user.user_metadata?.phone,
      role: data.user.user_metadata?.role,
    });
    setUser(profile);
  }, []);

  const register = useCallback(async (data: Partial<AuthUser> & { password: string }) => {
    if (!isSupabaseConfigured) throw new Error('Backend not configured. Please contact support.');

    const email = (data.email || '').trim();
    const role = safeRole(data.role);

    // Sign up via Supabase auth
    const { data: result, error } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          phone: data.phone,
          role,
        },
      },
    });

    if (error) throw new Error(getSupabaseErrorMessage(error));
    if (!result.user) throw new Error('Unable to create account. Please try again.');

    // Some Supabase configs require email confirmation — handle gracefully
    if (!result.session) {
      // Account created but email confirmation required
      throw new Error('Account created! Please check your email to confirm your account, then sign in.');
    }

    const profile = await ensureProfile(result.user.id, {
      name: data.name,
      email,
      phone: data.phone,
      role,
      address: data.address,
    });
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    if (!user) return;

    // Optimistic update
    setUser(prev => (prev ? { ...prev, ...data } : null));

    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.avatar !== undefined) payload.avatar = data.avatar;
    if (data.address !== undefined) payload.address = data.address;
    if (data.restaurantId !== undefined) payload.restaurant_id = data.restaurantId;

    if (Object.keys(payload).length) {
      const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (error) {
        // Roll back optimistic update
        const previousUser = user as unknown as Record<string, unknown>;
        setUser(prev => (prev ? { ...prev, ...Object.fromEntries(Object.keys(data).map(k => [k, previousUser[k]])) } : null));
        throw error;
      }
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  }), [user, isLoading, login, register, logout, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
