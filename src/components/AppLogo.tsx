/**
 * AppLogo - Uses the actual college logo image from assets
 *
 * Displays the St. Aloysius College logo with optional text.
 * Supports multiple sizes and dark mode.
 */

import React from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS, SHADOWS } from '../constants';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  isDark?: boolean;
}

const SIZES = {
  sm: { container: 40, fontSize: 13, subFontSize: 7, spacing: 4 },
  md: { container: 56, fontSize: 16, subFontSize: 9, spacing: 6 },
  lg: { container: 80, fontSize: 22, subFontSize: 11, spacing: 8 },
  xl: { container: 120, fontSize: 30, subFontSize: 13, spacing: 12 },
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoImage = require('../../assets/logo.png');

export function AppLogo({ size = 'lg', showText = true, isDark = false }: AppLogoProps) {
  const s = SIZES[size];
  const borderRadius = s.container * 0.24;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.logoShadow,
          {
            width: s.container,
            height: s.container,
            borderRadius,
          },
        ]}
      >
        <Image
          source={logoImage}
          style={{
            width: s.container,
            height: s.container,
            borderRadius,
          }}
          resizeMode="cover"
        />
      </View>

      {showText && (
        <View style={[styles.textContainer, { marginTop: s.spacing }]}>
          <Text
            style={[
              styles.logoTitle,
              {
                fontSize: s.fontSize,
                color: isDark ? '#FFFFFF' : COLORS.text,
              },
            ]}
          >
            Smart
            <Text style={{ color: COLORS.primaryLight }}> Contacts</Text>
          </Text>
          <Text
            style={[
              styles.logoSubtitle,
              {
                fontSize: s.subFontSize,
                color: isDark ? 'rgba(255,255,255,0.5)' : COLORS.textSecondary,
              },
            ]}
          >
            IMPORT & EXPORT
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  logoShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  textContainer: {
    alignItems: 'center',
  },
  logoTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 2,
  },
});
