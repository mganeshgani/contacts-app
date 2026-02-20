/**
 * EditContactModal - Modal for editing a single contact row
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, TextInput, Button } from 'react-native-paper';
import type { ContactRow } from '../types';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { useSettingsStore } from '../store';
import { t } from '../i18n';
import { validateName, validateEmail } from '../utils/validators';
import { validatePhone, normalizePhone } from '../utils/phoneUtils';

interface EditContactModalProps {
  visible: boolean;
  onDismiss: () => void;
  contact: ContactRow | null;
  onSave: (id: string, updates: Partial<ContactRow>) => void;
}

export function EditContactModal({
  visible,
  onDismiss,
  contact,
  onSave,
}: EditContactModalProps) {
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  const [name, setName] = useState(contact?.name || '');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [email, setEmail] = useState(contact?.email || '');
  const [company, setCompany] = useState(contact?.company || '');
  const [notes, setNotes] = useState(contact?.notes || '');

  // Reset form when contact changes
  React.useEffect(() => {
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone);
      setEmail(contact.email || '');
      setCompany(contact.company || '');
      setNotes(contact.notes || '');
      setNameError('');
      setPhoneError('');
      setEmailError('');
    }
  }, [contact]);

  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSave = useCallback(() => {
    if (!contact) return;

    const nameValidation = validateName(name);
    const phoneValidation = validatePhone(phone);
    const emailValidation = email.trim() ? validateEmail(email.trim()) : { valid: true };
    const errors: string[] = [];

    setNameError(nameValidation.valid ? '' : nameValidation.reason || 'Invalid name');
    setPhoneError(phoneValidation.valid ? '' : phoneValidation.reason || 'Invalid phone');
    setEmailError(emailValidation.valid ? '' : emailValidation.reason || 'Invalid email');

    if (!nameValidation.valid) errors.push(nameValidation.reason!);
    if (!phoneValidation.valid) errors.push(phoneValidation.reason!);
    if (!emailValidation.valid) errors.push(emailValidation.reason!);

    // Don't close modal if there are errors - let user fix them
    if (errors.length > 0) return;

    onSave(contact.id, {
      name: name.trim(),
      phone: normalizePhone(phone),
      email: email.trim() || undefined,
      company: company.trim() || undefined,
      notes: notes.trim() || undefined,
      isValid: true,
      validationErrors: [],
    });

    onDismiss();
  }, [contact, name, phone, email, company, notes, onSave, onDismiss]);

  if (!contact) return null;

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
            {t('edit', lang)} {t('contacts', lang)}
          </Text>

          <TextInput
            label={t('nameField', lang) + ' *'}
            value={name}
            onChangeText={(v) => { setName(v); setNameError(''); }}
            mode="outlined"
            style={styles.input}
            error={!!nameError}
            accessibilityLabel="Contact name"
          />
          {!!nameError && (
            <Text variant="bodySmall" style={styles.errorText}>{nameError}</Text>
          )}

          <TextInput
            label={t('phoneField', lang) + ' *'}
            value={phone}
            onChangeText={(v) => { setPhone(v); setPhoneError(''); }}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            error={!!phoneError}
            accessibilityLabel="Contact phone"
          />
          {!!phoneError && (
            <Text variant="bodySmall" style={styles.errorText}>{phoneError}</Text>
          )}

          <TextInput
            label={t('emailField', lang)}
            value={email}
            onChangeText={(v) => { setEmail(v); setEmailError(''); }}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            error={!!emailError}
            accessibilityLabel="Contact email"
          />
          {!!emailError && (
            <Text variant="bodySmall" style={styles.errorText}>{emailError}</Text>
          )}

          <TextInput
            label={t('companyField', lang)}
            value={company}
            onChangeText={setCompany}
            mode="outlined"
            style={styles.input}
            accessibilityLabel="Contact company"
          />

          <TextInput
            label={t('notesField', lang)}
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            accessibilityLabel="Contact notes"
          />

          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={onDismiss} style={styles.button}>
              {t('cancel', lang)}
            </Button>
            <Button mode="contained" onPress={handleSave} style={styles.button}>
              {t('save', lang)}
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
    margin: 20,
    padding: 24,
    borderRadius: RADIUS.xl,
    maxHeight: '85%',
    ...SHADOWS.lg,
  },
  title: {
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  button: {
    borderRadius: RADIUS.md,
    minWidth: 100,
  },
  errorText: {
    color: COLORS.error,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
});
