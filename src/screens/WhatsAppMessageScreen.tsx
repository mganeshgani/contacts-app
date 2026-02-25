/**
 * WhatsAppMessageScreen - Bulk WhatsApp messaging for imported contacts
 *
 * Allows users to:
 * 1. Select/deselect all imported contacts or individual ones
 * 2. Paste a WhatsApp group invite link to share
 * 3. Type a custom message
 * 4. Send the message or group link to all selected contacts via WhatsApp
 *
 * Uses the WhatsApp deep-link API: https://wa.me/<phone>?text=<message>
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Linking,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { Text, Button, Surface, Checkbox, Divider, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

import type { RootStackParamList, WhatsAppContact } from '../types';
import { useContactsStore, useHistoryStore, useSettingsStore } from '../store';
import { COLORS, SHADOWS, RADIUS } from '../constants';
import { t } from '../i18n';
import { normalizePhone } from '../utils/phoneUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type WhatsAppRouteProp = RouteProp<RootStackParamList, 'WhatsAppMessage'>;

/** Delay between each WhatsApp open to avoid OS throttling */
const SEND_DELAY_MS = 1500;

/**
 * Build a WhatsApp deep link for a phone number with optional text.
 * Uses wa.me which works on both iOS and Android.
 */
function buildWhatsAppUrl(phone: string, text?: string): string {
  // Normalize: remove spaces, dashes, parentheses, ensure starts with country code
  let cleaned = phone.replace(/[\s\-()]/g, '');
  // Remove leading + for wa.me format
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // If 10 digits (Indian number without country code), prepend 91
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }

  let url = `https://wa.me/${cleaned}`;
  if (text && text.trim().length > 0) {
    url += `?text=${encodeURIComponent(text.trim())}`;
  }
  return url;
}

export function WhatsAppMessageScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WhatsAppRouteProp>();
  const insets = useSafeAreaInsets();
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);

  const { contactIds, recordId } = route.params ?? {};

  // Build contact list from store data
  const storeContacts = useContactsStore((s) => s.contacts);
  const historyRecords = useHistoryStore((s) => s.records);

  const [waContacts, setWaContacts] = useState<WhatsAppContact[]>([]);
  const [groupLink, setGroupLink] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  // Initialize contacts from the import store or history record
  useEffect(() => {
    let contacts: WhatsAppContact[] = [];

    if (storeContacts.length > 0) {
      // Use contacts from the current import session
      contacts = storeContacts
        .filter((c) => c.isValid && c.phone)
        .map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          selected: contactIds ? contactIds.includes(c.id) : true,
        }));
    } else if (contactIds && contactIds.length > 0) {
      // If we got contact IDs but store is empty, build minimal entries
      // This happens when navigating from history
      contacts = contactIds.map((cid, idx) => ({
        id: cid,
        name: `Contact ${idx + 1}`,
        phone: '',
        selected: true,
      }));
    }

    setWaContacts(contacts);
  }, [storeContacts, contactIds]);

  const selectedCount = useMemo(
    () => waContacts.filter((c) => c.selected).length,
    [waContacts]
  );

  const allSelected = waContacts.length > 0 && selectedCount === waContacts.length;

  const toggleSelectAll = useCallback(() => {
    setWaContacts((prev) =>
      prev.map((c) => ({ ...c, selected: !allSelected }))
    );
  }, [allSelected]);

  const toggleContact = useCallback((id: string) => {
    setWaContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  }, []);

  const hasValidInput = useMemo(() => {
    const hasGroupLink = groupLink.trim().length > 0;
    const hasMessage = message.trim().length > 0;
    return hasGroupLink || hasMessage;
  }, [groupLink, message]);

  /** Build the combined message text from group link + message inputs */
  const buildMessageText = useCallback((): string => {
    let textToSend = '';
    if (message.trim().length > 0 && groupLink.trim().length > 0) {
      textToSend = `${message.trim()}\n\n${groupLink.trim()}`;
    } else if (message.trim().length > 0) {
      textToSend = message.trim();
    } else if (groupLink.trim().length > 0) {
      textToSend = groupLink.trim();
    }
    return textToSend;
  }, [message, groupLink]);

  /**
   * PRIMARY: Open WhatsApp with the message pre-filled but WITHOUT a phone number.
   * This opens WhatsApp's native contact/group picker where the user can
   * select MULTIPLE recipients and send the message in one action.
   */
  const handleOpenInWhatsApp = useCallback(async () => {
    const textToSend = buildMessageText();
    if (!textToSend) {
      Toast.show({
        type: 'info',
        text1: t('whatsappNoMessage', lang),
      });
      return;
    }

    try {
      // whatsapp://send?text=... opens WhatsApp's multi-recipient picker
      const url = `whatsapp://send?text=${encodeURIComponent(textToSend)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Haptics not available
        }
      } else {
        // Fallback: try https://wa.me/?text=...
        const fallbackUrl = `https://wa.me/?text=${encodeURIComponent(textToSend)}`;
        const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
        if (canOpenFallback) {
          await Linking.openURL(fallbackUrl);
        } else {
          Toast.show({
            type: 'error',
            text1: t('whatsappNotInstalled', lang),
          });
        }
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('whatsappNotInstalled', lang),
      });
    }
  }, [buildMessageText, lang]);

  /** Copy message text to clipboard */
  const handleCopyMessage = useCallback(async () => {
    const textToSend = buildMessageText();
    if (!textToSend) {
      Toast.show({
        type: 'info',
        text1: t('whatsappNoMessage', lang),
      });
      return;
    }

    await Clipboard.setStringAsync(textToSend);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics not available
    }
    Toast.show({
      type: 'success',
      text1: t('whatsappCopied', lang),
    });
  }, [buildMessageText, lang]);

  /** Share message via system share sheet */
  const handleShareMessage = useCallback(async () => {
    const textToSend = buildMessageText();
    if (!textToSend) {
      Toast.show({
        type: 'info',
        text1: t('whatsappNoMessage', lang),
      });
      return;
    }

    try {
      await Share.share({ message: textToSend });
    } catch (error) {
      // User cancelled or error
    }
  }, [buildMessageText, lang]);

  /**
   * FALLBACK: Send message/group link to all selected contacts one by one via WhatsApp deep links.
   * Each contact opens WhatsApp with the pre-filled message for that specific person.
   */
  const handleSendOneByOne = useCallback(async () => {
    const selected = waContacts.filter((c) => c.selected && c.phone);

    if (selected.length === 0) {
      Toast.show({
        type: 'info',
        text1: t('whatsappNoContacts', lang),
        text2: t('whatsappNoContactsMessage', lang),
      });
      return;
    }

    const textToSend = buildMessageText();
    if (!textToSend) {
      Toast.show({
        type: 'info',
        text1: t('whatsappNoMessage', lang),
      });
      return;
    }

    // Confirm before sending one-by-one
    Alert.alert(
      t('whatsappSendOneByOne', lang),
      t('whatsappOneByOneDesc', lang),
      [
        { text: t('cancel', lang), style: 'cancel' },
        {
          text: t('confirm', lang),
          onPress: async () => {
            setIsSending(true);
            setSendProgress({ current: 0, total: selected.length });

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < selected.length; i++) {
              const contact = selected[i];
              setSendProgress({ current: i + 1, total: selected.length });

              try {
                const url = buildWhatsAppUrl(contact.phone, textToSend);
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                  successCount++;
                } else {
                  const fallbackUrl = `whatsapp://send?phone=${contact.phone.replace(/[\s\-()]/g, '').replace(/^\+/, '')}&text=${encodeURIComponent(textToSend)}`;
                  const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
                  if (canOpenFallback) {
                    await Linking.openURL(fallbackUrl);
                    successCount++;
                  } else {
                    failCount++;
                  }
                }

                if (i < selected.length - 1) {
                  await new Promise((r) => setTimeout(r, SEND_DELAY_MS));
                }
              } catch (error) {
                failCount++;
                console.warn(`Failed to open WhatsApp for ${contact.name}:`, error);
              }
            }

            setIsSending(false);

            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              // Haptics not available
            }

            if (successCount > 0) {
              Toast.show({
                type: 'success',
                text1: t('whatsappDone', lang, { count: successCount }),
                visibilityTime: 3000,
              });
            }
            if (failCount > 0) {
              Toast.show({
                type: 'error',
                text1: `${failCount} contacts could not be reached`,
                visibilityTime: 3000,
              });
            }
          },
        },
      ]
    );
  }, [waContacts, buildMessageText, lang]);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  }, [navigation]);

  const renderContact = useCallback(
    ({ item }: { item: WhatsAppContact }) => (
      <Pressable
        onPress={() => toggleContact(item.id)}
        style={({ pressed }) => [
          styles.contactRow,
          isDark && styles.contactRowDark,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Checkbox
          status={item.selected ? 'checked' : 'unchecked'}
          onPress={() => toggleContact(item.id)}
          color={COLORS.success}
        />
        <View style={styles.contactInfo}>
          <Text
            variant="bodyLarge"
            style={[styles.contactName, isDark && { color: COLORS.textDark }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.contactPhone, isDark && { color: COLORS.textSecondaryDark }]}
            numberOfLines={1}
          >
            {item.phone}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="whatsapp"
          size={20}
          color="#25D366"
          style={{ marginRight: 8 }}
        />
      </Pressable>
    ),
    [isDark, toggleContact]
  );

  const keyExtractor = useCallback((item: WhatsAppContact) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        {/* Header */}
        <LinearGradient
          colors={['#25D366', '#128C7E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.headerContent}>
            <IconButton
              icon="arrow-left"
              iconColor="#FFFFFF"
              size={24}
              onPress={handleGoBack}
              style={styles.backButton}
            />
            <View style={styles.headerTextContainer}>
              <MaterialCommunityIcons name="whatsapp" size={28} color="#FFFFFF" />
              <Text style={styles.headerTitle}>{t('whatsappTitle', lang)}</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {t('whatsappSubtitle', lang)}
            </Text>
          </View>
        </LinearGradient>

        {/* Group link input */}
        <Surface
          style={[styles.inputCard, isDark && styles.inputCardDark]}
          elevation={2}
        >
          <View style={styles.inputLabelRow}>
            <MaterialCommunityIcons
              name="link-variant"
              size={20}
              color="#25D366"
            />
            <Text
              variant="labelLarge"
              style={[styles.inputLabel, isDark && { color: COLORS.textDark }]}
            >
              {t('whatsappGroupLink', lang)}
            </Text>
          </View>
          <TextInput
            value={groupLink}
            onChangeText={setGroupLink}
            placeholder={t('whatsappGroupLinkPlaceholder', lang)}
            placeholderTextColor={isDark ? COLORS.textSecondaryDark : COLORS.textSecondary}
            style={[
              styles.textInput,
              isDark && styles.textInputDark,
            ]}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="next"
          />
        </Surface>

        {/* Message input */}
        <Surface
          style={[styles.inputCard, isDark && styles.inputCardDark]}
          elevation={2}
        >
          <View style={styles.inputLabelRow}>
            <MaterialCommunityIcons
              name="message-text-outline"
              size={20}
              color="#25D366"
            />
            <Text
              variant="labelLarge"
              style={[styles.inputLabel, isDark && { color: COLORS.textDark }]}
            >
              {t('whatsappMessage', lang)}
            </Text>
          </View>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('whatsappMessagePlaceholder', lang)}
            placeholderTextColor={isDark ? COLORS.textSecondaryDark : COLORS.textSecondary}
            style={[
              styles.textInput,
              styles.textInputMultiline,
              isDark && styles.textInputDark,
            ]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            returnKeyType="default"
          />
        </Surface>

        {/* Select All / Deselect All bar */}
        <View style={styles.selectionBar}>
          <Pressable onPress={toggleSelectAll} style={styles.selectAllRow}>
            <Checkbox
              status={allSelected ? 'checked' : selectedCount > 0 ? 'indeterminate' : 'unchecked'}
              onPress={toggleSelectAll}
              color={COLORS.success}
            />
            <Text
              variant="labelLarge"
              style={[styles.selectAllText, isDark && { color: COLORS.textDark }]}
            >
              {allSelected
                ? t('whatsappDeselectAll', lang)
                : t('whatsappSelectAll', lang)}
            </Text>
          </Pressable>
          <Text
            variant="bodySmall"
            style={[styles.selectedCount, isDark && { color: COLORS.textSecondaryDark }]}
          >
            {t('whatsappSelected', lang, { count: selectedCount })}
          </Text>
        </View>
      </View>
    ),
    [
      lang,
      isDark,
      groupLink,
      message,
      allSelected,
      selectedCount,
      toggleSelectAll,
      handleGoBack,
    ]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && { backgroundColor: COLORS.backgroundDark }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.container]}>
        <FlatList
          data={waContacts}
          renderItem={renderContact}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="whatsapp"
                size={64}
                color={isDark ? COLORS.textSecondaryDark : COLORS.textSecondary}
              />
              <Text
                variant="bodyLarge"
                style={[styles.emptyText, isDark && { color: COLORS.textSecondaryDark }]}
              >
                {t('whatsappNoContacts', lang)}
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 200 },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <Divider />}
        />

        {/* Floating action buttons */}
        {waContacts.length > 0 && (
          <View style={[styles.sendButtonContainer, { bottom: insets.bottom + 16 }]}>
            {isSending ? (
              <Surface style={[styles.progressCard, isDark && styles.progressCardDark]} elevation={4}>
                <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
                <Text
                  variant="bodyMedium"
                  style={[{ flex: 1, marginLeft: 12 }, isDark && { color: COLORS.textDark }]}
                >
                  {t('whatsappSendProgress', lang, {
                    current: sendProgress.current,
                    total: sendProgress.total,
                  })}
                </Text>
              </Surface>
            ) : (
              <View style={styles.actionButtonsColumn}>
                {/* Hint text */}
                <Text
                  variant="bodySmall"
                  style={[styles.bulkNote, isDark && { color: COLORS.textSecondaryDark }]}
                >
                  {t('whatsappBulkNote', lang)}
                </Text>

                {/* Primary: Open in WhatsApp (multi-recipient picker) */}
                <Button
                  mode="contained"
                  onPress={handleOpenInWhatsApp}
                  disabled={!hasValidInput}
                  icon="whatsapp"
                  style={[
                    styles.sendButton,
                    !hasValidInput && styles.sendButtonDisabled,
                  ]}
                  labelStyle={styles.sendButtonLabel}
                  contentStyle={styles.sendButtonContent}
                  buttonColor="#25D366"
                  textColor="#FFFFFF"
                >
                  {t('whatsappOpenInApp', lang)}
                </Button>

                {/* Secondary row: Copy + Share + One-by-One */}
                <View style={styles.secondaryRow}>
                  <Pressable
                    onPress={handleCopyMessage}
                    disabled={!hasValidInput}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      isDark && styles.secondaryButtonDark,
                      !hasValidInput && { opacity: 0.4 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="content-copy"
                      size={18}
                      color={isDark ? COLORS.textDark : COLORS.text}
                    />
                    <Text
                      variant="labelSmall"
                      style={[styles.secondaryButtonText, isDark && { color: COLORS.textDark }]}
                    >
                      {t('whatsappCopyMessage', lang)}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleShareMessage}
                    disabled={!hasValidInput}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      isDark && styles.secondaryButtonDark,
                      !hasValidInput && { opacity: 0.4 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="share-variant"
                      size={18}
                      color={isDark ? COLORS.textDark : COLORS.text}
                    />
                    <Text
                      variant="labelSmall"
                      style={[styles.secondaryButtonText, isDark && { color: COLORS.textDark }]}
                    >
                      {t('whatsappShareMessage', lang)}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSendOneByOne}
                    disabled={!hasValidInput || selectedCount === 0}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      isDark && styles.secondaryButtonDark,
                      (!hasValidInput || selectedCount === 0) && { opacity: 0.4 },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="send-circle-outline"
                      size={18}
                      color={isDark ? COLORS.textDark : COLORS.text}
                    />
                    <Text
                      variant="labelSmall"
                      style={[styles.secondaryButtonText, isDark && { color: COLORS.textDark }]}
                      numberOfLines={1}
                    >
                      {t('whatsappSendOneByOne', lang)}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: 120,
  },
  listHeader: {
    marginBottom: 8,
  },

  /* Header gradient */
  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: -8,
    top: -8,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    textAlign: 'center',
  },

  /* Input cards */
  inputCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: RADIUS.lg,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...SHADOWS.md,
  },
  inputCardDark: {
    backgroundColor: COLORS.surfaceDark,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inputLabel: {
    fontWeight: '700',
    color: COLORS.text,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  textInputDark: {
    borderColor: COLORS.borderDark,
    color: COLORS.textDark,
    backgroundColor: COLORS.backgroundDark,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  /* Selection bar */
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    fontWeight: '700',
    marginLeft: 4,
    color: COLORS.text,
  },
  selectedCount: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  /* Contact rows */
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
  },
  contactRowDark: {
    backgroundColor: COLORS.surfaceDark,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 8,
  },
  contactName: {
    fontWeight: '700',
    color: COLORS.text,
  },
  contactPhone: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  /* Empty state */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  /* Send button */
  sendButtonContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  actionButtonsColumn: {
    gap: 8,
  },
  bulkNote: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 2,
    fontWeight: '500',
  },
  sendButton: {
    borderRadius: RADIUS.xl,
    ...SHADOWS.lg,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonLabel: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  sendButtonContent: {
    paddingVertical: 10,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  secondaryButtonDark: {
    backgroundColor: COLORS.surfaceDark,
    borderColor: COLORS.borderDark,
  },
  secondaryButtonText: {
    fontWeight: '700',
    color: COLORS.text,
    fontSize: 11,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    ...SHADOWS.lg,
  },
  progressCardDark: {
    backgroundColor: COLORS.surfaceDark,
  },
});
