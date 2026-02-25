/**
 * SplashLoader - Premium animated loading screen with college logo
 *
 * Uses the actual college logo image.
 * Clean, modern design with smooth animations.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants';

const { width: SW, height: SH } = Dimensions.get('window');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoImage = require('../../assets/logo.png');

export function SplashLoader() {
  /* ── Animation values ── */
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const glowPulse = useRef(new Animated.Value(0.4)).current;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(20)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;

  const progressWidth = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Phase 1: Logo entrance (spring)
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.4,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Phase 2: Title
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(titleSlide, {
        toValue: 0,
        duration: 500,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 3: Subtitle
    Animated.parallel([
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 650,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleSlide, {
        toValue: 0,
        duration: 500,
        delay: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 4: Progress bar
    Animated.timing(progressOpacity, {
      toValue: 1,
      duration: 400,
      delay: 900,
      useNativeDriver: false,
    }).start();
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: 2200,
      delay: 1000,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();

    // Phase 5: Tagline
    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 500,
      delay: 1200,
      useNativeDriver: true,
    }).start();

    // Loading dots animation
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, []);

  /* ── Interpolations ── */
  const barWidth = progressWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowScale = glowPulse.interpolate({
    inputRange: [0.4, 1],
    outputRange: [0.8, 1.3],
  });

  const dot1Y = dot1.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const dot2Y = dot2.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const dot3Y = dot3.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <LinearGradient
      colors={['#0F2A5C', COLORS.primaryDark, COLORS.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Background decorative elements */}
      <View style={[styles.bgCircle, styles.bgCircle1]} />
      <View style={[styles.bgCircle, styles.bgCircle2]} />
      <View style={[styles.bgCircle, styles.bgCircle3]} />

      {/* Glow behind logo */}
      <Animated.View
        style={[
          styles.glow,
          { opacity: glowPulse, transform: [{ scale: glowScale }] },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrapper,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.logoOuter}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            {/* College logo image */}
            <Image
              source={logoImage}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>
      </Animated.View>

      {/* App Title */}
      <Animated.View
        style={[
          styles.titleRow,
          { opacity: titleOpacity, transform: [{ translateY: titleSlide }] },
        ]}
      >
        <Text style={styles.titleSmart}>Smart</Text>
        <Text style={styles.titleContacts}> Contacts</Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View
        style={{
          opacity: subtitleOpacity,
          transform: [{ translateY: subtitleSlide }],
          marginBottom: 32,
        }}
      >
        <Text style={styles.subtitle}>IMPORT & EXPORT</Text>
      </Animated.View>

      {/* Progress bar */}
      <Animated.View style={[styles.progressTrack, { opacity: progressOpacity }]}>
        <Animated.View
          style={[styles.progressFill, { width: barWidth as any }]}
        />
      </Animated.View>

      {/* Loading dots */}
      <View style={styles.dotsRow}>
        <Animated.View
          style={[styles.loadingDot, { transform: [{ translateY: dot1Y }] }]}
        />
        <Animated.View
          style={[styles.loadingDot, { transform: [{ translateY: dot2Y }] }]}
        />
        <Animated.View
          style={[styles.loadingDot, { transform: [{ translateY: dot3Y }] }]}
        />
      </View>

      {/* Tagline */}
      <Animated.View style={{ opacity: taglineOpacity, marginTop: 16 }}>
        <Text style={styles.tagline}>
          Excel &bull; CSV &bull; VCF &bull; Backup
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const LOGO_SIZE = 110;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  /* Background circles */
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  bgCircle1: { width: 280, height: 280, top: -70, right: -50 },
  bgCircle2: { width: 200, height: 200, bottom: -40, left: -50 },
  bgCircle3: { width: 140, height: 140, top: SH * 0.35, left: -20 },

  /* Glow */
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59,130,246,0.2)',
  },

  /* Logo */
  logoWrapper: {
    marginBottom: 24,
  },
  logoOuter: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
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
  logoImage: {
    width: LOGO_SIZE * 0.75,
    height: LOGO_SIZE * 0.75,
    borderRadius: LOGO_SIZE * 0.15,
  },

  /* Title */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  titleSmart: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  titleContacts: {
    fontSize: 32,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: -0.5,
  },

  /* Subtitle */
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 6,
    textAlign: 'center',
  },

  /* Progress bar */
  progressTrack: {
    width: 200,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#93C5FD',
  },

  /* Loading dots */
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  /* Tagline */
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    letterSpacing: 1,
  },
});
