/**
 * Smart Contacts: Import & Export Excel/CSV - App Entry Point
 *
 * Production-ready React Native (Expo) app for importing,
 * exporting, and managing contacts from Excel/CSV/VCF files.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StatusBar, LogBox, Animated, Easing, StyleSheet, Platform } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
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
  const [splashMounted, setSplashMounted] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const settings = useSettingsStore((s) => s.settings);
  const isSettingsLoaded = useSettingsStore((s) => s.isLoaded);
  const isDark = settings?.darkMode ?? false;
  const loadSettingsFn = useSettingsStore((s) => s.loadSettings);

  const MIN_SPLASH_MS = 3200; // total animated splash screen duration

  // Step 1: Mark splash as mounted on first render, then hide native splash
  useEffect(() => {
    // Use requestAnimationFrame to ensure our SplashLoader has painted before
    // hiding the native splash screen — prevents blank/white flash
    const raf = requestAnimationFrame(() => {
      setSplashMounted(true);
      SplashScreen.hideAsync().catch(() => {});
    });
    return () => cancelAnimationFrame(raf);
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

  // Step 3: Once app is ready AND settings loaded, fade out SplashLoader
  useEffect(() => {
    if (isReady && splashMounted && isSettingsLoaded) {
      // Small extra delay to let the navigator mount behind the splash
      const timer = setTimeout(() => {
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => setShowSplash(false));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isReady, splashMounted, isSettingsLoaded]);

  // Configure Android system navigation bar button style (light/dark).
  // In SDK 54 with edge-to-edge enforced, setPositionAsync and
  // setBackgroundColorAsync are no-ops, so we only set button style.
  // The actual overlap prevention is handled by dynamic insets.bottom
  // in the tab bar (see AppNavigator).
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync(
        isDark ? 'light' : 'dark'
      ).catch(() => {});
    }
  }, [isDark]);

  const paperTheme = isDark ? paperDarkTheme : paperLightTheme;

  // Always render both splash + navigator together so the navigator has time
  // to mount behind the splash overlay — prevents "Something went wrong" flash
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <ErrorBoundary>
      <PaperProvider theme={paperTheme}>
        <StatusBar
          barStyle={showSplash ? 'light-content' : isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />

        {/* Main app renders underneath the splash overlay */}
        {isReady && isSettingsLoaded && <AppNavigator />}
        {isReady && isSettingsLoaded && (
          <Toast position="bottom" bottomOffset={80} visibilityTime={3000} />
        )}

        {/* Splash overlay on top — fades out when ready */}
        {showSplash && (
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: splashOpacity,
              zIndex: 999,
            }}
            pointerEvents={isReady ? 'none' : 'auto'}
          >
            <SplashLoader />
          </Animated.View>
        )}
      </PaperProvider>
    </ErrorBoundary>
    </SafeAreaProvider>
  );
}
