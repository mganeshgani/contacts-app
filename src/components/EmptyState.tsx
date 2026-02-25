/**
 * EmptyState - Premium empty state placeholder
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { useSettingsStore } from '../store';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, isDark && { backgroundColor: COLORS.surfaceDark }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={48}
          color={isDark ? COLORS.textSecondaryDark : COLORS.primaryLight}
        />
      </View>
      <Text
        variant="titleLarge"
        style={[styles.title, isDark && { color: COLORS.textDark }]}
      >
        {title}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.message, isDark && { color: COLORS.textSecondaryDark }]}
      >
        {message}
      </Text>
      {actionLabel && onAction && (
        <Button
          mode="contained"
          onPress={onAction}
          style={styles.button}
          labelStyle={{ fontWeight: '700' }}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  title: {
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 20,
    textAlign: 'center',
  },
  message: {
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  button: {
    marginTop: 24,
    borderRadius: RADIUS.lg,
  },
});
