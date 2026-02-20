/**
 * ColumnMapperModal - Modal for mapping file columns to contact fields
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, Surface, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ColumnMapping } from '../types';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { useSettingsStore } from '../store';
import { hasRequiredMappings } from '../utils/fileParser';
import { t } from '../i18n';

interface ColumnMapperModalProps {
  visible: boolean;
  onDismiss: () => void;
  headers: string[];
  currentMapping: ColumnMapping;
  onApply: (mapping: ColumnMapping) => void;
}

const FIELDS: { key: keyof ColumnMapping; icon: string; required: boolean }[] = [
  { key: 'name', icon: 'account', required: true },
  { key: 'phone', icon: 'phone', required: true },
  { key: 'email', icon: 'email-outline', required: false },
  { key: 'company', icon: 'office-building-outline', required: false },
  { key: 'notes', icon: 'note-text-outline', required: false },
];

export function ColumnMapperModal({
  visible,
  onDismiss,
  headers,
  currentMapping,
  onApply,
}: ColumnMapperModalProps) {
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);
  const [mapping, setMapping] = useState<ColumnMapping>(currentMapping);

  const fieldLabels: Record<keyof ColumnMapping, string> = {
    name: t('nameField', lang),
    phone: t('phoneField', lang),
    email: t('emailField', lang),
    company: t('companyField', lang),
    notes: t('notesField', lang),
  };

  const handleSelect = useCallback(
    (field: keyof ColumnMapping, header: string | null) => {
      setMapping((prev) => ({ ...prev, [field]: header }));
    },
    []
  );

  const handleApply = useCallback(() => {
    onApply(mapping);
    onDismiss();
  }, [mapping, onApply, onDismiss]);

  const isValid = hasRequiredMappings(mapping);

  // Get which headers are already mapped
  const mappedHeaders = new Set(
    Object.values(mapping).filter(Boolean) as string[]
  );

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
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text
            variant="headlineSmall"
            style={[styles.title, isDark && { color: COLORS.textDark }]}
          >
            {t('columnMapperTitle', lang)}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.subtitle, isDark && { color: COLORS.textSecondaryDark }]}
          >
            {t('columnMapperSubtitle', lang)}
          </Text>

          {FIELDS.map((field) => (
            <View key={field.key} style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <MaterialCommunityIcons
                  name={field.icon as any}
                  size={20}
                  color={COLORS.primary}
                />
                <Text
                  variant="titleSmall"
                  style={[styles.fieldLabel, isDark && { color: COLORS.textDark }]}
                >
                  {fieldLabels[field.key]}
                </Text>
                {field.required && (
                  <Chip compact style={styles.requiredChip} textStyle={styles.requiredText}>
                    {t('required', lang)}
                  </Chip>
                )}
              </View>

              <View style={styles.headerChips}>
                <Chip
                  mode={mapping[field.key] === null ? 'flat' : 'outlined'}
                  selected={mapping[field.key] === null}
                  onPress={() => handleSelect(field.key, null)}
                  compact
                  style={styles.chip}
                >
                  {t('noMapping', lang)}
                </Chip>
                {headers.map((header) => {
                  const isSelected = mapping[field.key] === header;
                  const isUsed = mappedHeaders.has(header) && !isSelected;
                  return (
                    <Chip
                      key={header}
                      mode={isSelected ? 'flat' : 'outlined'}
                      selected={isSelected}
                      onPress={() => handleSelect(field.key, header)}
                      compact
                      disabled={isUsed}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                        isUsed && styles.chipDisabled,
                      ]}
                    >
                      {header}
                    </Chip>
                  );
                })}
              </View>
            </View>
          ))}

          {!isValid && (
            <Text variant="bodySmall" style={styles.errorText}>
              {t('requiredFieldsMissing', lang)}
            </Text>
          )}

          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={styles.button}
            >
              {t('cancel', lang)}
            </Button>
            <Button
              mode="contained"
              onPress={handleApply}
              disabled={!isValid}
              style={styles.button}
            >
              {t('applyMapping', lang)}
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 24,
    borderRadius: RADIUS.xl,
    maxHeight: '85%',
    ...SHADOWS.lg,
  },
  title: {
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  fieldSection: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fieldLabel: {
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  requiredChip: {
    backgroundColor: COLORS.errorSoft,
    height: 24,
  },
  requiredText: {
    fontSize: 10,
    color: COLORS.error,
  },
  headerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    marginBottom: 4,
  },
  chipSelected: {
    backgroundColor: COLORS.primarySoft,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  button: {
    borderRadius: RADIUS.md,
    minWidth: 100,
  },
});
