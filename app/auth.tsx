import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/hooks/useLanguage';
import { UserRole } from '@/constants/mockData';

type SignupRole = Exclude<UserRole, 'admin'>;

const SIGNUP_ROLES: { role: SignupRole; icon: keyof typeof MaterialIcons.glyphMap; label: string; desc: string }[] = [
  { role: 'customer', icon: 'person', label: 'Customer', desc: 'Order food' },
  { role: 'vendor', icon: 'restaurant', label: 'Vendor', desc: 'Sell meals' },
  { role: 'rider', icon: 'delivery-dining', label: 'Rider', desc: 'Deliver orders' },
];

const HERO_HEIGHT = Math.round(Dimensions.get('window').height * 0.46);

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
  const { showAlert } = useAlert();
  const { t } = useLanguage();

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
      router.replace('/');
    } catch (e) {
      showAlert(t('authFailed'), e instanceof Error ? e.message : t('tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={require('@/assets/images/hero-delivery.png')} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            colors={['rgba(204,0,0,0.92)', 'rgba(204,0,0,0.44)', 'rgba(8,8,8,0.06)', Colors.background]}
            locations={[0, 0.34, 0.72, 1]}
            style={styles.heroGradient}
          />
          <View style={styles.heroContent}>
            <View style={styles.logoRow}>
              <Image source={require('@/assets/images/logo.png')} style={styles.logoIcon} contentFit="contain" />
              <Text style={styles.logoName}>RedRush</Text>
            </View>
            <Text style={styles.subtitle}>{t('foodDeliveryFast')}</Text>
          </View>
        </View>

        <View style={styles.authPanel}>
          <LanguageToggle style={styles.languageToggle} />

          <View style={styles.modeToggle}>
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
                <View style={styles.inputRow}>
                  <MaterialIcons name="person" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('fullName')}
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                <View style={styles.inputRow}>
                  <MaterialIcons name="phone" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
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
                          <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{item.label}</Text>
                          <Text style={styles.roleDesc}>{item.desc}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={styles.inputRow}>
              <MaterialIcons name="email" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('emailAddress')}
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputRow}>
              <MaterialIcons name="lock" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xxl },
  hero: { height: HERO_HEIGHT, minHeight: 310, position: 'relative', overflow: 'hidden' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroContent: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  logoIcon: { width: 52, height: 52 },
  logoName: { color: Colors.text, fontSize: 28, fontWeight: FontWeight.extrabold, marginLeft: 10 },
  subtitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.regular },
  authPanel: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  languageToggle: { alignSelf: 'center', marginBottom: Spacing.md },
  modeToggle: { flexDirection: 'row', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.lg },
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
