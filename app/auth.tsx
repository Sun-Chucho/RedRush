import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { UserRole } from '@/constants/mockData';

const ROLES: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: 'customer', label: 'Customer', icon: 'person', desc: 'Order food & track delivery' },
  { value: 'vendor', label: 'Restaurant', icon: 'restaurant', desc: 'Manage your restaurant' },
  { value: 'rider', label: 'Rider', icon: 'delivery-dining', desc: 'Earn by delivering' },
  { value: 'admin', label: 'Admin', icon: 'admin-panel-settings', desc: 'Manage the platform' },
];

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('123456');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, register } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();

  const handleSubmit = async () => {
    if (!email || !password) {
      showAlert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password, selectedRole);
      } else {
        if (!name || !phone) {
          showAlert('Missing Fields', 'Please fill in all required fields.');
          setLoading(false);
          return;
        }
        await register({ name, email, phone, password, role: selectedRole });
      }
      router.replace('/');
    } catch (e) {
      showAlert('Error', 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoText}>R</Text>
            </View>
            <Text style={styles.logoName}>RedRush</Text>
          </View>
          <Text style={styles.subtitle}>Food delivery made fast</Text>
        </View>

        {/* Mock Login Tag */}
        <View style={styles.mockTag}>
          <MaterialIcons name="info" size={14} color={Colors.warning} />
          <Text style={styles.mockText}> MOCK LOGIN — test@example.com / 123456</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          {(['login', 'register'] as const).map(m => (
            <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]} onPress={() => setMode(m)}>
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Role Selection */}
        <Text style={styles.sectionLabel}>Login as</Text>
        <View style={styles.rolesGrid}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleCard, selectedRole === r.value && styles.roleCardActive]}
              onPress={() => setSelectedRole(r.value)}
            >
              <MaterialIcons name={r.icon as any} size={26} color={selectedRole === r.value ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.roleLabel, selectedRole === r.value && styles.roleLabelActive]}>{r.label}</Text>
              <Text style={styles.roleDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'register' && (
            <>
              <View style={styles.inputRow}>
                <MaterialIcons name="person" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <View style={styles.inputRow}>
                <MaterialIcons name="phone" size={20} color={Colors.textMuted} style={styles.inputIcon} />
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
          )}
          <View style={styles.inputRow}>
            <MaterialIcons name="email" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
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
              placeholder="Password"
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

        {/* Submit */}
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <Text style={styles.submitBtnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
          )}
        </TouchableOpacity>

        {/* Social */}
        <Text style={styles.orText}>or continue with</Text>
        <View style={styles.socialRow}>
          {['Google', 'Apple'].map(s => (
            <TouchableOpacity key={s} style={styles.socialBtn} onPress={() => showAlert('Coming Soon', `${s} login will be available in the next release.`)}>
              <MaterialIcons name={s === 'Google' ? 'g-mobiledata' : 'apple'} size={22} color={Colors.text} />
              <Text style={styles.socialText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* OTP */}
        <TouchableOpacity style={styles.otpBtn} onPress={() => showAlert('OTP Verification', 'An OTP has been sent to your phone number. (mocked)')}>
          <MaterialIcons name="sms" size={16} color={Colors.primary} />
          <Text style={styles.otpText}>  Verify with OTP instead</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  header: { alignItems: 'center', paddingVertical: Spacing.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  logoIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  logoText: { color: Colors.text, fontSize: 24, fontWeight: FontWeight.extrabold },
  logoName: { color: Colors.text, fontSize: 28, fontWeight: FontWeight.extrabold, marginLeft: 10 },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.body, fontWeight: FontWeight.regular },
  mockTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  mockText: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  modeToggle: { flexDirection: 'row', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: 4, marginBottom: Spacing.lg },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { color: Colors.textMuted, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  modeBtnTextActive: { color: Colors.text },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  roleCard: { width: '47%', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
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
  orText: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.sm, marginVertical: Spacing.md },
  socialRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, height: 48, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  socialText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  otpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm },
  otpText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
