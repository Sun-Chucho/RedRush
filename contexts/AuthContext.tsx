/**
 * AuthContext - Supabase-only authentication.
 */
import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { UserRole } from '@/constants/mockData';
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import {
  getCurrentSupabaseUser,
  loginWithSupabaseEmail,
  logoutSupabase,
  registerWithSupabaseEmail,
  updateSupabaseProfile,
} from '@/services/supabaseAuth';

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

function getSupabaseErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (lower.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists.';
  }
  if (lower.includes('password should be at least') || lower.includes('password must be at least')) {
    return 'Password must be at least 6 characters.';
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

    getCurrentSupabaseUser()
      .then((profile) => {
        if (mounted) setUser(profile);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          setUser(await getCurrentSupabaseUser());
        } catch {
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Backend not configured. Please contact support.');

    try {
      const profile = await loginWithSupabaseEmail(email.trim(), password);
      if (!profile) throw new Error('Sign in failed. Please try again.');
      setUser(profile);
    } catch (error) {
      throw new Error(getSupabaseErrorMessage(error));
    }
  }, []);

  const register = useCallback(async (data: Partial<AuthUser> & { password: string }) => {
    if (!isSupabaseConfigured) throw new Error('Backend not configured. Please contact support.');

    try {
      const profile = await registerWithSupabaseEmail({
        ...data,
        email: data.email?.trim(),
      });
      if (!profile) throw new Error('Unable to create account. Please try again.');
      setUser(profile);
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
