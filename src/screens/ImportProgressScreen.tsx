/**
 * ImportProgressScreen - Shows real-time import progress
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Surface, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Progress from 'react-native-progress';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import type { RootStackParamList } from '../types';
import { useContactsStore, useSettingsStore } from '../store';
import { useImport } from '../hooks/useImport';
import { COLORS, SHADOWS, RADIUS } from '../constants';
import { t } from '../i18n';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ImportProgressScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  const importProgress = useContactsStore((s) => s.importProgress);
  const { startImport, cancelImport } = useImport();
  const hasStarted = useRef(false);

  // Start import on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const runImport = async () => {
      try {
        const record = await startImport();
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Haptics not available
        }
        navigation.replace('ImportSummary', { recordId: record.id });
      } catch (error) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {
          // Haptics not available
        }
        Alert.alert(
          t('importError', lang),
          error instanceof Error ? error.message : t('genericError', lang),
          [
            {
              text: t('ok', lang),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    };

    runImport();
  }, []);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('cancelImport', lang),
      t('cancelConfirm', lang) || 'Are you sure? Contacts already imported will remain on your device.',
      [
        { text: t('no', lang), style: 'cancel' },
        {
          text: t('yes', lang),
          style: 'destructive',
          onPress: () => {
            cancelImport();
          },
        },
      ]
    );
  }, [cancelImport, lang]);

  const progress = importProgress;
  const percentage = progress
    ? progress.total > 0
      ? progress.processed / progress.total
      : 0
    : 0;

  return (
    <View
      style={[
        styles.container,
        isDark && { backgroundColor: COLORS.backgroundDark },
        { paddingTop: insets.top },
      ]}
    >
      <View style={styles.center}>
        <LinearGradient
          colors={isDark ? [...COLORS.gradientDark] : [...COLORS.gradientPrimary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <MaterialCommunityIcons
            name="cloud-upload"
            size={48}
            color="#FFFFFF"
          />
        </LinearGradient>

        <Text
          variant="headlineMedium"
          style={[styles.title, isDark && { color: COLORS.textDark }]}
        >
          {progress?.isCancelled
            ? t('importCancelled', lang)
            : t('importProgressTitle', lang)}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Progress.Bar
            progress={percentage}
            width={null}
            height={12}
            borderRadius={6}
            color={COLORS.primaryLight}
            unfilledColor={isDark ? COLORS.borderDark : COLORS.border}
            borderWidth={0}
            style={styles.progressBar}
          />
          <Text
            variant="titleLarge"
            style={[styles.progressText, isDark && { color: COLORS.textDark }]}
          >
            {Math.round(percentage * 100)}%
          </Text>
        </View>

        {/* Batch Info */}
        {progress && (
          <Text
            variant="bodyMedium"
            style={[styles.batchText, isDark && { color: COLORS.textSecondaryDark }]}
          >
            {t('processing', lang, {
              current: progress.currentBatch,
              total: progress.totalBatches,
            })}
          </Text>
        )}

        {/* Stats */}
        {progress && (
          <Surface
            style={[styles.statsCard, isDark && { backgroundColor: COLORS.surfaceDark }]}
            elevation={0}
          >
            <View style={styles.statsGrid}>
              <StatItem
                label={t('imported', lang)}
                value={progress.successful}
                color={COLORS.success}
                isDark={isDark}
              />
              <StatItem
                label={t('updated', lang)}
                value={progress.updated}
                color={COLORS.primaryLight}
                isDark={isDark}
              />
              <StatItem
                label={t('skipped', lang)}
                value={progress.skipped}
                color={COLORS.warning}
                isDark={isDark}
              />
              <StatItem
                label={t('failed', lang)}
                value={progress.failed}
                color={COLORS.error}
                isDark={isDark}
              />
            </View>

            <View style={[styles.totalRow, isDark && { borderTopColor: COLORS.borderDark }]}>
              <Text
                variant="bodySmall"
                style={[styles.totalText, isDark && { color: COLORS.textSecondaryDark }]}
              >
                {progress.processed} / {progress.total} {t('contacts', lang)}
              </Text>
            </View>
          </Surface>
        )}

        {/* Recent Errors */}
        {progress && progress.errors.length > 0 && (
          <View style={styles.errorSection}>
            <Text variant="labelMedium" style={styles.errorLabel}>
              Recent errors:
            </Text>
            {progress.errors.slice(-3).map((err, idx) => (
              <Text key={idx} variant="bodySmall" style={styles.errorText}>
                Row {err.rowIndex + 1}: {err.contactName} - {err.errorMessage}
              </Text>
            ))}
          </View>
        )}

        {/* Cancel Button */}
        {progress?.isRunning && (
          <Button
            mode="outlined"
            onPress={handleCancel}
            icon="close-circle"
            style={styles.cancelButton}
            textColor={COLORS.error}
          >
            {t('cancelImport', lang)}
          </Button>
        )}

        {!progress && <ActivityIndicator size="large" style={styles.loader} />}
      </View>
    </View>
  );
}

function StatItem({
  label,
  value,
  color,
  isDark,
}: {
  label: string;
  value: number;
  color: string;
  isDark: boolean;
}) {
  return (
    <View style={statStyles.item}>
      <Text variant="titleLarge" style={[statStyles.value, { color }]}>
        {value}
      </Text>
      <Text
        variant="labelSmall"
        style={[statStyles.label, isDark && { color: COLORS.textSecondaryDark }]}
      >
        {label}
      </Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  item: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    fontWeight: '800',
  },
  label: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.xl,
  },
  title: {
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 32,
  },
  progressBar: {
    width: '100%',
  },
  progressText: {
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    color: COLORS.text,
  },
  batchText: {
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsCard: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginTop: 24,
    ...SHADOWS.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalRow: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalText: {
    color: COLORS.textSecondary,
  },
  errorSection: {
    width: '100%',
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.errorSoft,
    borderRadius: RADIUS.sm,
  },
  errorLabel: {
    color: COLORS.error,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 32,
    borderColor: COLORS.error,
    borderRadius: RADIUS.sm,
  },
  loader: {
    marginTop: 32,
  },
});
