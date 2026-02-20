/**
 * OnboardingScreen - First-time user tutorial
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewToken,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types';
import { useSettingsStore } from '../store';
import { setOnboardingComplete } from '../services/storageService';
import { COLORS } from '../constants';
import { t } from '../i18n';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
  icon: string;
  titleKey: 'onboardingTitle1' | 'onboardingTitle2' | 'onboardingTitle3';
  descKey: 'onboardingDesc1' | 'onboardingDesc2' | 'onboardingDesc3';
  color: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: 'file-excel-outline',
    titleKey: 'onboardingTitle1',
    descKey: 'onboardingDesc1',
    color: COLORS.primary,
  },
  {
    icon: 'account-search-outline',
    titleKey: 'onboardingTitle2',
    descKey: 'onboardingDesc2',
    color: COLORS.secondary,
  },
  {
    icon: 'shield-check-outline',
    titleKey: 'onboardingTitle3',
    descKey: 'onboardingDesc3',
    color: COLORS.success,
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
      <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
        <MaterialCommunityIcons
          name={item.icon as any}
          size={80}
          color={item.color}
        />
      </View>
      <Text variant="headlineMedium" style={styles.slideTitle}>
        {t(item.titleKey, lang)}
      </Text>
      <Text variant="bodyLarge" style={styles.slideDesc}>
        {t(item.descKey, lang)}
      </Text>
    </View>
  );

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.skipContainer}>
        {!isLast && (
          <Button mode="text" onPress={handleComplete} compact>
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

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Next/Get Started */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.nextButton}
          labelStyle={styles.nextButtonLabel}
          contentStyle={styles.nextButtonContent}
        >
          {isLast ? t('getStarted', lang) : t('next', lang)}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDesc: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 28,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  nextButton: {
    borderRadius: 12,
    elevation: 4,
  },
  nextButtonLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  nextButtonContent: {
    paddingVertical: 8,
  },
});
