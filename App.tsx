/**
 * ExcelContactImporter - App Entry Point
 *
 * Production-ready React Native (Expo) app for importing
 * Excel/CSV contacts to the device phone book.
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
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const settings = useSettingsStore((s) => s.settings);
  const isDark = settings?.darkMode ?? false;
  const loadSettingsFn = useSettingsStore((s) => s.loadSettings);

  const MIN_SPLASH_MS = 3000; // show splash for at least 3 seconds

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

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
      // Fade out splash over 500ms, then unmount it
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }
  }, [isReady]);

  if (!isReady || showSplash) {
    const paperTheme = isDark ? paperDarkTheme : paperLightTheme;
    return (
      <PaperProvider theme={paperTheme}>
        <Animated.View style={{ flex: 1, opacity: splashOpacity }}>
          <SplashLoader />
        </Animated.View>
        {isReady && (
          <StatusBar
            barStyle="light-content"
            backgroundColor="transparent"
            translucent
          />
        )}
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
