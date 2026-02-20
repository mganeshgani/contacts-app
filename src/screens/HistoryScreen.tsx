/**
 * HistoryScreen - Shows import history with undo option
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { Text, Surface, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import type { ImportRecord } from '../types';
import { useHistoryStore, useSettingsStore } from '../store';
import { useImport } from '../hooks/useImport';
import { EmptyState } from '../components';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { t } from '../i18n';

export function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  const { records, isLoaded, loadHistory } = useHistoryStore();
  const { undoLastImport } = useImport();
  const [undoingId, setUndoingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) loadHistory();
  }, [isLoaded, loadHistory]);

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

  const renderRecord = useCallback(
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

      <FlatList
        data={records}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadHistory} />
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
  loader: {
    marginTop: 48,
  },
});
