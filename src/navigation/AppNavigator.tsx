/**
 * Navigation configuration - Bottom tabs + Stack navigator
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { RootStackParamList, RootTabParamList } from '../types';
import { useSettingsStore } from '../store';
import { COLORS } from '../constants';
import { t } from '../i18n';

import {
  HomeScreen,
  PreviewScreen,
  HistoryScreen,
  SettingsScreen,
  ImportProgressScreen,
  ImportSummaryScreen,
  OnboardingScreen,
} from '../screens';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
  },
};

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primaryLight,
    background: COLORS.backgroundDark,
    card: COLORS.surfaceDark,
    text: COLORS.textDark,
    border: COLORS.borderDark,
  },
};

function MainTabs() {
  const settings = useSettingsStore((s) => s.settings);
  const lang = settings?.language ?? 'en';
  const isDark = settings?.darkMode ?? false;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: isDark ? COLORS.textSecondaryDark : COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: isDark ? COLORS.surfaceDark : COLORS.surface,
          borderTopColor: isDark ? COLORS.borderDark : COLORS.border,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('home', lang),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
          tabBarAccessibilityLabel: t('home', lang),
        }}
      />
      <Tab.Screen
        name="Preview"
        component={PreviewScreen}
        options={{
          tabBarLabel: t('preview', lang),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="table-eye" color={color} size={size} />
          ),
          tabBarAccessibilityLabel: t('preview', lang),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: t('history', lang),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" color={color} size={size} />
          ),
          tabBarAccessibilityLabel: t('history', lang),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings', lang),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
          tabBarAccessibilityLabel: t('settings', lang),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const settings = useSettingsStore((s) => s.settings);
  const isDark = settings?.darkMode ?? false;
  const showOnboarding = settings?.showOnboarding ?? false;

  return (
    <NavigationContainer theme={isDark ? AppDarkTheme : LightTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
        initialRouteName={showOnboarding ? 'Onboarding' : 'MainTabs'}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="ImportProgress"
          component={ImportProgressScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="ImportSummary" component={ImportSummaryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
