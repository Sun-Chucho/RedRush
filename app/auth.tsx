import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/hooks/useLanguage';
import { UserRole } from '@/constants/mockData';
import { useThemeMode } from '@/contexts/ThemeContext';
import { dashboardForRole } from '@/services/authRoutes';

type SignupRole = Exclude<UserRole, 'admin'>;

const SIGNUP_ROLES: { role: SignupRole; icon: keyof typeof MaterialIcons.glyphMap; label: string; desc: string }[] = [
  { role: 'customer', icon: 'person', label: 'Customer', desc: 'Order food' },
  { role: 'vendor', icon: 'restaurant', label: 'Vendor', desc: 'Sell meals' },
  { role: 'rider', icon: 'delivery-dining', label: 'Rider', desc: 'Deliver orders' },
];

// Preload both auth images so they appear instantly on tab switch
const SIGN_1 = require('@/sign-1.webp');
const SIGN_2 = require('@/sign-2.webp');

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [signupRole, setSignupRole] = useState<SignupRole>('customer');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { isAuthenticated, isLoading, login, loginWithGoogle, register, user } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const { mode: themeMode } = useThemeMode();
  const { height, width } = useWindowDimensions();
  const showHero = Platform.OS === 'web';
  const isWideWeb = Platform.OS === 'web' && width >= 1024;
  const isTabletWeb = Platform.OS === 'web' && width >= 768 && width < 1024;
  const compactRoles = Platform.OS !== 'web' && width < 370;
  const heroHeight = Math.max(220, Math.min(320, Math.round(height * 0.34)));
  const authPanelWidth: number | `${number}%` = isWideWeb
    ? '48%'
    : isTabletWeb
    ? Math.min(width - 96, 620)
    : Platform.OS === 'web'
    ? Math.min(width - 32, 560)
    : width;

  const heroImage = mode === 'register' ? SIGN_1 : SIGN_2;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(dashboardForRole(user?.role));
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  const themed = {
    screen: { backgroundColor: Colors.background },
    modeToggle: { backgroundColor: Colors.surfaceElevated },
    inputRow: { backgroundColor: Colors.surfaceCard, borderColor: Colors.border },
    input: { color: Colors.text },
    muted: { color: Colors.textMuted },
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      showAlert(t('missingFields'), t('missingFieldsBody'));
      return;
    }

    if (mode === 'register' && (!name || !phone)) {
      showAlert(t('missingFields'), t('missingFieldsBody'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const profile = await login(email, password);
        router.replace(dashboardForRole(profile.role));
      } else {
        const profile = await register({ name, email, phone, password, role: signupRole });
        router.replace(dashboardForRole(profile.role));
      }
    } catch (e) {
      showAlert(t('authFailed'), e instanceof Error ? e.message : t('tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const profile = await loginWithGoogle();
      if (profile) router.replace(dashboardForRole(profile.role));
    } catch (e) {
      showAlert('Google sign-in failed', e instanceof Error ? e.message : t('tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  if (!isLoading && isAuthenticated) {
    return <Redirect href={dashboardForRole(user?.role)} />;
  }

  return (
    <View style={styles.webStage}>
      <KeyboardAvoidingView style={[styles.container, themed.screen]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={Colors.background} />
        <ScrollView
          style={[styles.scrollView, themed.screen]}
          contentContainerStyle={[styles.scroll, !showHero && styles.scrollNative, isTabletWeb && styles.scrollTablet, isWideWeb && styles.scrollWide]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          {showHero && (
            <View style={[styles.hero, { height: heroHeight }, isTabletWeb && styles.heroTablet, isWideWeb && styles.heroWide]}>
              <Image
                source={heroImage}
                style={styles.heroImage}
                contentFit={isWideWeb ? 'cover' : 'contain'}
                transition={120}
              />
              <LinearGradient
                colors={['rgba(204,0,0,0.92)', 'rgba(204,0,0,0.44)', 'rgba(8,8,8,0.06)', Colors.background]}
                locations={[0, 0.34, 0.72, 1]}
                style={styles.heroGradient}
              />
              {isWideWeb ? (
                <View style={styles.heroContent}>
                  <View style={styles.brandMark}><Text style={styles.brandMarkText}>R</Text></View>
                  <Text style={styles.heroEyebrow}>REDRUSH DELIVERY</Text>
                  <Text style={styles.heroTitle}>Good food, moving fast.</Text>
                  <Text style={styles.heroSubtitle}>Order nearby, follow every step, and see your rider approach in real time.</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={[styles.authPanel, !showHero && styles.authPanelNative, isTabletWeb && styles.authPanelTablet, isWideWeb && styles.authPanelWide, { width: authPanelWidth }]}>
            <View style={[styles.topControls, (isTabletWeb || isWideWeb) && styles.topControlsWide]}>
              <LanguageToggle />
            </View>

            {isWideWeb ? (
              <View style={styles.panelHeading}>
                <Text style={styles.panelEyebrow}>{mode === 'login' ? 'WELCOME BACK' : 'JOIN REDRUSH'}</Text>
                <Text style={styles.panelTitle}>{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</Text>
                <Text style={styles.panelSubtitle}>{mode === 'login' ? 'Your restaurants, orders and live delivery updates are ready.' : 'Choose how you use RedRush and get started in minutes.'}</Text>
              </View>
            ) : null}

            <View style={[styles.modeToggle, themed.modeToggle]}>
              {(['login', 'register'] as const).map(m => (
                <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]} onPress={() => setMode(m)}>
                  <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                    {m === 'login' ? t('login') : t('signUp')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.form}>
              {mode === 'register' && (
                <>
                  <View style={[styles.inputRow, themed.inputRow]}>
                    <MaterialIcons name="person" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, themed.input]}
                      placeholder={t('fullName')}
                      placeholderTextColor={Colors.textMuted}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                  <View style={[styles.inputRow, themed.inputRow]}>
                    <MaterialIcons name="phone" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, themed.input]}
                      placeholder={t('phoneNumber')}
                      placeholderTextColor={Colors.textMuted}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View>
                    <Text style={styles.sectionLabel}>Account type</Text>
                    <View style={[styles.rolesGrid, compactRoles && styles.rolesGridCompact]}>
                      {SIGNUP_ROLES.map(item => {
                        const active = signupRole === item.role;
                        return (
                          <TouchableOpacity
                            key={item.role}
                            style={[styles.roleCard, compactRoles && styles.roleCardCompact, active && styles.roleCardActive]}
                            onPress={() => setSignupRole(item.role)}
                            activeOpacity={0.85}
                          >
                            <MaterialIcons name={item.icon} size={22} color={active ? Colors.primary : Colors.textMuted} />
                            <Text style={[styles.roleLabel, themed.muted, active && styles.roleLabelActive]}>{item.label}</Text>
                            <Text style={[styles.roleDesc, themed.muted]}>{item.desc}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}

              <View style={[styles.inputRow, themed.inputRow]}>
                <MaterialIcons name="email" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, themed.input]}
                  placeholder={t('emailAddress')}
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={[styles.inputRow, themed.inputRow]}>
                <MaterialIcons name="lock" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, themed.input, { flex: 1 }]}
                  placeholder={t('password')}
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              {mode === 'login' ? (
                <TouchableOpacity onPress={() => router.push('/forgot-password' as any)} style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.submitBtnText}>{mode === 'login' ? t('login') : t('createAccount')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, themed.muted]}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              style={[styles.googleBtn, loading && { opacity: 0.7 }]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              testID="google-sign-in"
            >
              <FontAwesome name="google" size={20} color="#4285F4" style={styles.googleMark} />
              <Text style={styles.googleBtnText} numberOfLines={1}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  webStage: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xl },
  scrollTablet: { flexGrow: 1, justifyContent: 'center', alignSelf: 'center', width: '100%', maxWidth: 720, paddingHorizontal: 32, paddingVertical: 32 },
  scrollWide: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: 1240, paddingHorizontal: 32, paddingVertical: 32, gap: 32 },
  scrollNative: { flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.lg },
  hero: { minHeight: 220, position: 'relative', overflow: 'hidden', backgroundColor: Colors.background },
  heroTablet: { height: 340, borderRadius: 24 },
  heroWide: { flex: 1.08, width: '52%', height: 720, maxHeight: 760, borderRadius: 28 },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroContent: { position: 'absolute', left: 36, right: 36, bottom: 36 },
  brandMark: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, height: 50, justifyContent: 'center', marginBottom: 18, width: 50 },
  brandMarkText: { color: Colors.primary, fontSize: 29, fontWeight: FontWeight.extrabold },
  heroEyebrow: { color: 'rgba(255,255,255,0.76)', fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.8, marginBottom: 8 },
  heroTitle: { color: '#FFFFFF', fontSize: 38, fontWeight: FontWeight.extrabold, letterSpacing: -1.1, lineHeight: 43, maxWidth: 440 },
  heroSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: FontSize.body, lineHeight: 23, marginTop: 12, maxWidth: 430 },
  authPanel: { alignSelf: 'center', paddingHorizontal: Spacing.md, paddingTop: 0, maxWidth: 560 },
  authPanelNative: { justifyContent: 'center' },
  authPanelTablet: { alignSelf: 'center', backgroundColor: Colors.surfaceCard, borderColor: Colors.border, borderRadius: 24, borderWidth: 1, marginTop: -22, maxWidth: 620, paddingHorizontal: 28, paddingBottom: 26, paddingTop: 22 },
  authPanelWide: { alignSelf: 'center', flex: 0.92, maxWidth: 520, backgroundColor: Colors.surfaceCard, borderColor: Colors.border, borderRadius: 28, borderWidth: 1, paddingHorizontal: 32, paddingBottom: 28, paddingTop: 24 },
  topControls: { alignSelf: 'center', flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  topControlsWide: { alignSelf: 'flex-end', marginBottom: Spacing.md },
  panelHeading: { marginBottom: Spacing.lg },
  panelEyebrow: { color: Colors.primary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.7, marginBottom: 7 },
  panelTitle: { color: Colors.text, fontSize: 27, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  panelSubtitle: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20, marginTop: 7 },
  modeToggle: { flexDirection: 'row', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.md },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { color: Colors.textMuted, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  modeBtnTextActive: { color: Colors.text },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  rolesGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  rolesGridCompact: { flexDirection: 'column' },
  roleCard: { flex: 1, minHeight: 88, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  roleCardCompact: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-start', minHeight: 58, paddingHorizontal: Spacing.md },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(204,0,0,0.08)' },
  roleLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginTop: 6 },
  roleLabelActive: { color: Colors.primary },
  roleDesc: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginTop: 2 },
  form: { gap: Spacing.sm, marginBottom: Spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 52, borderWidth: 1, borderColor: Colors.border },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, color: Colors.text, fontSize: FontSize.body },
  eyeBtn: { padding: 4 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 16, alignItems: 'center', marginBottom: Spacing.md },
  submitBtnText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  dividerRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  dividerLine: { backgroundColor: Colors.border, flex: 1, height: 1 },
  dividerText: { color: Colors.textMuted, fontSize: FontSize.sm },
  googleBtn: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DADCE0', borderRadius: BorderRadius.full, borderWidth: 1, flexDirection: 'row', height: 52, justifyContent: 'center', marginBottom: Spacing.md },
  googleMark: { marginRight: Spacing.sm },
  googleBtnText: { color: '#3C4043', flexShrink: 0, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
