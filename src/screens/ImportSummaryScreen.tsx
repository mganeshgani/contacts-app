/**
 * ImportSummaryScreen - Shows results after import completes
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Button, Surface, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import type { RootStackParamList } from '../types';
import { useContactsStore, useHistoryStore, useSettingsStore } from '../store';
import { useImport } from '../hooks/useImport';
import { COLORS } from '../constants';
import { t } from '../i18n';
import { generateCSV, generateVCF } from '../utils/fileParser';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SummaryRouteProp = RouteProp<RootStackParamList, 'ImportSummary'>;

export function ImportSummaryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SummaryRouteProp>();
  const insets = useSafeAreaInsets();
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  const { recordId } = route.params;
  const records = useHistoryStore((s) => s.records);
  const record = useMemo(
    () => records.find((r) => r.id === recordId),
    [records, recordId]
  );
  const contacts = useContactsStore((s) => s.contacts);
  const resetContacts = useContactsStore((s) => s.reset);
  const { undoLastImport } = useImport();

  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = useCallback(async () => {
    if (!record || !record.canUndo) return;

    Alert.alert(
      t('undoImport', lang),
      t('undoConfirm', lang, { count: record.contactIds.length }),
      [
        { text: t('no', lang), style: 'cancel' },
        {
          text: t('yes', lang),
          style: 'destructive',
          onPress: async () => {
            setIsUndoing(true);
            try {
              const result = await undoLastImport(record.id);
              try {
                await Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
              } catch {
                // Haptics not available
              }
              Toast.show({
                type: 'success',
                text1: t('undoSuccess', lang, { count: result.removed }),
                visibilityTime: 2000,
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: t('genericError', lang),
                visibilityTime: 3000,
              });
            } finally {
              setIsUndoing(false);
            }
          },
        },
      ]
    );
  }, [record, undoLastImport, lang]);

  const handleShareLog = useCallback(async () => {
    if (!record) return;

    try {
      const log = [
        `Import Summary - ${record.fileName}`,
        `Date: ${new Date(record.date).toLocaleString()}`,
        `Total: ${record.totalRows}`,
        `Imported: ${record.imported}`,
        `Skipped: ${record.skipped}`,
        `Updated: ${record.updated}`,
        `Failed: ${record.failed}`,
      ].join('\n');

      const uri = FileSystem.documentDirectory + 'import_log.txt';
      await FileSystem.writeAsStringAsync(uri, log);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not share log',
        visibilityTime: 2000,
      });
    }
  }, [record]);

  const handleExportVCF = useCallback(async () => {
    try {
      const validContacts = contacts.filter((c) => c.isValid);
      const vcf = generateVCF(validContacts);
      const uri = FileSystem.documentDirectory + 'contacts.vcf';
      await FileSystem.writeAsStringAsync(uri, vcf);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/vcard' });
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Could not export VCF',
        visibilityTime: 2000,
      });
    }
  }, [contacts]);

  const handleExportCSV = useCallback(async () => {
    try {
      const validContacts = contacts.filter((c) => c.isValid);
      const csv = generateCSV(validContacts);
      const uri = FileSystem.documentDirectory + 'contacts.csv';
      await FileSystem.writeAsStringAsync(uri, csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv' });
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Could not export CSV',
        visibilityTime: 2000,
      });
    }
  }, [contacts]);

  const handleDone = useCallback(() => {
    resetContacts();
    navigation.navigate('MainTabs');
  }, [resetContacts, navigation]);

  if (!record) {
    return (
      <View style={styles.container}>
        <Text variant="bodyMedium">Record not found</Text>
      </View>
    );
  }

  const isSuccess = record.failed === 0;

  return (
    <View
      style={[
        styles.container,
        isDark && { backgroundColor: COLORS.backgroundDark },
        { paddingTop: insets.top },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success/Error Icon */}
        <MaterialCommunityIcons
          name={isSuccess ? 'check-circle' : 'alert-circle'}
          size={80}
          color={isSuccess ? COLORS.success : COLORS.warning}
        />

        <Text
          variant="headlineMedium"
          style={[styles.title, isDark && { color: COLORS.textDark }]}
        >
          {t('summaryTitle', lang)}
        </Text>

        <Text
          variant="bodyMedium"
          style={[styles.subtitle, isDark && { color: COLORS.textSecondaryDark }]}
        >
          {record.fileName}
        </Text>

        {/* Stats Card */}
        <Surface
          style={[styles.statsCard, isDark && { backgroundColor: COLORS.surfaceDark }]}
          elevation={2}
        >
          <SummaryRow
            icon="check-circle"
            label={t('imported', lang)}
            value={record.imported}
            color={COLORS.success}
            isDark={isDark}
          />
          <Divider style={styles.rowDivider} />
          <SummaryRow
            icon="pencil"
            label={t('updated', lang)}
            value={record.updated}
            color={COLORS.primaryLight}
            isDark={isDark}
          />
          <Divider style={styles.rowDivider} />
          <SummaryRow
            icon="skip-next"
            label={t('skipped', lang)}
            value={record.skipped}
            color={COLORS.warning}
            isDark={isDark}
          />
          <Divider style={styles.rowDivider} />
          <SummaryRow
            icon="alert-circle"
            label={t('failed', lang)}
            value={record.failed}
            color={COLORS.error}
            isDark={isDark}
          />
        </Surface>

        {/* Actions */}
        <View style={styles.actions}>
          {record.canUndo && (
            <Button
              mode="outlined"
              onPress={handleUndo}
              icon="undo"
              loading={isUndoing}
              disabled={isUndoing}
              style={styles.actionButton}
              textColor={COLORS.error}
            >
              {t('undoImport', lang)}
            </Button>
          )}

          <Button
            mode="outlined"
            onPress={handleShareLog}
            icon="share-variant"
            style={styles.actionButton}
          >
            {t('shareLog', lang)}
          </Button>

          <Button
            mode="outlined"
            onPress={handleExportVCF}
            icon="card-account-details"
            style={styles.actionButton}
          >
            {t('exportVCF', lang)}
          </Button>

          <Button
            mode="outlined"
            onPress={handleExportCSV}
            icon="file-delimited"
            style={styles.actionButton}
          >
            {t('exportCSV', lang)}
          </Button>
        </View>

        {/* Done Button */}
        <Button
          mode="contained"
          onPress={handleDone}
          style={styles.doneButton}
          labelStyle={styles.doneButtonLabel}
          contentStyle={styles.doneButtonContent}
        >
          {t('done', lang)}
        </Button>
      </ScrollView>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  color,
  isDark,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  isDark: boolean;
}) {
  return (
    <View style={summaryStyles.row}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      <Text
        variant="bodyLarge"
        style={[summaryStyles.label, isDark && { color: COLORS.textDark }]}
      >
        {label}
      </Text>
      <Text variant="titleLarge" style={[summaryStyles.value, { color }]}>
        {value}
      </Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  label: {
    flex: 1,
    marginLeft: 12,
    color: '#1E293B',
  },
  value: {
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  subtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  statsCard: {
    width: '100%',
    borderRadius: 16,
    marginTop: 24,
    overflow: 'hidden',
  },
  rowDivider: {
    marginHorizontal: 16,
  },
  actions: {
    width: '100%',
    marginTop: 24,
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
  },
  doneButton: {
    marginTop: 32,
    borderRadius: 12,
    width: '100%',
    elevation: 4,
  },
  doneButtonLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  doneButtonContent: {
    paddingVertical: 8,
  },
});
