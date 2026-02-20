/**
 * ExcelContactImporter - App Entry Point
 *
 * Production-ready React Native (Expo) app for importing
 * Excel/CSV contacts to the device phone book.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, LogBox, useColorScheme } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';

import { AppNavigator } from './src/navigation';
import { ErrorBoundary } from './src/components';
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
  const settings = useSettingsStore((s) => s.settings);
  const isDark = settings?.darkMode ?? false;
  const loadSettingsFn = useSettingsStore((s) => s.loadSettings);

  const initialize = useCallback(async () => {
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
      setIsReady(true);
    }
  }, [loadSettingsFn]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  if (!isReady) {
    return null;
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
