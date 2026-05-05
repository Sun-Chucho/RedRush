import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { UserRole } from '@/constants/mockData';
import { auth, db } from '@/services/firebase';

WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  address?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (data: Partial<AuthUser> & { password: string }) => Promise<void>;
  loginWithGoogle: (role: UserRole) => Promise<void>;
  loginWithApple: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_CLIENT_IDS = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

const isGoogleConfigured = Boolean(
  GOOGLE_CLIENT_IDS.androidClientId ||
  GOOGLE_CLIENT_IDS.iosClientId ||
  GOOGLE_CLIENT_IDS.webClientId
);

function cleanPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function defaultNameForRole(role: UserRole) {
  if (role === 'vendor') return 'RedRush Vendor';
  if (role === 'rider') return 'RedRush Rider';
  if (role === 'admin') return 'RedRush Admin';
  return 'RedRush Customer';
}

function profileFromFirebaseUser(firebaseUser: FirebaseUser, profile?: Partial<AuthUser>): AuthUser {
  const role = profile?.role || 'customer';

  return {
    id: firebaseUser.uid,
    name: profile?.name || firebaseUser.displayName || defaultNameForRole(role),
    email: profile?.email || firebaseUser.email || '',
    phone: profile?.phone || firebaseUser.phoneNumber || '',
    role,
    avatar: profile?.avatar || firebaseUser.photoURL || undefined,
    address: profile?.address,
  };
}

function getAuthErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
  const message = error instanceof Error ? error.message : 'Authentication failed. Please try again.';

  if (code.includes('auth/email-already-in-use')) return 'That email is already registered. Please sign in instead.';
  if (code.includes('auth/invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
    return 'The email or password is incorrect.';
  }
  if (code.includes('auth/user-not-found')) return 'No account exists for that email.';
  if (code.includes('auth/weak-password')) return 'Password must be at least 6 characters.';
  if (code.includes('auth/network-request-failed')) return 'Network error. Check your connection and try again.';
  if (code.includes('auth/popup-closed-by-user') || code.includes('auth/cancelled-popup-request')) {
    return 'Sign-in was cancelled.';
  }

  return message;
}

async function ensureUserProfile(firebaseUser: FirebaseUser, data: Partial<AuthUser>, forceRole = false) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);
  const existing = snapshot.exists()
    ? (snapshot.data() as Partial<AuthUser> & { status?: string; createdAt?: unknown })
    : {};
  const nextRole = forceRole || !existing.role ? data.role || 'customer' : existing.role;
  const profile = profileFromFirebaseUser(firebaseUser, {
    ...existing,
    ...data,
    role: nextRole,
  });

  await setDoc(
    userRef,
    cleanPayload({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      avatar: profile.avatar,
      address: profile.address,
      status: existing.status || 'active',
      createdAt: existing.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );

  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, , promptGoogleAsync] = Google.useIdTokenAuthRequest(GOOGLE_CLIENT_IDS);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      if (!currentUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          setUser(profileFromFirebaseUser(currentUser, snapshot.data() as Partial<AuthUser>));
        } else {
          setUser(await ensureUserProfile(currentUser, { role: 'customer' }));
        }
      } catch {
        setUser(profileFromFirebaseUser(currentUser));
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await ensureUserProfile(credential.user, { email: email.trim(), role });
      setUser(profile);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const register = async (data: Partial<AuthUser> & { password: string }) => {
    try {
      const email = (data.email || '').trim();
      const credential = await createUserWithEmailAndPassword(auth, email, data.password);

      if (data.name) {
        await updateFirebaseProfile(credential.user, { displayName: data.name });
      }

      const profile = await ensureUserProfile(
        credential.user,
        {
          name: data.name,
          email,
          phone: data.phone,
          role: data.role || 'customer',
          address: data.address,
        },
        true
      );
      setUser(profile);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const loginWithGoogle = async (role: UserRole) => {
    if (!isGoogleConfigured) {
      throw new Error(
        'Google Sign-In needs OAuth client IDs. Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID from Firebase Authentication.'
      );
    }

    try {
      const result = await promptGoogleAsync();

      if (result.type !== 'success') {
        throw new Error('Google Sign-In was cancelled.');
      }

      const idToken = result.params?.id_token;

      if (!idToken) {
        throw new Error('Google did not return an identity token. Check your Firebase OAuth client configuration.');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const firebaseCredential = await signInWithCredential(auth, credential);
      const profile = await ensureUserProfile(firebaseCredential.user, { role });
      setUser(profile);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const loginWithApple = async (role: UserRole) => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();

      if (!isAvailable) {
        throw new Error(
          Platform.OS === 'ios'
            ? 'Apple Sign-In is not available on this device.'
            : 'Apple Sign-In requires an iOS native build. Configure Apple web OAuth before enabling it on Android.'
        );
      }

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!appleCredential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }

      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: appleCredential.identityToken,
      });
      const userCredential = await signInWithCredential(auth, firebaseCredential);
      const fullName = appleCredential.fullName
        ? [appleCredential.fullName.givenName, appleCredential.fullName.familyName].filter(Boolean).join(' ')
        : undefined;
      const profile = await ensureUserProfile(userCredential.user, {
        name: fullName || undefined,
        email: appleCredential.email || userCredential.user.email || undefined,
        role,
      });
      setUser(profile);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const updateProfile = async (data: Partial<AuthUser>) => {
    if (!user) return;

    const nextUser = { ...user, ...data };
    setUser(nextUser);

    if (auth.currentUser && data.name) {
      await updateFirebaseProfile(auth.currentUser, { displayName: data.name });
    }

    await updateDoc(
      doc(db, 'users', user.id),
      cleanPayload({
        name: data.name,
        phone: data.phone,
        avatar: data.avatar,
        address: data.address,
        updatedAt: serverTimestamp(),
      })
    );
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      logout,
      updateProfile,
    }),
    [user, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
