import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { UserRole } from '@/constants/mockData';

const ROLES: { value: UserRole; label: string; icon: keyof typeof MaterialIcons.glyphMap; desc: string }[] = [
  { value: 'customer', label: 'Customer', icon: 'person', desc: 'Order food & track delivery' },
  { value: 'vendor', label: 'Restaurant / Vendor', icon: 'restaurant', desc: 'Manage your restaurant & orders' },
  { value: 'rider', label: 'Delivery Rider', icon: 'delivery-dining', desc: 'Earn by delivering food' },
  { value: 'admin', label: 'Platform Admin', icon: 'admin-panel-settings', desc: 'Manage the entire platform' },
];

function RoleDropdown({
  value,
  onChange,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = ROLES.find(r => r.value === value)!;

  return (
    <>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <View style={styles.dropdownLeft}>
          <View style={styles.dropdownIconBox}>
            <MaterialIcons name={selected.icon} size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.dropdownLabel}>{selected.label}</Text>
            <Text style={styles.dropdownDesc}>{selected.desc}</Text>
          </View>
        </View>
        <MaterialIcons name="keyboard-arrow-down" size={22} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Who are you?</Text>
            {ROLES.map(role => (
              <TouchableOpacity
                key={role.value}
                style={[styles.sheetOption, value === role.value && styles.sheetOptionActive]}
                onPress={() => { onChange(role.value); setOpen(false); }}
                activeOpacity={0.8}
              >
                <View style={[styles.sheetIconBox, { backgroundColor: value === role.value ? Colors.primary : Colors.surfaceElevated }]}>
                  <MaterialIcons name={role.icon} size={22} color={value === role.value ? Colors.text : Colors.textSecondary} />
                </View>
                <View style={styles.sheetOptionInfo}>
                  <Text style={[styles.sheetOptionLabel, value === role.value && { color: Colors.primary }]}>{role.label}</Text>
                  <Text style={styles.sheetOptionDesc}>{role.desc}</Text>
                </View>
                {value === role.value ? (
                  <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, register, loginWithGoogle, loginWithApple } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      showAlert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password, selectedRole);
      } else {
        if (!name.trim() || !phone.trim()) {
          showAlert('Missing Fields', 'Please fill in your name and phone number.');
          setLoading(false);
          return;
        }
        await register({ name, email, phone, password, role: selectedRole });
      }
      router.replace('/');
    } catch (e) {
      showAlert('Authentication Failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle(selectedRole);
      router.replace('/');
    } catch (e) {
      showAlert('Google Sign-In', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setLoading(true);
    try {
      await loginWithApple(selectedRole);
      router.replace('/');
    } catch (e) {
      showAlert('Apple Sign-In', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoArea}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.appName}>RedRush</Text>
          <Text style={styles.tagline}>Fast food. Fast delivery.</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
            onPress={() => setMode('register')}
          >
            <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Role Picker */}
        <Text style={styles.fieldLabel}>I AM A</Text>
        <RoleDropdown value={selectedRole} onChange={setSelectedRole} />

        {/* Form Fields */}
        <View style={styles.form}>
          {mode === 'register' ? (
            <>
              <View style={styles.inputWrap}>
                <MaterialIcons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.inputWrap}>
                <MaterialIcons name="phone" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          ) : null}

          <View style={styles.inputWrap}>
            <MaterialIcons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputWrap}>
            <MaterialIcons name="lock-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
              <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {mode === 'login' ? (
          <TouchableOpacity style={styles.forgotRow} onPress={() => showAlert('Reset Password', 'Enter your email above and check your inbox for a reset link.')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text} size="small" />
          ) : (
            <Text style={styles.submitText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} onPress={handleGoogle} disabled={loading}>
            <MaterialIcons name="g-mobiledata" size={24} color={Colors.text} />
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} onPress={handleApple} disabled={loading}>
            <MaterialIcons name="apple" size={22} color={Colors.text} />
            <Text style={styles.socialText}>Apple</Text>
          </TouchableOpacity>
        </View>

        {/* OTP */}
        <TouchableOpacity
          style={styles.otpBtn}
          onPress={() => showAlert('OTP Verification', 'Phone OTP requires Firebase phone auth + reCAPTCHA configured for release builds.')}
        >
          <MaterialIcons name="sms" size={16} color={Colors.primary} />
          <Text style={styles.otpText}>Sign in with OTP instead</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: 60 },

  logoArea: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { width: 64, height: 64, marginBottom: Spacing.sm },
  appName: { color: Colors.text, fontSize: 30, fontWeight: FontWeight.extrabold, letterSpacing: -0.5 },
  tagline: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4 },

  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm - 2 },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { color: Colors.textMuted, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  toggleTextActive: { color: Colors.text },

  fieldLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  dropdownLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dropdownIconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(204,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownLabel: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  dropdownDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetOptionActive: {},
  sheetIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionInfo: { flex: 1 },
  sheetOptionLabel: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  sheetOptionDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },

  form: { gap: Spacing.sm, marginBottom: Spacing.sm },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, color: Colors.text, fontSize: FontSize.body },
  eyeBtn: { padding: 4 },

  forgotRow: { alignItems: 'flex-end', marginBottom: Spacing.md },
  forgotText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.lg,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: FontSize.xs },

  socialRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.md,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  socialText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  otpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm },
  otpText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
