import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Href, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const features = [
  { icon: 'restaurant', title: 'Order meals', text: 'Browse restaurants, place cash-on-delivery orders, and track delivery progress.' },
  { icon: 'storefront', title: 'Vendor tools', text: 'Restaurants manage menus, availability, orders, and customer updates.' },
  { icon: 'delivery-dining', title: 'Rider dispatch', text: 'Riders receive delivery work, update status, and manage earnings.' },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { width, height } = useWindowDimensions();
  const isCompact = width < 640;

  const appHref: Href = user?.role === 'customer'
    ? '/(customer)'
    : user?.role === 'vendor'
      ? '/(vendor)'
      : user?.role === 'rider'
        ? '/(rider)'
        : user?.role === 'admin'
          ? '/admin'
          : '/onboarding';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.nav}>
        <View style={styles.brand}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandName}>RedRush</Text>
        </View>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/privacy-policy')}>
          <Text style={styles.navButtonText}>Privacy</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.hero, { height: Math.max(isCompact ? 460 : 520, Math.min(height * 0.72, 680)) }]}>
        <Image source={require('@/assets/images/sign-1.png')} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroShade} />
        <View style={[styles.heroCopy, isCompact && styles.heroCopyCompact]}>
          <Text style={styles.kicker}>Food delivery for customers, vendors, riders, and admins</Text>
          <Text style={styles.title}>RedRush</Text>
          <Text style={styles.subtitle}>A multi-role food ordering and delivery app built for fast local operations.</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push(isAuthenticated ? appHref : '/onboarding')}>
              <Text style={styles.primaryButtonText}>{isAuthenticated ? 'Open app' : 'Get started'}</Text>
              <MaterialIcons name="arrow-forward" size={18} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/auth')}>
              <Text style={styles.secondaryButtonText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        {features.map(item => (
          <View key={item.title} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={Colors.primary} />
            </View>
            <Text style={styles.featureTitle}>{item.title}</Text>
            <Text style={styles.featureText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.links}>
        <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
          <Text style={styles.linkText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
          <Text style={styles.linkText}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/account-deletion')}>
          <Text style={styles.linkText}>Account Deletion</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xl },
  nav: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  brand: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  logo: { height: 40, width: 40 },
  brandName: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  navButton: { borderColor: Colors.border, borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  navButtonText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  hero: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.md,
    justifyContent: 'flex-end',
    marginHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  heroImage: { ...StyleSheet.absoluteFillObject, height: '100%', width: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  heroCopy: { padding: Spacing.xl },
  heroCopyCompact: { padding: Spacing.lg },
  kicker: { color: 'rgba(255,255,255,0.78)', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  title: { color: '#FFFFFF', fontSize: FontSize.hero, fontWeight: FontWeight.extrabold, marginTop: Spacing.sm },
  subtitle: { color: 'rgba(255,255,255,0.86)', fontSize: FontSize.body, lineHeight: 24, marginTop: Spacing.sm, maxWidth: 520 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  primaryButton: { alignItems: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.full, flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  primaryButtonText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.38)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  secondaryButtonText: { color: '#FFFFFF', fontSize: FontSize.body, fontWeight: FontWeight.bold },
  section: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, padding: Spacing.md },
  featureCard: {
    backgroundColor: Colors.surfaceCard,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexBasis: 260,
    flexGrow: 1,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  featureIcon: { alignItems: 'center', backgroundColor: Colors.primary + '18', borderRadius: BorderRadius.md, height: 44, justifyContent: 'center', marginBottom: Spacing.sm, width: 44 },
  featureTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  featureText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.xs },
  links: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  linkText: { color: Colors.textMuted, fontSize: FontSize.sm, textDecorationLine: 'underline' },
});
