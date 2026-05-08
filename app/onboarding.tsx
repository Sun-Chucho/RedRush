import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Platform, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKey } from '@/contexts/LanguageContext';

const slides: { id: number; image: number; titleKey: TranslationKey; subtitleKey: TranslationKey }[] = [
  {
    id: 1,
    image: require('@/assets/images/onboarding-1.png'),
    titleKey: 'orderFood',
    subtitleKey: 'startOrdering',
  },
  {
    id: 2,
    image: require('@/assets/images/onboarding-2.png'),
    titleKey: 'topRestaurants',
    subtitleKey: 'browseMenus',
  },
  {
    id: 3,
    image: require('@/assets/images/onboarding-3.png'),
    titleKey: 'realTimeTracking',
    subtitleKey: 'supportingOnboarding',
  },
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { t } = useLanguage();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

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
      >
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width: screenWidth, height: screenHeight }]}>
            <View style={styles.imageStage}>
              <Image source={slide.image} style={styles.slideImage} contentFit="contain" />
            </View>
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
  logoName: { color: Colors.text, fontSize: 22, fontWeight: FontWeight.bold, marginLeft: 8 },
  skipBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 66 : 46,
    right: 92, zIndex: 10,
  },
  languageToggle: { position: 'absolute', top: Platform.OS === 'ios' ? 58 : 38, right: Spacing.md, zIndex: 10 },
  skipText: { color: Colors.textSecondary, fontSize: FontSize.body, fontWeight: FontWeight.medium },
  slider: { flex: 1 },
  slide: { position: 'relative', backgroundColor: Colors.background },
  imageStage: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 112 : 92,
    left: 0,
    right: 0,
    bottom: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  slideImage: { width: '100%', height: '100%' },
  slideContent: {
    position: 'absolute',
    bottom: 142,
    left: Spacing.xl,
    right: Spacing.xl,
    minHeight: 124,
    justifyContent: 'flex-end',
  },
  slideTitle: {
    color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold,
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
    paddingVertical: 16, paddingHorizontal: 60, width: '100%', alignItems: 'center',
  },
  nextBtnText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
});
