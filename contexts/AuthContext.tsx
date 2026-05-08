import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
// expo-apple-authentication is loaded dynamically to avoid web bundling errors
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
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

type NativeGoogleSignIn = typeof import('@react-native-google-signin/google-signin');

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
  isGoogleSignInReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Partial<AuthUser> & { password: string }) => Promise<void>;
  loginWithGoogle: (role?: UserRole, forceRole?: boolean) => Promise<void>;
  loginWithApple: (role?: UserRole, forceRole?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_CLIENT_IDS = {
  androidClientId:
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ||
    '276964904825-77c1v72s3tmqt7o6imjv231rp4pi34jj.apps.googleusercontent.com',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim(),
  webClientId:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    '276964904825-8bk4qptfdkarvkr55qrdaekcafu1se91.apps.googleusercontent.com',
};

const GOOGLE_ANDROID_REDIRECT_SCHEME =
  'com.googleusercontent.apps.276964904825-77c1v72s3tmqt7o6imjv231rp4pi34jj';

const GOOGLE_REDIRECT_OPTIONS =
  Platform.OS === 'android'
    ? {
        native: `${GOOGLE_ANDROID_REDIRECT_SCHEME}:/oauth2redirect`,
      }
    : undefined;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function getMissingGoogleClientIdMessage() {
  if (Platform.OS === 'android' && !GOOGLE_CLIENT_IDS.androidClientId) {
    return 'Google Sign-In needs EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID for Android. Create an Android OAuth client for package com.redrush.app in Firebase/Google Cloud, then add it to your Expo environment.';
  }

  if (Platform.OS === 'ios' && !GOOGLE_CLIENT_IDS.iosClientId) {
    return 'Google Sign-In needs EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for iOS. Create an iOS OAuth client for bundle com.redrush.app in Firebase/Google Cloud, then add it to your Expo environment.';
  }

  if (Platform.OS === 'web' && !GOOGLE_CLIENT_IDS.webClientId) {
    return 'Google Sign-In needs EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID for web. Create a Web OAuth client in Firebase/Google Cloud, then add it to your Expo environment.';
  }

  return null;
}

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
  if (code.includes('permission-denied') || message.toLowerCase().includes('insufficient permission')) {
    return 'Your account signed in, but Firestore blocked the user profile. The security rules need to allow this user profile read/write.';
  }
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
  // Admin role can never be self-assigned — only set server-side or by another admin
  const requestedRole = data.role === 'admin' ? 'customer' : (data.role || 'customer');
  const nextRole = forceRole || !existing.role ? requestedRole : existing.role;
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

async function getNativeGoogleIdToken() {
  const { GoogleSignin } = (await import('@react-native-google-signin/google-signin')) as NativeGoogleSignIn;

  GoogleSignin.configure({
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
    offlineAccess: false,
  });

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const result = await GoogleSignin.signIn();

  if (result.type !== 'success') {
    throw new Error('Google Sign-In was cancelled.');
  }

  const idToken = result.data.idToken;

  if (!idToken) {
    throw new Error('Google did not return an identity token. Check the Firebase web OAuth client ID.');
  }

  return idToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleRequest, , promptGoogleAsync] = Google.useIdTokenAuthRequest(GOOGLE_CLIENT_IDS, GOOGLE_REDIRECT_OPTIONS);

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

  const login = async (email: string, password: string) => {
    try {
      const emailAddress = email.trim();
      const credential = await signInWithEmailAndPassword(auth, emailAddress, password);
      const profile = await ensureUserProfile(credential.user, { email: emailAddress });
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

  const loginWithGoogle = async (role?: UserRole, forceRole = false) => {
    const missingClientIdMessage = getMissingGoogleClientIdMessage();

    if (missingClientIdMessage) {
      throw new Error(missingClientIdMessage);
    }

    if (Platform.OS !== 'web' && isExpoGo) {
      throw new Error(
        'Google Sign-In cannot run inside Expo Go because Google requires the native Google Sign-In SDK for policy-compliant Android sign-in. Build and open the RedRush development app instead of Expo Go, then try Google Sign-In again.'
      );
    }

    if (Platform.OS === 'web' && !googleRequest) {
      throw new Error('Google Sign-In is still loading. Please try again in a moment.');
    }

    try {
      let idToken: string | undefined;

      if (Platform.OS === 'web') {
        const result = await promptGoogleAsync();

        if (result.type !== 'success') {
          throw new Error('Google Sign-In was cancelled.');
        }

        idToken = result.params?.id_token;
      } else {
        idToken = await getNativeGoogleIdToken();
      }

      if (!idToken) {
        throw new Error('Google did not return an identity token. Check your Firebase OAuth client configuration.');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const firebaseCredential = await signInWithCredential(auth, credential);
      const profile = await ensureUserProfile(firebaseCredential.user, { role: role || 'customer' }, forceRole);
      setUser(profile);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const loginWithApple = async (role?: UserRole, forceRole = false) => {
    try {
      const AppleAuthentication = await import('expo-apple-authentication');
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
        role: role || 'customer',
      }, forceRole);
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
      isGoogleSignInReady: Platform.OS === 'web' ? !!googleRequest : true,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      logout,
      updateProfile,
    }),
    [user, isLoading, googleRequest]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
