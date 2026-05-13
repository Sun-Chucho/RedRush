import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Platform, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Href, useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKey } from '@/contexts/LanguageContext';

// Preload all slide images + auth images on module load so they show instantly
const HOME_1 = require('@/home-1.jpeg');
const HOME_2 = require('@/home-2.jpeg');
const HOME_3 = require('@/home-3.jpeg');
// Also prefetch auth images so switching to auth screen is instant
Image.prefetch([require('@/sign-1.jpeg'), require('@/sign-2.jpeg')] as any).catch(() => undefined);

const slides: { id: number; image: number; titleKey: TranslationKey; subtitleKey: TranslationKey }[] = [
  {
    id: 1,
    image: HOME_1,
    titleKey: 'orderFood',
    subtitleKey: 'startOrdering',
  },
  {
    id: 2,
    image: HOME_2,
    titleKey: 'topRestaurants',
    subtitleKey: 'browseMenus',
  },
  {
    id: 3,
    image: HOME_3,
    titleKey: 'realTimeTracking',
    subtitleKey: 'supportingOnboarding',
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { t } = useLanguage();
  const [dims, setDims] = useState(Dimensions.get('window'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDims(window));
    return () => sub?.remove();
  }, []);
  const isWebPhoneShell = Platform.OS === 'web' && dims.width >= 768;
  const screenWidth = Math.max(1, isWebPhoneShell ? 430 : dims.width);
  const screenHeight = Math.max(1, isWebPhoneShell ? Math.max(620, Math.min(860, dims.height - 48)) : dims.height);

  const handleScroll = (event: any) => {
    const index = Math.max(0, Math.min(slides.length - 1, Math.round(event.nativeEvent.contentOffset.x / screenWidth)));
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      scrollRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
    } else {
      router.replace('/auth');
    }
  };

  const slideWidth = screenWidth;
  const slideHeight = screenHeight;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logoIcon} contentFit="contain" />
        <Text style={styles.logoName}>RedRush</Text>
      </View>

      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/auth')}>
        <Text style={styles.skipText}>{t('skip')}</Text>
      </TouchableOpacity>
      <LanguageToggle style={styles.languageToggle} />

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slider}
        contentContainerStyle={{}}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width: slideWidth, height: slideHeight, overflow: 'hidden' }]}>
            <Image source={slide.image} style={styles.slideImageBackdrop} contentFit="cover" blurRadius={22} />
            <Image source={slide.image} style={styles.slideImage} contentFit="cover" />
            <View style={styles.slideShade} />
            <View style={styles.slideContent}>
              <Text style={styles.slideTitle}>{t(slide.titleKey)}</Text>
              <Text style={styles.slideSubtitle}>{t(slide.subtitleKey)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots & Button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {activeIndex === slides.length - 1 ? t('getStarted') : t('next')}
          </Text>
        </TouchableOpacity>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => router.push('/privacy-policy' as Href)}>
            <Text style={styles.privacyText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>|</Text>
          <TouchableOpacity onPress={() => router.push('/terms-of-service' as Href)}>
            <Text style={styles.privacyText}>Terms</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  logoContainer: {
    position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40,
    left: Spacing.md, flexDirection: 'row', alignItems: 'center', zIndex: 10,
  },
  logoIcon: {
    width: 44, height: 44,
  },
  logoName: { color: '#FFFFFF', fontSize: 22, fontWeight: FontWeight.bold, marginLeft: 8 },
  skipBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 66 : 46,
    right: 92, zIndex: 10,
  },
  languageToggle: { position: 'absolute', top: Platform.OS === 'ios' ? 58 : 38, right: Spacing.md, zIndex: 10 },
  skipText: { color: 'rgba(255,255,255,0.82)', fontSize: FontSize.body, fontWeight: FontWeight.medium },
  slider: { flex: 1 },
  slide: { position: 'relative', backgroundColor: Colors.background },
  slideImageBackdrop: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.8, transform: [{ scale: 1.08 }] },
  slideImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  slideShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  slideContent: {
    position: 'absolute',
    bottom: 136,
    left: Spacing.xl,
    right: Spacing.xl,
  },
  slideTitle: {
    color: '#FFFFFF', fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold,
    lineHeight: 38, marginBottom: Spacing.sm,
  },
  slideSubtitle: {
    color: 'rgba(255,255,255,0.8)', fontSize: FontSize.body, lineHeight: 24,
    fontWeight: FontWeight.regular,
  },
  footer: {
    position: 'absolute', bottom: 50, left: Spacing.xl, right: Spacing.xl,
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', marginBottom: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  dotActive: { width: 28, backgroundColor: Colors.primary },
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingVertical: 16, paddingHorizontal: 60, width: '100%', alignItems: 'center', maxWidth: 400,
  },
  nextBtnText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  legalLinks: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  legalDot: { color: Colors.textMuted, fontSize: FontSize.sm },
  privacyText: { color: Colors.textMuted, fontSize: FontSize.sm, textDecorationLine: 'underline' },
});
