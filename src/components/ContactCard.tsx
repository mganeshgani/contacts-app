/**
 * ContactCard - Displays a single contact row in the preview list
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Checkbox, Chip, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ContactRow, DuplicateAction } from '../types';
import { COLORS } from '../constants';
import { useSettingsStore } from '../store';
import { t } from '../i18n';

interface ContactCardProps {
  contact: ContactRow;
  onToggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (contact: ContactRow) => void;
  onDuplicateAction?: (id: string, action: DuplicateAction) => void;
}

export const ContactCard = memo(function ContactCard({
  contact,
  onToggleSelect,
  onRemove,
  onEdit,
  onDuplicateAction,
}: ContactCardProps) {
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  const handleToggle = useCallback(
    () => onToggleSelect(contact.id),
    [contact.id, onToggleSelect]
  );

  const handleRemove = useCallback(
    () => onRemove(contact.id),
    [contact.id, onRemove]
  );

  const handleEdit = useCallback(
    () => onEdit(contact),
    [contact, onEdit]
  );

  const bgColor = contact.isDuplicate
    ? COLORS.duplicateBg
    : !contact.isValid
      ? '#FEE2E2'
      : isDark
        ? COLORS.surfaceDark
        : COLORS.surface;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: bgColor }]}
      onPress={handleEdit}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Contact ${contact.name}, phone ${contact.phone}`}
    >
      <Checkbox
        status={contact.selected ? 'checked' : 'unchecked'}
        onPress={handleToggle}
        color={COLORS.primary}
      />

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text
            variant="titleSmall"
            style={[styles.name, isDark && styles.nameDark]}
            numberOfLines={1}
          >
            {contact.name}
          </Text>
          {contact.isDuplicate && (
            <Chip
              mode="flat"
              compact
              style={styles.duplicateChip}
              textStyle={styles.duplicateChipText}
            >
              {t('existingContact', lang)}
            </Chip>
          )}
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons
            name="phone"
            size={14}
            color={COLORS.textSecondary}
          />
          <Text
            variant="bodySmall"
            style={[styles.detail, isDark && styles.detailDark]}
          >
            {contact.phone}
          </Text>
        </View>

        {contact.email && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="email-outline"
              size={14}
              color={COLORS.textSecondary}
            />
            <Text
              variant="bodySmall"
              style={[styles.detail, isDark && styles.detailDark]}
              numberOfLines={1}
            >
              {contact.email}
            </Text>
          </View>
        )}

        {contact.company && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="office-building-outline"
              size={14}
              color={COLORS.textSecondary}
            />
            <Text
              variant="bodySmall"
              style={[styles.detail, isDark && styles.detailDark]}
              numberOfLines={1}
            >
              {contact.company}
            </Text>
          </View>
        )}

        {!contact.isValid && contact.validationErrors.length > 0 && (
          <View style={styles.errorRow}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={14}
              color={COLORS.error}
            />
            <Text variant="bodySmall" style={styles.errorText}>
              {contact.validationErrors[0]}
            </Text>
          </View>
        )}

        {contact.isDuplicate && onDuplicateAction && (
          <View style={styles.actionRow}>
            {(['skip', 'update', 'force_add'] as DuplicateAction[]).map(
              (action) => (
                <Chip
                  key={action}
                  mode={contact.duplicateAction === action ? 'flat' : 'outlined'}
                  selected={contact.duplicateAction === action}
                  onPress={() => onDuplicateAction(contact.id, action)}
                  compact
                  style={[
                    styles.actionChip,
                    contact.duplicateAction === action && styles.actionChipActive,
                  ]}
                  textStyle={styles.actionChipText}
                >
                  {action === 'skip'
                    ? t('skip', lang)
                    : action === 'update'
                      ? t('update', lang)
                      : t('forceAdd', lang)}
                </Chip>
              )
            )}
          </View>
        )}
      </View>

      <IconButton
        icon="close"
        size={18}
        onPress={handleRemove}
        accessibilityLabel="Remove contact"
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  content: {
    flex: 1,
    marginLeft: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  nameDark: {
    color: '#F1F5F9',
  },
  duplicateChip: {
    backgroundColor: '#FEF3C7',
    height: 24,
  },
  duplicateChipText: {
    fontSize: 10,
    color: '#92400E',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  detail: {
    color: '#64748B',
  },
  detailDark: {
    color: '#94A3B8',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  actionChip: {
    height: 28,
  },
  actionChipActive: {
    backgroundColor: '#DBEAFE',
  },
  actionChipText: {
    fontSize: 11,
  },
});
