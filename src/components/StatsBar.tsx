/**
 * StatsBar - Displays summary statistics for parsed contacts
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { useSettingsStore } from '../store';
import { t } from '../i18n';

interface StatItem {
  label: string;
  value: number;
  icon: string;
  color: string;
}

interface StatsBarProps {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  newCount: number;
}

export function StatsBar({ total, valid, invalid, duplicates, newCount }: StatsBarProps) {
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  const stats: StatItem[] = [
    { label: t('totalRows', lang), value: total, icon: 'file-document-outline', color: COLORS.primary },
    { label: t('validRows', lang), value: valid, icon: 'check-circle-outline', color: COLORS.success },
    { label: t('invalidRows', lang), value: invalid, icon: 'alert-circle-outline', color: COLORS.error },
    { label: t('duplicates', lang), value: duplicates, icon: 'content-copy', color: COLORS.warning },
    { label: t('newContacts', lang), value: newCount, icon: 'account-plus-outline', color: COLORS.primaryLight },
  ];

  return (
    <Surface
      style={[
        styles.container,
        isDark && { backgroundColor: COLORS.surfaceDark },
      ]}
      elevation={1}
    >
      {stats.map((stat, index) => (
        <View key={stat.label} style={styles.statItem}>
          <MaterialCommunityIcons
            name={stat.icon as any}
            size={20}
            color={stat.color}
          />
          <Text
            variant="titleMedium"
            style={[styles.value, { color: stat.color }]}
          >
            {stat.value}
          </Text>
          <Text
            variant="labelSmall"
            style={[styles.label, isDark && styles.labelDark]}
            numberOfLines={1}
          >
            {stat.label}
          </Text>
        </View>
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontWeight: '800',
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 1,
  },
  labelDark: {
    color: COLORS.textSecondaryDark,
  },
});
