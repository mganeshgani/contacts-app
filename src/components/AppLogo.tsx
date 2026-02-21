/**
 * AppLogo - SEO-optimized logo component
 *
 * Visual: spreadsheet table grid + contact person icon + green Excel badge
 * Instantly communicates: "Excel/CSV + Contacts" to users.
 * Supports multiple sizes and dark mode.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  isDark?: boolean;
}

const SIZES = {
  sm: { container: 40, mainIcon: 22, gridIcon: 16, badgeSize: 16, badgeIcon: 10, fontSize: 13, subFontSize: 7, spacing: 4 },
  md: { container: 56, mainIcon: 30, gridIcon: 20, badgeSize: 20, badgeIcon: 12, fontSize: 16, subFontSize: 9, spacing: 6 },
  lg: { container: 80, mainIcon: 42, gridIcon: 28, badgeSize: 26, badgeIcon: 16, fontSize: 22, subFontSize: 11, spacing: 8 },
  xl: { container: 120, mainIcon: 56, gridIcon: 38, badgeSize: 34, badgeIcon: 20, fontSize: 30, subFontSize: 13, spacing: 12 },
};

export function AppLogo({ size = 'lg', showText = true, isDark = false }: AppLogoProps) {
  const s = SIZES[size];
  const borderRadius = s.container * 0.26;

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
          {/* Glass highlight */}
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

          {/* Icon cluster: grid table + person + Excel badge */}
          <View style={styles.iconCluster}>
            {/* Background: spreadsheet table grid */}
            <MaterialCommunityIcons
              name="table"
              size={s.gridIcon}
              color="rgba(255,255,255,0.3)"
              style={{
                position: 'absolute',
                top: -s.mainIcon * 0.14,
                left: -s.mainIcon * 0.20,
              }}
            />
            {/* Foreground: contact person */}
            <MaterialCommunityIcons
              name="account-box"
              size={s.mainIcon}
              color="#FFFFFF"
            />
            {/* Excel badge (green accent) */}
            <View
              style={[
                styles.excelBadge,
                {
                  width: s.badgeSize,
                  height: s.badgeSize,
                  borderRadius: s.badgeSize / 2,
                  bottom: -s.badgeSize * 0.2,
                  right: -s.badgeSize * 0.3,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="microsoft-excel"
                size={s.badgeIcon}
                color="#22C55E"
              />
            </View>
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
            Smart
            <Text style={{ color: COLORS.primaryLight }}> Contacts</Text>
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
  excelBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
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
