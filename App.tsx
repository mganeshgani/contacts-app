/**
 * Smart Contacts: Import & Export Excel/CSV - App Entry Point
 *
 * Production-ready React Native (Expo) app for importing,
 * exporting, and managing contacts from Excel/CSV/VCF files.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StatusBar, LogBox, Animated, Easing } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';

import { AppNavigator } from './src/navigation';
import { ErrorBoundary, SplashLoader } from './src/components';
import { useSettingsStore } from './src/store';
import { COLORS } from './src/constants';
import { isOnboardingComplete } from './src/services';

// Suppress specific known safe warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Custom Paper themes */
const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.primaryLight,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
    onPrimary: '#FFFFFF',
    onBackground: COLORS.text,
    onSurface: COLORS.text,
  },
};

const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.primaryLight,
    secondary: COLORS.primary,
    background: COLORS.backgroundDark,
    surface: COLORS.surfaceDark,
    error: COLORS.error,
    onPrimary: '#000000',
    onBackground: COLORS.textDark,
    onSurface: COLORS.textDark,
  },
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const settings = useSettingsStore((s) => s.settings);
  const isDark = settings?.darkMode ?? false;
  const loadSettingsFn = useSettingsStore((s) => s.loadSettings);

  const MIN_SPLASH_MS = 3200; // total animated splash screen duration

  // Step 1: Hide native splash screen ASAP so our animated SplashLoader is visible
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync()
        .catch(() => {})
        .finally(() => setNativeSplashHidden(true));
    }, 150); // small delay to let SplashLoader mount and start animations
    return () => clearTimeout(timer);
  }, []);

  // Step 2: Initialize app in background while SplashLoader plays
  const initialize = useCallback(async () => {
    const startTime = Date.now();
    try {
      // Load persisted settings
      await loadSettingsFn();

      // Check onboarding status
      const onboardingDone = await isOnboardingComplete();
      if (onboardingDone) {
        useSettingsStore.getState().updateSettings({ showOnboarding: false });
      }
    } catch (error) {
      console.warn('Initialization error:', error);
    } finally {
      // Wait for the minimum splash duration
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, remaining));
      }
      setIsReady(true);
    }
  }, [loadSettingsFn]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Step 3: Once app is ready AND native splash is hidden, fade out SplashLoader
  useEffect(() => {
    if (isReady && nativeSplashHidden) {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }
  }, [isReady, nativeSplashHidden]);

  if (!isReady || showSplash) {
    const paperTheme = isDark ? paperDarkTheme : paperLightTheme;
    return (
      <PaperProvider theme={paperTheme}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <Animated.View style={{ flex: 1, opacity: splashOpacity }}>
          <SplashLoader />
        </Animated.View>
      </PaperProvider>
    );
  }

  const paperTheme = isDark ? paperDarkTheme : paperLightTheme;

  return (
    <ErrorBoundary>
      <PaperProvider theme={paperTheme}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? COLORS.backgroundDark : COLORS.background}
        />
        <AppNavigator />
        <Toast
          position="bottom"
          bottomOffset={80}
          visibilityTime={3000}
        />
      </PaperProvider>
    </ErrorBoundary>
  );
}
