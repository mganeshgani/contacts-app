/**
 * AppLogo - Premium app logo component with gradient and animation
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '../constants';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  isDark?: boolean;
}

const SIZES = {
  sm: { container: 40, icon: 20, fontSize: 14, subFontSize: 8, spacing: 4 },
  md: { container: 56, icon: 28, fontSize: 18, subFontSize: 10, spacing: 6 },
  lg: { container: 80, icon: 40, fontSize: 24, subFontSize: 12, spacing: 8 },
  xl: { container: 120, icon: 56, fontSize: 32, subFontSize: 14, spacing: 12 },
};

export function AppLogo({ size = 'lg', showText = true, isDark = false }: AppLogoProps) {
  const s = SIZES[size];
  const borderRadius = s.container * 0.28;

  return (
    <View style={styles.wrapper}>
      <View style={[SHADOWS.xl, { borderRadius }]}>
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.logoContainer,
            {
              width: s.container,
              height: s.container,
              borderRadius,
            },
          ]}
        >
          {/* Glass accent */}
          <View
            style={[
              styles.glassOverlay,
              {
                width: s.container * 0.7,
                height: s.container * 0.35,
                borderRadius: s.container * 0.2,
              },
            ]}
          />

          {/* Icon cluster */}
          <View style={styles.iconCluster}>
            <MaterialCommunityIcons
              name="file-excel"
              size={s.icon * 0.65}
              color="rgba(255,255,255,0.4)"
              style={{
                position: 'absolute',
                top: -s.icon * 0.12,
                left: -s.icon * 0.18,
              }}
            />
            <MaterialCommunityIcons
              name="contacts"
              size={s.icon}
              color="#FFFFFF"
            />
          </View>
        </LinearGradient>
      </View>

      {showText && (
        <View style={[styles.textContainer, { marginTop: s.spacing }]}>
          <Text
            style={[
              styles.logoTitle,
              {
                fontSize: s.fontSize,
                color: isDark ? COLORS.textDark : COLORS.text,
              },
            ]}
          >
            Excel
            <Text style={{ color: COLORS.primaryLight }}>Contact</Text>
          </Text>
          <Text
            style={[
              styles.logoSubtitle,
              {
                fontSize: s.subFontSize,
                color: isDark ? COLORS.textSecondaryDark : COLORS.textSecondary,
              },
            ]}
          >
            IMPORTER
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
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  glassOverlay: {
    position: 'absolute',
    top: -2,
    left: -2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '-15deg' }],
  },
  iconCluster: {
    justifyContent: 'center',
    alignItems: 'center',
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
    letterSpacing: 4,
    marginTop: 2,
  },
});
