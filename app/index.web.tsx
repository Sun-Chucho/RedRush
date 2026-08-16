import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing, createThemedStyles } from '@/constants/theme';

const LANDING_LINKS = [
  { label: 'Privacy', href: '/privacy-policy' },
  { label: 'Terms', href: '/terms-of-service' },
  { label: 'Account deletion', href: '/account-deletion' },
  { label: 'Support', href: '/support' },
] as const;

/**
 * Web landing page. This is the marketing entry for the web build only —
 * the native apps have their own welcome screen (app/index.tsx +
 * app/index.android.tsx via the AppWelcome component). It is fully responsive:
 * one real landing page that reflows for phone, tablet, and desktop widths.
 */
export default function WebEntry() {
  const router = useRouter();
  const [width, setWidth] = useState(() => Dimensions.get('window').width);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWidth(window.width));
    return () => sub?.remove();
  }, []);

  const isNarrow = width < 720;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.hero, isNarrow && styles.heroNarrow]}>
        <Image source={require('@/assets/images/hero.jpeg')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.heroShade} />

        <View style={styles.nav}>
          <Text style={styles.brandText}>RedRush</Text>
          {!isNarrow && (
            <View style={styles.navLinks}>
              {LANDING_LINKS.map(link => (
                <TouchableOpacity key={link.href} onPress={() => router.push(link.href)}>
                  <Text style={styles.navLink}>{link.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.heroCopy}>
          <Text style={[styles.title, isNarrow && styles.titleNarrow]}>
            Fast local food delivery
          </Text>
          <Text style={styles.subtitle}>
            RedRush connects customers, restaurants, and riders with live order tracking and accurate shop locations.
          </Text>

          <View style={[styles.actions, isNarrow && styles.actionsNarrow]}>
            <TouchableOpacity
              style={[styles.primaryButton, isNarrow && styles.buttonFull]}
              onPress={() => router.replace('/auth')}
              activeOpacity={0.86}
            >
              <Text style={styles.primaryButtonText}>Enter RedRush</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, isNarrow && styles.buttonFull]}
              onPress={() => router.push('/privacy-policy')}
              activeOpacity={0.86}
            >
              <Text style={styles.secondaryButtonText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Built for real delivery operations</Text>
        <View style={styles.featureGrid}>
          <Feature title="Location accuracy" body="Restaurants save their live device GPS pin, and stores without reliable coordinates stay out of customer discovery." />
          <Feature title="Order tracking" body="Customers, vendors, riders, and admins see live order states with rider location when available." />
          <Feature title="Ready for launch" body="Public privacy, terms, support, and account deletion pages are available from the landing page." />
        </View>
      </View>

      {/* Footer — legal links always reachable, including on narrow screens
          where they are hidden from the top nav. */}
      <View style={styles.footer}>
        <View style={styles.footerLinks}>
          {LANDING_LINKS.map(link => (
            <TouchableOpacity key={link.href} onPress={() => router.push(link.href)}>
              <Text style={styles.footerLink}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.footerCopy}>© {new Date().getFullYear()} RedRush</Text>
      </View>
    </ScrollView>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{body}</Text>
    </View>
  );
}

const styles = createThemedStyles(() => ({
  screen: {
    backgroundColor: '#120D0D',
    flex: 1,
  },
  content: {
    minHeight: '100%',
  },
  hero: {
    minHeight: 640,
    overflow: 'hidden',
    paddingBottom: 84,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    position: 'relative',
  },
  heroNarrow: {
    minHeight: 560,
    paddingHorizontal: Spacing.lg,
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,13,13,0.62)',
  },
  nav: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
    marginHorizontal: 'auto',
    maxWidth: 1120,
    width: '100%',
    zIndex: 1,
  },
  brandText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
  },
  navLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'flex-end',
  },
  navLink: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  heroCopy: {
    justifyContent: 'center',
    marginHorizontal: 'auto',
    maxWidth: 1120,
    minHeight: 460,
    width: '100%',
    zIndex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 68,
    fontWeight: FontWeight.extrabold,
    maxWidth: 720,
  },
  titleNarrow: {
    fontSize: 40,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: FontSize.lg,
    lineHeight: 30,
    marginTop: Spacing.md,
    maxWidth: 620,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  actionsNarrow: {
    flexDirection: 'column',
  },
  buttonFull: {
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    minWidth: 180,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.58)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minWidth: 180,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  section: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 56,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    marginHorizontal: 'auto',
    maxWidth: 1120,
    width: '100%',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginHorizontal: 'auto',
    marginTop: Spacing.lg,
    maxWidth: 1120,
    width: '100%',
  },
  feature: {
    backgroundColor: Colors.surfaceCard,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    flexBasis: 300,
    flexGrow: 1,
    padding: Spacing.lg,
  },
  featureTitle: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  featureBody: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: '#120D0D',
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 40,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    justifyContent: 'center',
  },
  footerLink: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  footerCopy: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
}));
