/**
 * HomeScreen - Main upload screen with recent imports
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Button, Surface, FAB, Divider, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ImportRecord } from '../types';
import { useFilePicker } from '../hooks/useFilePicker';
import { useContactsStore, useHistoryStore, useSettingsStore } from '../store';
import { PermissionGate, EmptyState } from '../components';
import { COLORS } from '../constants';
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
          style={[styles.recordCard, isDark && { backgroundColor: COLORS.surfaceDark }]}
          elevation={1}
        >
          <View style={styles.recordIcon}>
            <MaterialCommunityIcons
              name="file-check-outline"
              size={28}
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
            <Text variant="bodySmall" style={styles.recordDate}>
              {dateStr}
            </Text>
            <View style={styles.recordStats}>
              <Text variant="labelSmall" style={[styles.recordStat, { color: COLORS.success }]}>
                {item.imported} {t('imported', lang)}
              </Text>
              {item.skipped > 0 && (
                <Text variant="labelSmall" style={[styles.recordStat, { color: COLORS.warning }]}>
                  {item.skipped} {t('skipped', lang)}
                </Text>
              )}
              {item.failed > 0 && (
                <Text variant="labelSmall" style={[styles.recordStat, { color: COLORS.error }]}>
                  {item.failed} {t('failed', lang)}
                </Text>
              )}
            </View>
          </View>
          {item.canUndo && (
            <MaterialCommunityIcons
              name="undo-variant"
              size={20}
              color={COLORS.textSecondary}
            />
          )}
        </Surface>
      );
    },
    [isDark, lang]
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerSection}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <MaterialCommunityIcons
            name="file-excel-outline"
            size={72}
            color={COLORS.primary}
          />
          <Text
            variant="headlineMedium"
            style={[styles.heroTitle, isDark && { color: COLORS.textDark }]}
          >
            {t('welcomeTitle', lang)}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.heroSubtitle, isDark && { color: COLORS.textSecondaryDark }]}
          >
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
          >
            {isPickingFile ? t('loading', lang) : t('uploadButton', lang)}
          </Button>
        </View>

        <Divider style={styles.divider} />

        {/* Recent Imports Header */}
        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, isDark && { color: COLORS.textDark }]}
        >
          {t('recentImports', lang)}
        </Text>
      </View>
    ),
    [isDark, lang, handleUpload, isPickingFile]
  );

  return (
    <PermissionGate>
      <View
        style={[
          styles.container,
          isDark && { backgroundColor: COLORS.backgroundDark },
          { paddingTop: insets.top },
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
                <MaterialCommunityIcons
                  name="history"
                  size={40}
                  color={COLORS.textSecondary}
                />
                <Text variant="bodyMedium" style={styles.emptyHistoryText}>
                  {t('noRecentImports', lang)}
                </Text>
              </View>
            ) : (
              <ActivityIndicator style={styles.loader} />
            )
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={loadHistory} />
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
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingBottom: 100,
  },
  headerSection: {
    paddingBottom: 8,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  heroTitle: {
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  uploadButton: {
    marginTop: 24,
    borderRadius: 12,
    elevation: 4,
  },
  uploadButtonLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  uploadButtonContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  divider: {
    marginHorizontal: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#1E293B',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordContent: {
    flex: 1,
    marginLeft: 12,
  },
  recordTitle: {
    fontWeight: '600',
    color: '#1E293B',
  },
  recordDate: {
    color: '#64748B',
    marginTop: 2,
  },
  recordStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  recordStat: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyHistoryText: {
    color: '#64748B',
    marginTop: 8,
  },
  loader: {
    paddingVertical: 32,
  },
});
