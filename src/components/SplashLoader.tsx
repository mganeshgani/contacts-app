/**
 * SplashLoader - Premium animated loading screen (Android-safe)
 *
 * Avoids borderStyle:'dashed' + borderRadius (broken on Android RN).
 * Uses only solid views, opacity, scale & translate animations.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';

const { width: SW, height: SH } = Dimensions.get('window');

/* ── small dots laid out in a circle (replaces broken dashed ring) ── */
const ORBIT_R = 85;
const DOT_COUNT = 24;
const ORBIT_DOTS = Array.from({ length: DOT_COUNT }, (_, i) => {
  const angle = (2 * Math.PI * i) / DOT_COUNT;
  return { x: Math.cos(angle) * ORBIT_R, y: Math.sin(angle) * ORBIT_R };
});

/* ── floating particles ── */
const PARTICLES = [
  { x: SW * 0.12, y: SH * 0.10, r: 5, delay: 0 },
  { x: SW * 0.85, y: SH * 0.15, r: 4, delay: 200 },
  { x: SW * 0.06, y: SH * 0.52, r: 5, delay: 400 },
  { x: SW * 0.92, y: SH * 0.60, r: 6, delay: 100 },
  { x: SW * 0.30, y: SH * 0.82, r: 4, delay: 300 },
  { x: SW * 0.72, y: SH * 0.87, r: 5, delay: 500 },
  { x: SW * 0.50, y: SH * 0.06, r: 4, delay: 250 },
  { x: SW * 0.22, y: SH * 0.70, r: 3, delay: 350 },
];

export function SplashLoader() {
  /* ── Animation values ── */
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  const ringRotate = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  const glowScale = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(40)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(20)).current;

  const progressWidth = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;

  const tagFade = useRef(new Animated.Value(0)).current;

  const shimmer = useRef(new Animated.Value(-1)).current;
  const circleScale = useRef(new Animated.Value(0.3)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;

  const particleAnims = useRef(
    PARTICLES.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Phase 1: Logo entrance (spring in + slight rotation)
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse (loop)
    Animated.timing(glowOpacity, {
      toValue: 1,
      duration: 600,
      delay: 200,
      useNativeDriver: true,
    }).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowScale, {
            toValue: 1.5,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 0.6,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Phase 2: Orbit ring fade in + continuous rotation
    Animated.timing(ringOpacity, {
      toValue: 1,
      duration: 500,
      delay: 400,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Phase 3: Title stagger
    Animated.stagger(180, [
      Animated.parallel([
        Animated.timing(titleFade, { toValue: 1, duration: 600, delay: 600, useNativeDriver: true }),
        Animated.timing(titleSlide, { toValue: 0, duration: 600, delay: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(subtitleSlide, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    // Phase 4: Progress bar
    Animated.timing(progressOpacity, { toValue: 1, duration: 400, delay: 1000, useNativeDriver: false }).start();
    Animated.timing(progressWidth, { toValue: 1, duration: 2200, delay: 1100, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start();

    // Phase 5: Tagline
    Animated.timing(tagFade, { toValue: 1, duration: 600, delay: 1400, useNativeDriver: true }).start();

    // Background shimmer (loop)
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ).start();

    // Decorative circles expand
    Animated.parallel([
      Animated.timing(circleOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(circleScale, { toValue: 1, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Floating particles
    particleAnims.forEach((p, i) => {
      Animated.timing(p.opacity, { toValue: 0.7, duration: 600, delay: 800 + PARTICLES[i].delay, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(p.translateY, { toValue: -12, duration: 1800 + PARTICLES[i].delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(p.translateY, { toValue: 0, duration: 1800 + PARTICLES[i].delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  /* ── Interpolations ── */
  const logoRotateI = logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] });
  const ringRotateI = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const shimmerX = shimmer.interpolate({ inputRange: [-1, 1], outputRange: [-SW * 1.5, SW * 1.5] });
  const barWidth = progressWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <LinearGradient
      colors={[COLORS.primaryDark, COLORS.primary, '#1E3A8A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Shimmer */}
      <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]} />

      {/* Decorative circles */}
      <Animated.View style={[styles.bgCircle, styles.bgCircle1, { opacity: circleOpacity, transform: [{ scale: circleScale }] }]} />
      <Animated.View style={[styles.bgCircle, styles.bgCircle2, { opacity: circleOpacity, transform: [{ scale: circleScale }] }]} />
      <Animated.View style={[styles.bgCircle, styles.bgCircle3, { opacity: circleOpacity, transform: [{ scale: circleScale }] }]} />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute' as const,
            left: p.x,
            top: p.y,
            width: p.r * 2,
            height: p.r * 2,
            borderRadius: p.r,
            backgroundColor: 'rgba(255,255,255,0.3)',
            opacity: particleAnims[i].opacity,
            transform: [{ translateY: particleAnims[i].translateY }],
          }}
        />
      ))}

      {/* Glow behind logo */}
      <Animated.View
        style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
      />

      {/* Logo + orbit ring */}
      <Animated.View
        style={[styles.logoArea, { transform: [{ scale: logoScale }, { rotate: logoRotateI }] }]}
      >
        {/* Orbit: ring of small solid dots (Android-safe, no dashed border) */}
        <Animated.View
          style={[
            styles.orbitContainer,
            { opacity: ringOpacity, transform: [{ rotate: ringRotateI }] },
          ]}
        >
          {ORBIT_DOTS.map((dot, i) => (
            <View
              key={i}
              style={[
                styles.orbitDotSmall,
                { left: ORBIT_R + dot.x - 2, top: ORBIT_R + dot.y - 2 },
              ]}
            />
          ))}
          {/* Bright accent dot at top */}
          <View
            style={[
              styles.orbitDotAccent,
              { left: ORBIT_R + ORBIT_DOTS[0].x - 5, top: ORBIT_R + ORBIT_DOTS[0].y - 5 },
            ]}
          />
        </Animated.View>

        {/* Logo body */}
        <View style={styles.logoOuter}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <View style={styles.iconCluster}>
              <MaterialCommunityIcons
                name="file-excel"
                size={36}
                color="rgba(255,255,255,0.45)"
                style={styles.excelIcon}
              />
              <MaterialCommunityIcons name="contacts" size={58} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.textSection, { opacity: titleFade, transform: [{ translateY: titleSlide }] }]}>
        <Text style={styles.appTitle}>
          Excel<Text style={styles.appTitleAccent}>Contact</Text>
        </Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={{ opacity: subtitleFade, transform: [{ translateY: subtitleSlide }], marginBottom: 36 }}>
        <Text style={styles.appSubtitle}>IMPORTER</Text>
      </Animated.View>

      {/* Progress bar */}
      <Animated.View style={[styles.progressTrack, { opacity: progressOpacity }]}>
        <Animated.View style={[styles.progressFill, { width: barWidth as any }]} />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{ opacity: tagFade, marginTop: 20 }}>
        <Text style={styles.tagline}>Import contacts seamlessly</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const LOGO_SIZE = 120;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    transform: [{ skewX: '-20deg' }],
  },

  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  bgCircle1: { width: 300, height: 300, top: -80, right: -60 },
  bgCircle2: { width: 220, height: 220, bottom: -50, left: -60 },
  bgCircle3: { width: 160, height: 160, top: SH * 0.38, left: -30 },

  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(96,165,250,0.15)',
  },

  logoArea: {
    width: ORBIT_R * 2,
    height: ORBIT_R * 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },

  /* Orbit – container holds individual small solid dots */
  orbitContainer: {
    position: 'absolute',
    width: ORBIT_R * 2,
    height: ORBIT_R * 2,
  },
  orbitDotSmall: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  orbitDotAccent: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#93C5FD',
    ...Platform.select({
      ios: {
        shadowColor: '#93C5FD',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },

  logoOuter: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCluster: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  excelIcon: {
    position: 'absolute',
    top: -14,
    left: -16,
  },

  textSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  appTitleAccent: {
    color: '#93C5FD',
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 8,
    textAlign: 'center',
  },

  progressTrack: {
    width: 180,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#93C5FD',
  },

  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
