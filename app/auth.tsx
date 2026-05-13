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
import { MaterialIcons } from '@expo/vector-icons';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/hooks/useLanguage';
import { UserRole } from '@/constants/mockData';
import { useThemeMode } from '@/contexts/ThemeContext';

type SignupRole = Exclude<UserRole, 'admin'>;

const SIGNUP_ROLES: { role: SignupRole; icon: keyof typeof MaterialIcons.glyphMap; label: string; desc: string }[] = [
  { role: 'customer', icon: 'person', label: 'Customer', desc: 'Order food' },
  { role: 'vendor', icon: 'restaurant', label: 'Vendor', desc: 'Sell meals' },
  { role: 'rider', icon: 'delivery-dining', label: 'Rider', desc: 'Deliver orders' },
];

// Preload both auth images so they appear instantly on tab switch
const SIGN_1 = require('@/sign-1.jpeg');
const SIGN_2 = require('@/sign-2.jpeg');

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [signupRole, setSignupRole] = useState<SignupRole>('customer');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, register } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const { mode: themeMode } = useThemeMode();
  const { width, height } = useWindowDimensions();
  const isWebPhonePreview = Platform.OS === 'web' && width >= 768;
  const phoneHeight = isWebPhonePreview ? Math.max(620, Math.min(860, height - 48)) : height;
  const heroHeight = Math.max(220, Math.min(320, Math.round(phoneHeight * 0.34)));

  // Prefetch both images on mount so the swap is instant
  useEffect(() => {
    Image.prefetch([SIGN_1, SIGN_2] as any)
      .catch(() => undefined);
  }, []);

  const heroImage = mode === 'register' ? SIGN_1 : SIGN_2;

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
        await login(email, password);
      } else {
        await register({ name, email, phone, password, role: signupRole });
      }
      const nextHref = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/';
      router.replace(nextHref as Href);
    } catch (e) {
      showAlert(t('authFailed'), e instanceof Error ? e.message : t('tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.webStage, isWebPhonePreview && styles.webStageDesktop]}>
      <KeyboardAvoidingView
        style={[styles.container, themed.screen, isWebPhonePreview && styles.phoneFrame, isWebPhonePreview && { height: phoneHeight }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={Colors.background} />
        <ScrollView style={[styles.scrollView, themed.screen]} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, { height: heroHeight }]}>
            <Image
              source={heroImage}
              style={styles.heroImage}
              contentFit="contain"
              transition={120}
            />
            <LinearGradient
              colors={['rgba(204,0,0,0.92)', 'rgba(204,0,0,0.44)', 'rgba(8,8,8,0.06)', Colors.background]}
              locations={[0, 0.34, 0.72, 1]}
              style={styles.heroGradient}
            />
          </View>

          <View style={[styles.authPanel, themed.screen]}>
            <View style={styles.topControls}>
              <LanguageToggle />
            </View>

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
                    <View style={styles.rolesGrid}>
                      {SIGNUP_ROLES.map(item => {
                        const active = signupRole === item.role;
                        return (
                          <TouchableOpacity
                            key={item.role}
                            style={[styles.roleCard, active && styles.roleCardActive]}
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
            </View>

            <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.submitBtnText}>{mode === 'login' ? t('login') : t('createAccount')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  webStage: { flex: 1, backgroundColor: Colors.background },
  webStageDesktop: {
    alignItems: 'center',
    backgroundColor: '#110B0B',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  container: { flex: 1, backgroundColor: Colors.background },
  phoneFrame: {
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 34,
    borderWidth: 1,
    maxWidth: 430,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.42,
    shadowRadius: 36,
    width: '100%',
  },
  scrollView: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xl },
  hero: { minHeight: 220, position: 'relative', overflow: 'hidden', backgroundColor: Colors.background },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  authPanel: { paddingHorizontal: Spacing.md, paddingTop: 0 },
  topControls: { alignSelf: 'center', flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  modeToggle: { flexDirection: 'row', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.md },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { color: Colors.textMuted, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  modeBtnTextActive: { color: Colors.text },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  rolesGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  roleCard: { flex: 1, minHeight: 88, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
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
});
