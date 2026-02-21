/**
 * SettingsScreen - App settings with dark mode, language, etc.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput as RNTextInput } from 'react-native';
import { Text, Switch, Surface, Divider, List, Button, RadioButton, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useSettingsStore } from '../store';
import { clearAllData } from '../services/storageService';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { t, Language } from '../i18n';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { darkMode, language: lang, defaultCountryCode, autoSkipDuplicates, batchSize } = settings;
  const isDark = darkMode;

  const PRESET_SIZES = [100, 500, 1000, 2000, 5000];
  const isCustomSize = !PRESET_SIZES.includes(batchSize);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState(isCustomSize ? String(batchSize) : '');

  const handleToggleDarkMode = useCallback(
    (value: boolean) => {
      updateSettings({ darkMode: value });
    },
    [updateSettings]
  );

  const handleLanguageChange = useCallback(
    (value: string) => {
      updateSettings({ language: value as Language });
    },
    [updateSettings]
  );

  const handleCountryCodeChange = useCallback(
    (value: string) => {
      updateSettings({ defaultCountryCode: value });
    },
    [updateSettings]
  );

  const handleAutoSkipToggle = useCallback(
    (value: boolean) => {
      updateSettings({ autoSkipDuplicates: value });
    },
    [updateSettings]
  );

  const handleBatchSizeChange = useCallback(
    (size: number) => {
      setShowCustomInput(false);
      updateSettings({ batchSize: size });
    },
    [updateSettings]
  );

  const handleCustomBatchSize = useCallback(() => {
    setShowCustomInput(true);
    setCustomValue(isCustomSize ? String(batchSize) : '');
  }, [isCustomSize, batchSize]);

  const handleCustomValueSubmit = useCallback(() => {
    const parsed = parseInt(customValue, 10);
    if (!parsed || parsed < 1) {
      Toast.show({ type: 'error', text1: 'Invalid batch size', text2: 'Enter a number between 1 and 50000' });
      return;
    }
    const clamped = Math.min(Math.max(parsed, 1), 50000);
    updateSettings({ batchSize: clamped });
    setShowCustomInput(false);
  }, [customValue, updateSettings]);

  const handleClearData = useCallback(() => {
    Alert.alert(
      t('clearCache', lang),
      t('clearCacheConfirm', lang),
      [
        { text: t('no', lang), style: 'cancel' },
        {
          text: t('yes', lang),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              await resetSettings();
              Toast.show({
                type: 'success',
                text1: 'All data cleared',
                visibilityTime: 2000,
              });
            } catch {
              Toast.show({
                type: 'error',
                text1: t('genericError', lang),
                visibilityTime: 3000,
              });
            }
          },
        },
      ]
    );
  }, [lang, resetSettings]);

  const bgColor = isDark ? COLORS.backgroundDark : COLORS.background;
  const cardBg = isDark ? COLORS.surfaceDark : COLORS.surface;
  const textColor = isDark ? COLORS.textDark : COLORS.text;
  const subtextColor = isDark ? COLORS.textSecondaryDark : COLORS.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top }]}>
      <Text variant="headlineSmall" style={[styles.headerTitle, { color: textColor }]}>
        {t('settings', lang)}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Appearance */}
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: subtextColor }]}>
          Appearance
        </Text>
        <Surface style={[styles.section, { backgroundColor: cardBg }]} elevation={1}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons
                name="weather-night"
                size={22}
                color={COLORS.primary}
              />
              <Text variant="bodyLarge" style={[styles.settingLabel, { color: textColor }]}>
                {t('darkMode', lang)}
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={handleToggleDarkMode}
              color={COLORS.primary}
            />
          </View>

          <Divider />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons
                name="translate"
                size={22}
                color={COLORS.primary}
              />
              <Text variant="bodyLarge" style={[styles.settingLabel, { color: textColor }]}>
                {t('language', lang)}
              </Text>
            </View>
          </View>
          <View style={styles.radioGroup}>
            <RadioButton.Group onValueChange={handleLanguageChange} value={lang}>
              <View style={styles.radioRow}>
                <RadioButton.Item
                  label={t('english', lang)}
                  value="en"
                  labelStyle={[styles.radioLabel, { color: textColor }]}
                />
              </View>
              <View style={styles.radioRow}>
                <RadioButton.Item
                  label={t('tamil', lang)}
                  value="ta"
                  labelStyle={[styles.radioLabel, { color: textColor }]}
                />
              </View>
              <View style={styles.radioRow}>
                <RadioButton.Item
                  label={t('hindi', lang)}
                  value="hi"
                  labelStyle={[styles.radioLabel, { color: textColor }]}
                />
              </View>
              <View style={styles.radioRow}>
                <RadioButton.Item
                  label={t('telugu', lang)}
                  value="te"
                  labelStyle={[styles.radioLabel, { color: textColor }]}
                />
              </View>
              <View style={styles.radioRow}>
                <RadioButton.Item
                  label={t('malayalam', lang)}
                  value="ml"
                  labelStyle={[styles.radioLabel, { color: textColor }]}
                />
              </View>
            </RadioButton.Group>
          </View>
        </Surface>

        {/* Import Settings */}
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: subtextColor }]}>
          Import
        </Text>
        <Surface style={[styles.section, { backgroundColor: cardBg }]} elevation={1}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons
                name="flag"
                size={22}
                color={COLORS.primary}
              />
              <Text variant="bodyLarge" style={[styles.settingLabel, { color: textColor }]}>
                {t('defaultCountryCode', lang)}
              </Text>
            </View>
          </View>
          <View style={styles.countryCodeRow}>
            {['+91', '+1', '+44', '+971'].map((code) => (
              <Button
                key={code}
                mode={defaultCountryCode === code ? 'contained' : 'outlined'}
                onPress={() => handleCountryCodeChange(code)}
                compact
                style={styles.codeButton}
              >
                {code}
              </Button>
            ))}
          </View>

          <Divider />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons
                name="content-copy"
                size={22}
                color={COLORS.primary}
              />
              <Text variant="bodyLarge" style={[styles.settingLabel, { color: textColor }]}>
                {t('autoSkipDuplicates', lang)}
              </Text>
            </View>
            <Switch
              value={autoSkipDuplicates}
              onValueChange={handleAutoSkipToggle}
              color={COLORS.primary}
            />
          </View>

          <Divider />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons
                name="layers-triple"
                size={22}
                color={COLORS.primary}
              />
              <Text variant="bodyLarge" style={[styles.settingLabel, { color: textColor }]}>
                {t('batchSize', lang)}
              </Text>
            </View>
          </View>
          <View style={styles.batchRow}>
            {PRESET_SIZES.map((size) => (
              <Button
                key={size}
                mode={batchSize === size ? 'contained' : 'outlined'}
                onPress={() => handleBatchSizeChange(size)}
                compact
                style={styles.codeButton}
              >
                {String(size)}
              </Button>
            ))}
            <Button
              mode={isCustomSize || showCustomInput ? 'contained' : 'outlined'}
              onPress={handleCustomBatchSize}
              compact
              style={styles.codeButton}
            >
              {isCustomSize && !showCustomInput ? String(batchSize) : 'Custom'}
            </Button>
          </View>
          {showCustomInput && (
            <View style={styles.customInputRow}>
              <TextInput
                mode="outlined"
                label="Batch size (1–50000)"
                keyboardType="number-pad"
                value={customValue}
                onChangeText={setCustomValue}
                onSubmitEditing={handleCustomValueSubmit}
                style={styles.customInput}
                dense
                maxLength={4}
              />
              <Button
                mode="contained"
                onPress={handleCustomValueSubmit}
                compact
                style={styles.customApplyBtn}
              >
                Apply
              </Button>
            </View>
          )}
        </Surface>

        {/* Data */}
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: subtextColor }]}>
          Data
        </Text>
        <Surface style={[styles.section, { backgroundColor: cardBg }]} elevation={1}>
          <List.Item
            title={t('clearCache', lang)}
            titleStyle={{ color: COLORS.error }}
            left={(props) => (
              <List.Icon
                {...props}
                icon="delete-outline"
                color={COLORS.error}
              />
            )}
            onPress={handleClearData}
          />
        </Surface>

        {/* Privacy */}
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: subtextColor }]}>
          {t('privacy', lang)}
        </Text>
        <Surface style={[styles.section, { backgroundColor: cardBg }]} elevation={1}>
          <View style={styles.privacyRow}>
            <MaterialCommunityIcons name="shield-check" size={22} color={COLORS.success} />
            <View style={styles.privacyTextCol}>
              <Text variant="bodyMedium" style={[styles.settingLabel, { color: textColor }]}>
                {t('dataLocal', lang)}
              </Text>
              <Text variant="bodySmall" style={{ color: subtextColor, marginTop: 2 }}>
                {t('privacyMessage', lang)}
              </Text>
            </View>
          </View>
          <Divider />
          <View style={styles.privacyRow}>
            <MaterialCommunityIcons name="server-off" size={22} color={COLORS.success} />
            <Text variant="bodyMedium" style={[styles.settingLabel, { color: textColor }]}>
              {t('noServerUpload', lang)}
            </Text>
          </View>
          <Divider />
          <View style={styles.privacyRow}>
            <MaterialCommunityIcons name="eye-off" size={22} color={COLORS.success} />
            <Text variant="bodyMedium" style={[styles.settingLabel, { color: textColor }]}>
              {t('noTracking', lang)}
            </Text>
          </View>
        </Surface>

        {/* About */}
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: subtextColor }]}>
          {t('about', lang)}
        </Text>
        <Surface style={[styles.section, { backgroundColor: cardBg }]} elevation={1}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons
                name="information-outline"
                size={22}
                color={COLORS.primary}
              />
              <Text variant="bodyLarge" style={[styles.settingLabel, { color: textColor }]}>
                Smart Contacts
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ color: subtextColor }}>
              v1.0.0
            </Text>
          </View>
        </Surface>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: subtextColor, textAlign: 'center' }}>
            All data is processed locally on your device.{'\n'}No data is sent to any server.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },
  section: {
    marginHorizontal: 12,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    flex: 1,
  },
  radioGroup: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  radioRow: {
    marginLeft: 24,
  },
  radioLabel: {
    fontSize: 14,
  },
  countryCodeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  batchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  customInputRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    maxWidth: 160,
  },
  customApplyBtn: {
    borderRadius: RADIUS.sm,
    alignSelf: 'center',
  },
  codeButton: {
    borderRadius: RADIUS.sm,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  privacyTextCol: {
    flex: 1,
  },
  footer: {
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
});
