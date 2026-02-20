/**
 * PermissionGate - Checks and prompts for contacts permission
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePermissions } from '../hooks/usePermissions';
import { COLORS, RADIUS, SHADOWS } from '../constants';
import { useSettingsStore } from '../store';
import { t } from '../i18n';

interface PermissionGateProps {
  children: React.ReactNode;
}

export function PermissionGate({ children }: PermissionGateProps) {
  const { hasPermission, canAskAgain, isChecking, requestPermission, openSettings } =
    usePermissions();
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  if (isChecking) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons
          name="loading"
          size={48}
          color={COLORS.primary}
        />
        <Text variant="bodyMedium" style={styles.loadingText}>
          {t('loading', lang)}
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, isDark && { backgroundColor: COLORS.backgroundDark }]}>
        <Surface
          style={[styles.card, isDark && { backgroundColor: COLORS.surfaceDark }]}
          elevation={2}
        >
          <MaterialCommunityIcons
            name="shield-lock-outline"
            size={64}
            color={COLORS.primary}
          />

          <Text
            variant="headlineSmall"
            style={[styles.title, isDark && { color: COLORS.textDark }]}
          >
            {canAskAgain
              ? t('permissionRequired', lang)
              : t('permissionDenied', lang)}
          </Text>

          <Text
            variant="bodyMedium"
            style={[styles.message, isDark && { color: COLORS.textSecondaryDark }]}
          >
            {canAskAgain
              ? t('permissionMessage', lang)
              : t('permissionDeniedMessage', lang)}
          </Text>

          {canAskAgain ? (
            <Button
              mode="contained"
              onPress={requestPermission}
              icon="shield-check"
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              {t('grantPermission', lang)}
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={openSettings}
              icon="cog"
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              {t('openSettings', lang)}
            </Button>
          )}
        </Surface>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  card: {
    padding: 32,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    ...SHADOWS.md,
  },
  title: {
    marginTop: 16,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  button: {
    marginTop: 24,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
  },
  buttonLabel: {
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
});
