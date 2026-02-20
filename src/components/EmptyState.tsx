/**
 * EmptyState - Reusable empty state placeholder
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';
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
      <MaterialCommunityIcons
        name={icon as any}
        size={80}
        color={isDark ? COLORS.textSecondaryDark : COLORS.textSecondary}
      />
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
  title: {
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  button: {
    marginTop: 24,
    borderRadius: 8,
  },
});
