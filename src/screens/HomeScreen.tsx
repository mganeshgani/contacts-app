/**
 * HomeScreen - Premium upload screen with gradient hero, recent imports,
 * export progress overlay, and exported files section.
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Text, Button, Surface, ActivityIndicator, Switch, ProgressBar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, ImportRecord, ExportFormat, BackupRecord } from '../types';
import { useFilePicker } from '../hooks/useFilePicker';
import { useContactsStore, useHistoryStore, useSettingsStore, useBackupStore } from '../store';
import { PermissionGate, AppLogo } from '../components';
import { COLORS, SHADOWS, RADIUS } from '../constants';
import { t } from '../i18n';
import { exportContacts, shareBackupFile, deleteBackupFile } from '../services/exportService';
import type { ExportProgressCallback } from '../services/exportService';
import Toast from 'react-native-toast-message';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** Unified activity item — either an import or an export */
type ActivityItem =
  | { type: 'import'; date: string; data: ImportRecord }
  | { type: 'export'; date: string; data: BackupRecord };

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  const { pickFile, isLoading: isPickingFile, error: pickError, clearError } = useFilePicker();
  const parsedFile = useContactsStore((s) => s.parsedFile);
  const { records, isLoaded: historyLoaded, loadHistory } = useHistoryStore();
  const {
    addBackup, removeBackup, isExporting, setExporting,
    loadBackups, isLoaded: backupsLoaded, backups,
    exportProgress, setExportProgress,
  } = useBackupStore();

  const [mergeDuplicates, setMergeDuplicates] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);

  // ── Combined activity timeline (imports + exports, sorted newest first) ──
  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    for (const r of records) {
      items.push({ type: 'import', date: r.date, data: r });
    }
    for (const b of backups) {
      items.push({ type: 'export', date: b.createdAt, data: b });
    }
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [records, backups]);

  // Load history & backups on mount
  useEffect(() => {
    if (!historyLoaded) loadHistory();
    if (!backupsLoaded) loadBackups();
  }, [historyLoaded, loadHistory, backupsLoaded, loadBackups]);

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

  const handleBackup = useCallback(
    (format: ExportFormat = 'vcf') => {
      setShowExportModal(true);
    },
    []
  );

  const doExport = useCallback(
    async (format: ExportFormat) => {
      setShowExportModal(false);
      setExporting(true);
      setExportProgress(null);
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      try {
        const onProgress: ExportProgressCallback = (progress) => {
          setExportProgress(progress);
        };
        const { fileUri, record, duplicatesRemoved } = await exportContacts(
          { format, mergeDuplicates },
          onProgress,
        );
        const id = `backup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await addBackup({ ...record, id });

        let successMsg = record.fileName;
        if (duplicatesRemoved > 0) {
          successMsg = `${record.fileName} (${duplicatesRemoved} duplicates merged)`;
        }
        Toast.show({
          type: 'success',
          text1: t('backupSuccess', lang),
          text2: successMsg,
          visibilityTime: 3000,
        });
        // Offer to share
        setTimeout(() => {
          Alert.alert(
            t('shareFile', lang),
            record.fileName,
            [
              { text: t('shareFile', lang), onPress: () => shareBackupFile(fileUri) },
              { text: t('ok', lang), style: 'cancel' },
            ]
          );
        }, 500);
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: t('backupFailed', lang),
          text2: error?.message || 'Unknown error',
          visibilityTime: 4000,
        });
      } finally {
        setExporting(false);
        setExportProgress(null);
      }
    },
    [lang, addBackup, setExporting, setExportProgress, mergeDuplicates]
  );

  const handleDeleteBackup = useCallback(
    (backup: BackupRecord) => {
      Alert.alert(
        t('deleteFile', lang),
        t('deleteBackupConfirm', lang),
        [
          { text: t('cancel', lang), style: 'cancel' },
          {
            text: t('deleteFile', lang),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteBackupFile(backup.fileUri);
                await removeBackup(backup.id);
                Toast.show({ type: 'info', text1: 'File deleted' });
              } catch {
                Toast.show({ type: 'error', text1: 'Failed to delete file' });
              }
            },
          },
        ]
      );
    },
    [lang, removeBackup]
  );

  const renderActivityItem = useCallback(
    ({ item }: { item: ActivityItem }) => {
      if (item.type === 'import') {
        return renderImportCard(item.data);
      }
      return renderExportCard(item.data);
    },
    [isDark, lang]
  );

  const renderImportCard = (item: ImportRecord) => {
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
  };

  const renderExportCard = (backup: BackupRecord) => {
      const date = new Date(backup.createdAt);
      const dateStr = date.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const sizeStr = backup.fileSize > 1024 * 1024
        ? `${(backup.fileSize / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(backup.fileSize / 1024)} KB`;
      const formatIcon =
        backup.format === 'xlsx' ? 'file-excel' :
        backup.format === 'csv' ? 'file-delimited' : 'card-account-details';
      const formatColor =
        backup.format === 'xlsx' ? '#22C55E' :
        backup.format === 'csv' ? '#3B82F6' : '#8B5CF6';

      return (
        <Surface
          style={[styles.backupCard, isDark && { backgroundColor: COLORS.surfaceDark }]}
          elevation={0}
        >
          <View style={[styles.backupIcon, { backgroundColor: `${formatColor}15` }]}>
            <MaterialCommunityIcons
              name={formatIcon as any}
              size={24}
              color={formatColor}
            />
          </View>
          <View style={styles.recordContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                variant="titleSmall"
                style={[styles.recordTitle, isDark && { color: COLORS.textDark }]}
                numberOfLines={1}
              >
                {backup.fileName}
              </Text>
              <View style={[styles.statBadge, { backgroundColor: `${formatColor}15` }]}>
                <Text variant="labelSmall" style={{ color: formatColor, fontWeight: '700', fontSize: 10 }}>
                  {t('export', lang).toUpperCase()}
                </Text>
              </View>
            </View>
            <Text variant="bodySmall" style={[styles.recordDate, isDark && { color: COLORS.textSecondaryDark }]}>
              {dateStr} &bull; {sizeStr} &bull; {backup.contactCount} {t('contacts', lang)}
            </Text>
          </View>
          <View style={styles.backupActions}>
            <Pressable
              onPress={() => shareBackupFile(backup.fileUri).catch(() =>
                Toast.show({ type: 'error', text1: 'Unable to open file' })
              )}
              style={styles.backupActionBtn}
              hitSlop={6}
            >
              <MaterialCommunityIcons name="open-in-new" size={18} color={COLORS.primary} />
            </Pressable>
            <Pressable
              onPress={() => shareBackupFile(backup.fileUri).catch(() =>
                Toast.show({ type: 'error', text1: 'Unable to share file' })
              )}
              style={styles.backupActionBtn}
              hitSlop={6}
            >
              <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.primaryLight} />
            </Pressable>
            <Pressable
              onPress={() => handleDeleteBackup(backup)}
              style={styles.backupActionBtn}
              hitSlop={6}
            >
              <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.error} />
            </Pressable>
          </View>
        </Surface>
      );
  };

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
            disabled={isPickingFile || isExporting}
            icon="file-upload"
            style={styles.uploadButton}
            labelStyle={styles.uploadButtonLabel}
            contentStyle={styles.uploadButtonContent}
            buttonColor="#FFFFFF"
            textColor={COLORS.primary}
          >
            {isPickingFile ? t('loading', lang) : t('uploadButton', lang)}
          </Button>

          <Button
            mode="outlined"
            onPress={() => handleBackup()}
            loading={isExporting}
            disabled={isExporting || isPickingFile}
            icon="cloud-download"
            style={styles.backupButton}
            labelStyle={styles.backupButtonLabel}
            contentStyle={styles.uploadButtonContent}
            textColor="#FFFFFF"
          >
            {isExporting ? t('loading', lang) : t('backupAllButton', lang)}
          </Button>

          {/* Supported formats */}
          <View style={styles.formatsRow}>
            {[
              { icon: 'file-excel', label: '.xlsx' },
              { icon: 'file-excel-outline', label: '.xls' },
              { icon: 'file-delimited', label: '.csv' },
              { icon: 'card-account-details', label: '.vcf' },
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
        {(records.length > 0 || backups.length > 0) && (
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
                {backups.length}
              </Text>
              <Text style={[styles.quickStatLabel, isDark && { color: COLORS.textSecondaryDark }]}>
                Exports
              </Text>
            </View>
            <View style={[styles.quickStatCard, isDark && { backgroundColor: COLORS.surfaceDark }]}>
              <Text style={[styles.quickStatValue, { color: COLORS.secondary }]}>
                {records.reduce((sum, r) => sum + r.imported, 0)}
              </Text>
              <Text style={[styles.quickStatLabel, isDark && { color: COLORS.textSecondaryDark }]}>
                Contacts
              </Text>
            </View>
          </View>
        )}

        {/* Recent Activity Header */}
        <View style={styles.sectionHeaderRow}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, isDark && { color: COLORS.textDark }]}
          >
            {t('recentImports', lang)}
          </Text>
          {activityItems.length > 0 && (
            <Text
              variant="labelSmall"
              style={{ color: COLORS.primaryLight, fontWeight: '600' }}
            >
              {activityItems.length} {activityItems.length === 1 ? 'activity' : 'activities'}
            </Text>
          )}
        </View>
      </View>
    ),
    [isDark, lang, handleUpload, isPickingFile, records, backups, activityItems, insets.top]
  );

  // ── Export format selection modal ──
  const renderExportModal = () => (
    <Modal
      visible={showExportModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowExportModal(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setShowExportModal(false)}>
        <Pressable style={[styles.modalContent, isDark && { backgroundColor: COLORS.surfaceDark }]}>
          <Text variant="titleLarge" style={[styles.modalTitle, isDark && { color: COLORS.textDark }]}>
            {t('backup', lang)}
          </Text>
          <Text variant="bodyMedium" style={[styles.modalSubtitle, isDark && { color: COLORS.textSecondaryDark }]}>
            {t('backupAll', lang)}
          </Text>

          {/* Merge duplicates toggle */}
          <View style={styles.mergeRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={[styles.mergeLabel, isDark && { color: COLORS.textDark }]}>
                {t('mergeDuplicatesOption', lang)}
              </Text>
              <Text variant="bodySmall" style={[styles.mergeDesc, isDark && { color: COLORS.textSecondaryDark }]}>
                {t('mergeDuplicatesDesc', lang)}
              </Text>
            </View>
            <Switch
              value={mergeDuplicates}
              onValueChange={setMergeDuplicates}
              color={COLORS.primary}
            />
          </View>

          {/* Format buttons */}
          <View style={styles.formatButtons}>
            {([
              { format: 'vcf' as ExportFormat, icon: 'card-account-details', label: 'VCF', color: '#8B5CF6' },
              { format: 'csv' as ExportFormat, icon: 'file-delimited', label: 'CSV', color: '#3B82F6' },
              { format: 'xlsx' as ExportFormat, icon: 'file-excel', label: 'Excel', color: '#22C55E' },
            ]).map((item) => (
              <Pressable
                key={item.format}
                style={[styles.formatBtn, { borderColor: item.color }]}
                onPress={() => doExport(item.format)}
              >
                <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
                <Text style={[styles.formatBtnLabel, { color: item.color }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Button
            mode="text"
            onPress={() => setShowExportModal(false)}
            textColor={COLORS.textSecondary}
            style={{ marginTop: 8 }}
          >
            {t('cancel', lang)}
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ── Export progress overlay ──
  const renderExportProgress = () => {
    if (!isExporting || !exportProgress) return null;
    const pct = exportProgress.total > 0
      ? exportProgress.processed / exportProgress.total
      : 0;
    return (
      <View style={styles.progressOverlay}>
        <Surface style={[styles.progressCard, isDark && { backgroundColor: COLORS.surfaceDark }]} elevation={4}>
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginBottom: 12 }} />
          <Text variant="titleSmall" style={[{ fontWeight: '700', marginBottom: 4 }, isDark && { color: COLORS.textDark }]}>
            {t('exportProgress', lang)}
          </Text>
          <Text variant="bodySmall" style={[{ color: COLORS.textSecondary, marginBottom: 12 }, isDark && { color: COLORS.textSecondaryDark }]}>
            {exportProgress.message}
          </Text>
          <ProgressBar
            progress={pct}
            color={COLORS.primary}
            style={styles.progressBarInner}
          />
          <Text variant="labelSmall" style={{ color: COLORS.textSecondary, marginTop: 6 }}>
            {Math.round(pct * 100)}%
          </Text>
        </Surface>
      </View>
    );
  };

  return (
    <PermissionGate>
      <View
        style={[
          styles.container,
          isDark && { backgroundColor: COLORS.backgroundDark },
        ]}
      >
        <FlatList
          data={activityItems}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.type === 'import' ? item.data.id : item.data.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            (historyLoaded && backupsLoaded) ? (
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
                  Upload a file or export contacts to get started
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
              onRefresh={() => { loadHistory(); loadBackups(); }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Export format selection modal */}
        {renderExportModal()}

        {/* Export progress overlay */}
        {renderExportProgress()}
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
  backupButton: {
    marginTop: 10,
    borderRadius: RADIUS.lg,
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1.5,
  },
  backupButtonLabel: {
    fontWeight: '700',
    fontSize: 14,
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

  // Export Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  mergeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.06)',
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 20,
  },
  mergeLabel: {
    fontWeight: '600',
    color: COLORS.text,
  },
  mergeDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  formatButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  formatBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    gap: 6,
  },
  formatBtnLabel: {
    fontWeight: '700',
    fontSize: 13,
  },

  // Progress Overlay
  progressOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  progressCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  progressBarInner: {
    width: '100%',
    height: 6,
    borderRadius: 3,
  },

  // Exported / Backup cards
  backupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  backupIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 6,
  },
  backupActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
});
