/**
 * AuthContext - Supabase-only authentication.
 */
import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { UserRole } from '@/constants/mockData';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import {
  getSupabaseProfileForSessionUser,
  loginWithSupabaseEmail,
  loginWithSupabaseGoogle,
  logoutSupabase,
  registerWithSupabaseEmail,
  updateSupabaseProfile,
} from '@/services/supabaseAuth';
import { withTimeout } from '@/services/asyncUtils';

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
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: () => Promise<AuthUser | null>;
  register: (data: Partial<AuthUser> & { password: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSupabaseErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (lower.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists.';
  }
  if (lower.includes('password should be at least') || lower.includes('password must be at least')) {
    return 'Password must be at least 8 characters.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Check your connection and try again.';
  }

  return msg || 'Authentication failed. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    let hydrationId = 0;

    // Supabase emits INITIAL_SESSION as soon as the persisted session has been
    // read. A separate getSession() here can contend for the same storage lock
    // on slower Android devices. The watchdog guarantees that corrupted local
    // storage or a stalled SDK callback can never leave the launch screen up.
    const startupWatchdog = setTimeout(() => {
      if (!mounted) return;
      hydrationId += 1;
      setUser(null);
      setIsLoading(false);
    }, 9000);

    const finishStartup = (profile: AuthUser | null) => {
      if (!mounted) return;
      clearTimeout(startupWatchdog);
      setUser(profile);
      setIsLoading(false);
    };

    const hydrateSessionUser = (sessionUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, any>;
    }) => {
      const requestId = ++hydrationId;

      // Supabase recommends keeping onAuthStateChange callbacks synchronous.
      // Defer profile I/O so it cannot deadlock the auth client's internal lock.
      setTimeout(() => {
        withTimeout(
          getSupabaseProfileForSessionUser(sessionUser),
          8000,
          'Profile loading timed out.'
        )
          .then(profile => {
            if (mounted && requestId === hydrationId) finishStartup(profile);
          })
          .catch(() => {
            if (mounted && requestId === hydrationId) finishStartup(null);
          });
      }, 0);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        hydrationId += 1;
        finishStartup(null);
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        hydrateSessionUser(session.user);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(startupWatchdog);
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Backend not configured. Please contact support.');

    try {
      const profile = await withTimeout(
        loginWithSupabaseEmail(email.trim(), password),
        15000,
        'Sign in took too long. Check your connection and try again.'
      );
      if (!profile) throw new Error('Sign in failed. Please try again.');
      setUser(profile);
      return profile;
    } catch (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }
  }, []);

  const register = useCallback(async (data: Partial<AuthUser> & { password: string }) => {
    if (!isSupabaseConfigured) throw new Error('Backend not configured. Please contact support.');

    try {
      const profile = await withTimeout(
        registerWithSupabaseEmail({
          ...data,
          email: data.email?.trim(),
        }),
        20000,
        'Account creation took too long. Check your connection and try again.'
      );
      if (!profile) throw new Error('Unable to create account. Please try again.');
      setUser(profile);
      return profile;
    } catch (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) throw new Error('Backend not configured. Please contact support.');

    try {
      const profile = await loginWithSupabaseGoogle();
      if (profile) setUser(profile);
      return profile;
    } catch (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await logoutSupabase();
  }, []);

  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    if (!user) return;

    const previousUser = user;
    const nextUser = { ...user, ...data };
    setUser(nextUser);

    try {
      await updateSupabaseProfile(user.id, data);
    } catch (error) {
      setUser(previousUser);
      throw error;
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
  }), [user, isLoading, login, loginWithGoogle, register, logout, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
