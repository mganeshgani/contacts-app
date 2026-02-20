/**
 * OnboardingScreen - Premium first-time user tutorial
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewToken,
  Animated,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types';
import { useSettingsStore } from '../store';
import { setOnboardingComplete } from '../services/storageService';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { t } from '../i18n';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  icon: string;
  titleKey: 'onboardingTitle1' | 'onboardingTitle2' | 'onboardingTitle3';
  descKey: 'onboardingDesc1' | 'onboardingDesc2' | 'onboardingDesc3';
  gradient: readonly [string, string];
  accentIcon: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: 'file-excel-outline',
    titleKey: 'onboardingTitle1',
    descKey: 'onboardingDesc1',
    gradient: COLORS.gradientPrimary,
    accentIcon: 'file-upload',
  },
  {
    icon: 'account-search-outline',
    titleKey: 'onboardingTitle2',
    descKey: 'onboardingDesc2',
    gradient: COLORS.gradientSecondary,
    accentIcon: 'shield-check',
  },
  {
    icon: 'shield-check-outline',
    titleKey: 'onboardingTitle3',
    descKey: 'onboardingDesc3',
    gradient: COLORS.gradientSuccess,
    accentIcon: 'rocket-launch',
  },
];

export function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const lang = useSettingsStore((s) => s.settings.language);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleComplete = useCallback(async () => {
    await setOnboardingComplete();
    await updateSettings({ showOnboarding: false });
    navigation.replace('MainTabs');
  }, [navigation, updateSettings]);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      handleComplete();
    }
  }, [activeIndex, handleComplete]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = {
    viewAreaCoveragePercentThreshold: 50,
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.iconSection}>
        <LinearGradient
          colors={[...item.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          {/* Glass overlay */}
          <View style={styles.iconGlass} />
          <MaterialCommunityIcons
            name={item.icon as any}
            size={64}
            color="#FFFFFF"
          />
        </LinearGradient>
        {/* Floating accent icon */}
        <View style={styles.floatingAccent}>
          <MaterialCommunityIcons
            name={item.accentIcon as any}
            size={20}
            color={item.gradient[0]}
          />
        </View>
      </View>
      <Text style={styles.slideTitle}>
        {t(item.titleKey, lang)}
      </Text>
      <Text style={styles.slideDesc}>
        {t(item.descKey, lang)}
      </Text>
    </View>
  );

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F0F4FF']}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.skipContainer}>
        {!isLast && (
          <Button
            mode="text"
            onPress={handleComplete}
            compact
            textColor={COLORS.textSecondary}
          >
            Skip
          </Button>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Premium Dots */}
      <View style={styles.dots}>
        {SLIDES.map((slide, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex && [
                styles.dotActive,
                { backgroundColor: slide.gradient[0] },
              ],
            ]}
          />
        ))}
      </View>

      {/* Premium Button */}
      <View style={styles.buttonContainer}>
        <LinearGradient
          colors={[...SLIDES[activeIndex].gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Button
            mode="text"
            onPress={handleNext}
            labelStyle={styles.nextButtonLabel}
            contentStyle={styles.nextButtonContent}
            textColor="#FFFFFF"
            icon={isLast ? 'rocket-launch' : 'arrow-right'}
          >
            {isLast ? t('getStarted', lang) : t('next', lang)}
          </Button>
        </LinearGradient>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 40,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconSection: {
    marginBottom: 36,
    position: 'relative',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  iconGlass: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 100,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ rotate: '-15deg' }],
  },
  floatingAccent: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDesc: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 28,
    borderRadius: RADIUS.sm,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  gradientButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  nextButtonLabel: {
    fontWeight: '800',
    fontSize: 16,
  },
  nextButtonContent: {
    paddingVertical: 10,
  },
});
