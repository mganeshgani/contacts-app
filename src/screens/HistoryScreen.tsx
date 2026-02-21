/**
 * HistoryScreen - Shows import history and export history with open/share/delete
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl, Pressable } from 'react-native';
import { Text, Surface, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { ImportRecord, BackupRecord } from '../types';
import { useHistoryStore, useSettingsStore, useBackupStore } from '../store';
import { useImport } from '../hooks/useImport';
import { EmptyState } from '../components';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { t } from '../i18n';
import { shareBackupFile, deleteBackupFile } from '../services/exportService';

type TabKey = 'imports' | 'exports';

export function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  const { records, isLoaded, loadHistory } = useHistoryStore();
  const { backups, isLoaded: backupsLoaded, loadBackups, removeBackup } = useBackupStore();
  const { undoLastImport } = useImport();
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('imports');

  useEffect(() => {
    if (!isLoaded) loadHistory();
    if (!backupsLoaded) loadBackups();
  }, [isLoaded, loadHistory, backupsLoaded, loadBackups]);

  const handleUndo = useCallback(
    (record: ImportRecord) => {
      if (!record.canUndo) return;

      Alert.alert(
        t('undoImport', lang),
        t('undoConfirm', lang, { count: record.contactIds.length }),
        [
          { text: t('no', lang), style: 'cancel' },
          {
            text: t('yes', lang),
            style: 'destructive',
            onPress: async () => {
              setUndoingId(record.id);
              try {
                const result = await undoLastImport(record.id);
                Toast.show({
                  type: 'success',
                  text1: t('undoSuccess', lang, { count: result.removed }),
                  visibilityTime: 2000,
                });
              } catch {
                Toast.show({
                  type: 'error',
                  text1: t('genericError', lang),
                  visibilityTime: 3000,
                });
              } finally {
                setUndoingId(null);
              }
            },
          },
        ]
      );
    },
    [undoLastImport, lang]
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

  const handleOpenFile = useCallback((fileUri: string) => {
    shareBackupFile(fileUri).catch(() =>
      Toast.show({ type: 'error', text1: 'Unable to open file', text2: 'The file may have been deleted.' })
    );
  }, []);

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
          style={[styles.card, isDark && { backgroundColor: COLORS.surfaceDark }]}
          elevation={1}
        >
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="file-check-outline"
              size={24}
              color={COLORS.success}
            />
            <View style={styles.cardTitleSection}>
              <Text
                variant="titleSmall"
                style={[styles.fileName, isDark && { color: COLORS.textDark }]}
                numberOfLines={1}
              >
                {item.fileName}
              </Text>
              <Text variant="bodySmall" style={styles.dateText}>
                {dateStr}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatBadge
              label={t('imported', lang)}
              value={item.imported}
              color={COLORS.success}
            />
            <StatBadge
              label={t('skipped', lang)}
              value={item.skipped}
              color={COLORS.warning}
            />
            <StatBadge
              label={t('updated', lang)}
              value={item.updated}
              color={COLORS.primaryLight}
            />
            <StatBadge
              label={t('failed', lang)}
              value={item.failed}
              color={COLORS.error}
            />
          </View>

          {item.canUndo && (
            <Button
              mode="outlined"
              onPress={() => handleUndo(item)}
              icon="undo"
              loading={undoingId === item.id}
              disabled={undoingId === item.id}
              compact
              style={styles.undoButton}
              textColor={COLORS.error}
            >
              {t('undoImport', lang)}
            </Button>
          )}
        </Surface>
      );
    },
    [isDark, lang, handleUndo, undoingId]
  );

  const renderBackupRecord = useCallback(
    ({ item: backup }: { item: BackupRecord }) => {
      const date = new Date(backup.createdAt);
      const dateStr = date.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
          style={[styles.card, isDark && { backgroundColor: COLORS.surfaceDark }]}
          elevation={1}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.exportIconCircle, { backgroundColor: `${formatColor}15` }]}>
              <MaterialCommunityIcons
                name={formatIcon as any}
                size={22}
                color={formatColor}
              />
            </View>
            <View style={styles.cardTitleSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  variant="titleSmall"
                  style={[styles.fileName, isDark && { color: COLORS.textDark }]}
                  numberOfLines={1}
                >
                  {backup.fileName}
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.dateText}>
                {dateStr} &bull; {sizeStr} &bull; {backup.contactCount} {t('contacts', lang)}
              </Text>
            </View>
          </View>

          <View style={styles.exportActions}>
            <Button
              mode="contained"
              onPress={() => handleOpenFile(backup.fileUri)}
              icon="open-in-new"
              compact
              style={[styles.actionBtn, { flex: 1 }]}
              buttonColor={COLORS.primary}
              textColor="#FFFFFF"
              labelStyle={{ fontSize: 12, fontWeight: '700' }}
            >
              {t('openFile', lang)}
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleOpenFile(backup.fileUri)}
              icon="share-variant"
              compact
              style={[styles.actionBtn, { flex: 1 }]}
              textColor={COLORS.primary}
              labelStyle={{ fontSize: 12, fontWeight: '700' }}
            >
              {t('shareFile', lang)}
            </Button>
            <Pressable
              onPress={() => handleDeleteBackup(backup)}
              style={styles.deleteBtn}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.error} />
            </Pressable>
          </View>
        </Surface>
      );
    },
    [isDark, lang, handleOpenFile, handleDeleteBackup]
  );

  const onRefresh = useCallback(() => {
    loadHistory();
    loadBackups();
  }, [loadHistory, loadBackups]);

  return (
    <View
      style={[
        styles.container,
        isDark && { backgroundColor: COLORS.backgroundDark },
        { paddingTop: insets.top },
      ]}
    >
      <Text
        variant="headlineSmall"
        style={[styles.headerTitle, isDark && { color: COLORS.textDark }]}
      >
        {t('history', lang)}
      </Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab('imports')}
          style={[
            styles.tab,
            activeTab === 'imports' && styles.tabActive,
            activeTab === 'imports' && { borderBottomColor: COLORS.primary },
          ]}
        >
          <MaterialCommunityIcons
            name="file-import-outline"
            size={18}
            color={activeTab === 'imports' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[
            styles.tabLabel,
            activeTab === 'imports' && { color: COLORS.primary, fontWeight: '700' },
            isDark && activeTab !== 'imports' && { color: COLORS.textSecondaryDark },
          ]}>
            {t('import', lang)} ({records.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('exports')}
          style={[
            styles.tab,
            activeTab === 'exports' && styles.tabActive,
            activeTab === 'exports' && { borderBottomColor: COLORS.primary },
          ]}
        >
          <MaterialCommunityIcons
            name="file-export-outline"
            size={18}
            color={activeTab === 'exports' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[
            styles.tabLabel,
            activeTab === 'exports' && { color: COLORS.primary, fontWeight: '700' },
            isDark && activeTab !== 'exports' && { color: COLORS.textSecondaryDark },
          ]}>
            {t('export', lang)} ({backups.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'imports' ? (
        <FlatList
          data={records}
          renderItem={renderImportRecord}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            isLoaded ? (
              <EmptyState
                icon="history"
                title={t('noRecentImports', lang)}
                message="Your import history will appear here"
              />
            ) : (
              <ActivityIndicator style={styles.loader} />
            )
          }
        />
      ) : (
        <FlatList
          data={backups}
          renderItem={renderBackupRecord}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            backupsLoaded ? (
              <EmptyState
                icon="cloud-download-outline"
                title={t('noExportedFiles', lang)}
                message="Your exported files will appear here"
              />
            ) : (
              <ActivityIndicator style={styles.loader} />
            )
          }
        />
      )}
    </View>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  if (value === 0) return null;
  return (
    <View style={badgeStyles.container}>
      <Text style={[badgeStyles.value, { color }]}>{value}</Text>
      <Text style={badgeStyles.label}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  value: {
    fontWeight: '800',
    fontSize: 16,
  },
  label: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.text,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitleSection: {
    flex: 1,
  },
  fileName: {
    fontWeight: '700',
    color: COLORS.text,
  },
  dateText: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 12,
    gap: 8,
  },
  undoButton: {
    marginTop: 12,
    borderColor: COLORS.error,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  exportIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    borderRadius: RADIUS.sm,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  loader: {
    marginTop: 48,
  },
});
