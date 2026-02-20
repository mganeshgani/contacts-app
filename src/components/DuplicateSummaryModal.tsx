/**
 * DuplicateSummaryModal - Shows duplicate detection results with bulk actions
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Button, Surface, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { DuplicateAction, DuplicateCheckResult } from '../types';
import { COLORS } from '../constants';
import { useSettingsStore } from '../store';
import { t } from '../i18n';

interface DuplicateSummaryModalProps {
  visible: boolean;
  onDismiss: () => void;
  result: DuplicateCheckResult | null;
  onBulkAction: (action: DuplicateAction) => void;
  onProceed: () => void;
}

export function DuplicateSummaryModal({
  visible,
  onDismiss,
  result,
  onBulkAction,
  onProceed,
}: DuplicateSummaryModalProps) {
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  if (!result) return null;

  const { newContacts, duplicates, totalExisting } = result;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          isDark && { backgroundColor: COLORS.surfaceDark },
        ]}
      >
        <MaterialCommunityIcons
          name="account-search"
          size={48}
          color={COLORS.primary}
          style={styles.icon}
        />

        <Text
          variant="headlineSmall"
          style={[styles.title, isDark && { color: COLORS.textDark }]}
        >
          {t('duplicateTitle', lang)}
        </Text>

        <Text
          variant="bodyMedium"
          style={[styles.subtitle, isDark && { color: COLORS.textSecondaryDark }]}
        >
          {t('duplicateMessage', lang, { count: duplicates.length })}
        </Text>

        <Surface style={styles.statsCard} elevation={1}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="account-plus"
                size={24}
                color={COLORS.success}
              />
              <Text variant="titleLarge" style={[styles.statValue, { color: COLORS.success }]}>
                {newContacts.length}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>
                {t('newContacts', lang)}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="content-copy"
                size={24}
                color={COLORS.warning}
              />
              <Text variant="titleLarge" style={[styles.statValue, { color: COLORS.warning }]}>
                {duplicates.length}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>
                {t('duplicates', lang)}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="contacts"
                size={24}
                color={COLORS.textSecondary}
              />
              <Text variant="titleLarge" style={styles.statValue}>
                {totalExisting}
              </Text>
              <Text variant="labelSmall" style={styles.statLabel}>
                {t('contacts', lang)}
              </Text>
            </View>
          </View>
        </Surface>

        {duplicates.length > 0 && (
          <>
            <Text
              variant="titleSmall"
              style={[styles.actionTitle, isDark && { color: COLORS.textDark }]}
            >
              Bulk action for duplicates:
            </Text>

            <View style={styles.bulkActions}>
              <Button
                mode="outlined"
                onPress={() => onBulkAction('skip')}
                icon="skip-next"
                compact
                style={styles.actionButton}
              >
                {t('skipAll', lang)}
              </Button>
              <Button
                mode="outlined"
                onPress={() => onBulkAction('update')}
                icon="pencil"
                compact
                style={styles.actionButton}
              >
                {t('updateAll', lang)}
              </Button>
              <Button
                mode="outlined"
                onPress={() => onBulkAction('force_add')}
                icon="plus"
                compact
                style={styles.actionButton}
              >
                {t('forceAddAll', lang)}
              </Button>
            </View>
          </>
        )}

        <Divider style={styles.divider} />

        <View style={styles.buttonRow}>
          <Button mode="outlined" onPress={onDismiss} style={styles.button}>
            {t('cancel', lang)}
          </Button>
          <Button mode="contained" onPress={onProceed} style={styles.button}>
            {t('startImport', lang)}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E2E8F0',
  },
  statValue: {
    fontWeight: '700',
    marginTop: 4,
    color: '#1E293B',
  },
  statLabel: {
    color: '#64748B',
    marginTop: 2,
  },
  actionTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#1E293B',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    borderRadius: 8,
  },
  divider: {
    marginVertical: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    borderRadius: 8,
    minWidth: 100,
  },
});
