import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Dimensions, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageToggle } from '@/components/LanguageToggle';
import { TranslationKey } from '@/contexts/LanguageContext';

const ONBOARDING_KEY = 'redrush_onboarding_seen';

const LOGO = require('@/assets/images/logo.png');
const HOME_1 = require('@/assets/images/home-1.png');
const HOME_2 = require('@/assets/images/home-2.png');
const HOME_3 = require('@/assets/images/home-3.png');

// Prefetch auth images so they load instantly after onboarding
Image.prefetch([
  require('@/assets/images/sign-1.png'),
  require('@/assets/images/sign-2.png'),
] as any).catch(() => undefined);

const slides: { id: number; image: any; titleKey: TranslationKey; subtitleKey: TranslationKey }[] = [
  { id: 1, image: HOME_1, titleKey: 'orderFood', subtitleKey: 'startOrdering' },
  { id: 2, image: HOME_2, titleKey: 'topRestaurants', subtitleKey: 'browseMenus' },
  { id: 3, image: HOME_3, titleKey: 'realTimeTracking', subtitleKey: 'supportingOnboarding' },
];

async function markOnboardingSeen() {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // ignore storage errors
  }
}

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

  const screenWidth = Math.max(1, dims.width);
  const screenHeight = Math.max(1, dims.height);

  const handleScroll = (event: any) => {
    const index = Math.max(
      0,
      Math.min(slides.length - 1, Math.round(event.nativeEvent.contentOffset.x / screenWidth))
    );
    setActiveIndex(index);
  };

  const finish = async () => {
    await markOnboardingSeen();
    router.replace('/auth');
  };

  const handleNext = async () => {
    if (activeIndex < slides.length - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      scrollRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
    } else {
      await finish();
    }
  };

  const handleSkip = async () => {
    await finish();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} translucent />

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image source={LOGO} style={styles.logoIcon} contentFit="contain" />
        <Text style={styles.logoName}>RedRush</Text>
      </View>

      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.75}>
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
      >
        {slides.map(slide => (
          <View key={slide.id} style={[styles.slide, { width: screenWidth, height: screenHeight }]}>
            <Image source={slide.image} style={styles.slideImageBlur} contentFit="cover" blurRadius={20} />
            <Image source={slide.image} style={styles.slideImage} contentFit="cover" />
            <View style={styles.slideShade} />
            <View style={styles.slideContent}>
              <Text style={styles.slideTitle}>{t(slide.titleKey)}</Text>
              <Text style={styles.slideSubtitle}>{t(slide.subtitleKey)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.88}>
          <Text style={styles.nextBtnText}>
            {activeIndex === slides.length - 1 ? t('getStarted') : t('next')}
          </Text>
        </TouchableOpacity>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>|</Text>
          <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
            <Text style={styles.legalLink}>Terms</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  logoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  logoIcon: {
    width: 40,
    height: 40,
  },
  logoName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: FontWeight.bold,
    marginLeft: 8,
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 62 : 50,
    right: 88,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  languageToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 42,
    right: Spacing.md,
    zIndex: 10,
  },
  slider: {
    flex: 1,
  },
  slide: {
    position: 'relative',
    backgroundColor: Colors.background,
  },
  slideImageBlur: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
    transform: [{ scale: 1.08 }],
  },
  slideImage: {
    ...StyleSheet.absoluteFillObject,
  },
  slideShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  slideContent: {
    position: 'absolute',
    bottom: 160,
    left: Spacing.xl,
    right: Spacing.xl,
  },
  slideTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    lineHeight: 38,
    marginBottom: Spacing.sm,
  },
  slideSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: FontSize.body,
    lineHeight: 24,
    fontWeight: FontWeight.regular,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: Colors.primary,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
    paddingHorizontal: 60,
    width: '100%',
    alignItems: 'center',
  },
  nextBtnText: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  legalDot: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  legalLink: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textDecorationLine: 'underline',
  },
});
