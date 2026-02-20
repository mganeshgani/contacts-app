/**
 * HomeScreen - Premium upload screen with gradient hero & recent imports
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Text, Button, Surface, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ImportRecord } from '../types';
import { useFilePicker } from '../hooks/useFilePicker';
import { useContactsStore, useHistoryStore, useSettingsStore } from '../store';
import { PermissionGate, AppLogo } from '../components';
import { COLORS, SHADOWS, RADIUS } from '../constants';
import { t } from '../i18n';
import Toast from 'react-native-toast-message';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  const { pickFile, isLoading: isPickingFile, error: pickError, clearError } = useFilePicker();
  const parsedFile = useContactsStore((s) => s.parsedFile);
  const { records, isLoaded: historyLoaded, loadHistory } = useHistoryStore();

  // Load history on mount
  useEffect(() => {
    if (!historyLoaded) {
      loadHistory();
    }
  }, [historyLoaded, loadHistory]);

  // Navigate to preview when file is parsed
  useEffect(() => {
    if (parsedFile) {
      // Tab navigation will handle this - user sees preview tab light up
      Toast.show({
        type: 'success',
        text1: `${parsedFile.rowCount} ${t('rows', lang)} loaded`,
        text2: parsedFile.fileName,
        visibilityTime: 2000,
      });
    }
  }, [parsedFile, lang]);

  // Show error toast
  useEffect(() => {
    if (pickError) {
      Toast.show({
        type: 'error',
        text1: t('invalidFile', lang),
        text2: pickError,
        visibilityTime: 3000,
      });
      clearError();
    }
  }, [pickError, lang, clearError]);

  const handleUpload = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }
    pickFile();
  }, [pickFile]);

  const renderImportRecord = useCallback(
    ({ item }: { item: ImportRecord }) => {
      const date = new Date(item.date);
      const dateStr = date.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return (
        <Surface
          style={[
            styles.recordCard,
            isDark && { backgroundColor: COLORS.surfaceDark },
          ]}
          elevation={0}
        >
          <View style={[styles.recordIcon, isDark && { backgroundColor: 'rgba(5,150,105,0.15)' }]}>
            <MaterialCommunityIcons
              name="file-check-outline"
              size={24}
              color={COLORS.success}
            />
          </View>
          <View style={styles.recordContent}>
            <Text
              variant="titleSmall"
              style={[styles.recordTitle, isDark && { color: COLORS.textDark }]}
              numberOfLines={1}
            >
              {item.fileName}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.recordDate, isDark && { color: COLORS.textSecondaryDark }]}
            >
              {dateStr}
            </Text>
            <View style={styles.recordStats}>
              <View style={[styles.statBadge, { backgroundColor: COLORS.successSoft }]}>
                <Text variant="labelSmall" style={{ color: COLORS.success, fontWeight: '700' }}>
                  {item.imported} {t('imported', lang)}
                </Text>
              </View>
              {item.skipped > 0 && (
                <View style={[styles.statBadge, { backgroundColor: COLORS.warningSoft }]}>
                  <Text variant="labelSmall" style={{ color: COLORS.warning, fontWeight: '700' }}>
                    {item.skipped} {t('skipped', lang)}
                  </Text>
                </View>
              )}
              {item.failed > 0 && (
                <View style={[styles.statBadge, { backgroundColor: COLORS.errorSoft }]}>
                  <Text variant="labelSmall" style={{ color: COLORS.error, fontWeight: '700' }}>
                    {item.failed} {t('failed', lang)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {item.canUndo && (
            <View style={styles.undoIndicator}>
              <MaterialCommunityIcons
                name="undo-variant"
                size={18}
                color={COLORS.primaryLight}
              />
            </View>
          )}
        </Surface>
      );
    },
    [isDark, lang]
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerSection}>
        {/* Premium Gradient Hero */}
        <LinearGradient
          colors={isDark ? [...COLORS.gradientHeroDark] : [...COLORS.gradientHero]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}
        >
          {/* Decorative circles */}
          <View style={[styles.heroBgCircle, styles.heroBgCircle1]} />
          <View style={[styles.heroBgCircle, styles.heroBgCircle2]} />
          <View style={[styles.heroBgCircle, styles.heroBgCircle3]} />

          <AppLogo size="lg" showText={false} isDark />

          <Text style={styles.heroTitle}>
            {t('welcomeTitle', lang)}
          </Text>
          <Text style={styles.heroSubtitle}>
            {t('welcomeSubtitle', lang)}
          </Text>

          <Button
            mode="contained"
            onPress={handleUpload}
            loading={isPickingFile}
            disabled={isPickingFile}
            icon="file-upload"
            style={styles.uploadButton}
            labelStyle={styles.uploadButtonLabel}
            contentStyle={styles.uploadButtonContent}
            buttonColor="#FFFFFF"
            textColor={COLORS.primary}
          >
            {isPickingFile ? t('loading', lang) : t('uploadButton', lang)}
          </Button>

          {/* Supported formats */}
          <View style={styles.formatsRow}>
            {[
              { icon: 'file-excel', label: '.xlsx' },
              { icon: 'file-excel-outline', label: '.xls' },
              { icon: 'file-delimited', label: '.csv' },
            ].map((fmt) => (
              <View key={fmt.label} style={styles.formatChip}>
                <MaterialCommunityIcons
                  name={fmt.icon as any}
                  size={14}
                  color="rgba(255,255,255,0.7)"
                />
                <Text style={styles.formatLabel}>{fmt.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Quick Stats Strip */}
        {records.length > 0 && (
          <View style={styles.quickStats}>
            <View style={[styles.quickStatCard, isDark && { backgroundColor: COLORS.surfaceDark }]}>
              <Text style={[styles.quickStatValue, { color: COLORS.primary }]}>
                {records.length}
              </Text>
              <Text style={[styles.quickStatLabel, isDark && { color: COLORS.textSecondaryDark }]}>
                Imports
              </Text>
            </View>
            <View style={[styles.quickStatCard, isDark && { backgroundColor: COLORS.surfaceDark }]}>
              <Text style={[styles.quickStatValue, { color: COLORS.success }]}>
                {records.reduce((sum, r) => sum + r.imported, 0)}
              </Text>
              <Text style={[styles.quickStatLabel, isDark && { color: COLORS.textSecondaryDark }]}>
                Contacts
              </Text>
            </View>
            <View style={[styles.quickStatCard, isDark && { backgroundColor: COLORS.surfaceDark }]}>
              <Text style={[styles.quickStatValue, { color: COLORS.secondary }]}>
                {records.reduce((sum, r) => sum + r.totalRows, 0)}
              </Text>
              <Text style={[styles.quickStatLabel, isDark && { color: COLORS.textSecondaryDark }]}>
                Rows
              </Text>
            </View>
          </View>
        )}

        {/* Recent Imports Header */}
        <View style={styles.sectionHeaderRow}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, isDark && { color: COLORS.textDark }]}
          >
            {t('recentImports', lang)}
          </Text>
          {records.length > 0 && (
            <Text
              variant="labelSmall"
              style={{ color: COLORS.primaryLight, fontWeight: '600' }}
            >
              {records.length} {records.length === 1 ? 'import' : 'imports'}
            </Text>
          )}
        </View>
      </View>
    ),
    [isDark, lang, handleUpload, isPickingFile, records, insets.top]
  );

  return (
    <PermissionGate>
      <View
        style={[
          styles.container,
          isDark && { backgroundColor: COLORS.backgroundDark },
        ]}
      >
        <FlatList
          data={records}
          renderItem={renderImportRecord}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            historyLoaded ? (
              <View style={styles.emptyHistory}>
                <View style={[styles.emptyIconCircle, isDark && { backgroundColor: COLORS.surfaceDark }]}>
                  <MaterialCommunityIcons
                    name="history"
                    size={36}
                    color={isDark ? COLORS.textSecondaryDark : COLORS.textSecondary}
                  />
                </View>
                <Text
                  variant="bodyMedium"
                  style={[styles.emptyHistoryText, isDark && { color: COLORS.textSecondaryDark }]}
                >
                  {t('noRecentImports', lang)}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.emptyHistoryHint, isDark && { color: COLORS.textSecondaryDark }]}
                >
                  Upload a file to get started
                </Text>
              </View>
            ) : (
              <ActivityIndicator style={styles.loader} />
            )
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={loadHistory}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  headerSection: {
    paddingBottom: 4,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  heroBgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroBgCircle1: {
    width: 250,
    height: 250,
    top: -60,
    right: -40,
  },
  heroBgCircle2: {
    width: 180,
    height: 180,
    bottom: -30,
    left: -40,
  },
  heroBgCircle3: {
    width: 100,
    height: 100,
    top: 80,
    left: 50,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    fontSize: 14,
  },
  uploadButton: {
    marginTop: 20,
    borderRadius: RADIUS.lg,
  },
  uploadButtonLabel: {
    fontWeight: '800',
    fontSize: 16,
  },
  uploadButtonContent: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  formatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  formatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: -16,
    gap: 8,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  quickStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    color: COLORS.text,
  },

  // Record Cards
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.successSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordContent: {
    flex: 1,
    marginLeft: 12,
  },
  recordTitle: {
    fontWeight: '700',
    color: COLORS.text,
  },
  recordDate: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recordStats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  undoIndicator: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyHistoryText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptyHistoryHint: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontSize: 13,
  },
  loader: {
    paddingVertical: 32,
  },
});
