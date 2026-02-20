/**
 * PreviewScreen - Preview/edit parsed contacts before import
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Searchbar, Button, Divider, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import type { RootStackParamList, ContactRow, DuplicateAction } from '../types';
import { useContactsStore, useSettingsStore } from '../store';
import { useContactSearch } from '../hooks/useSearch';
import {
  ContactCard,
  StatsBar,
  ColumnMapperModal,
  DuplicateSummaryModal,
  EditContactModal,
  EmptyState,
} from '../components';
import { COLORS, LIST_ITEM_HEIGHT } from '../constants';
import { hasRequiredMappings } from '../utils/fileParser';
import { t } from '../i18n';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function PreviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const lang = useSettingsStore((s) => s.settings.language);
  const isDark = useSettingsStore((s) => s.settings.darkMode);
  const defaultDuplicateAction = useSettingsStore((s) => s.settings.defaultDuplicateAction);

  const parsedFile = useContactsStore((s) => s.parsedFile);
  const contacts = useContactsStore((s) => s.contacts);
  const columnMapping = useContactsStore((s) => s.columnMapping);
  const duplicateResult = useContactsStore((s) => s.duplicateResult);
  const isLoadingDeviceContacts = useContactsStore((s) => s.isLoadingDeviceContacts);

  const setColumnMapping = useContactsStore((s) => s.setColumnMapping);
  const mapAndValidateContacts = useContactsStore((s) => s.mapAndValidateContacts);
  const loadDeviceContacts = useContactsStore((s) => s.loadDeviceContacts);
  const runDuplicateCheck = useContactsStore((s) => s.runDuplicateCheck);
  const toggleContactSelection = useContactsStore((s) => s.toggleContactSelection);
  const selectAllContacts = useContactsStore((s) => s.selectAllContacts);
  const removeContact = useContactsStore((s) => s.removeContact);
  const updateContact = useContactsStore((s) => s.updateContact);
  const setDuplicateAction = useContactsStore((s) => s.setDuplicateAction);
  const setBulkDuplicateAction = useContactsStore((s) => s.setBulkDuplicateAction);

  // UI state
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);

  // Search
  const { searchQuery, setSearchQuery, filteredContacts, clearSearch } =
    useContactSearch(contacts);

  // Stats
  const stats = useMemo(() => {
    const valid = contacts.filter((c) => c.isValid).length;
    const invalid = contacts.filter((c) => !c.isValid).length;
    const dups = contacts.filter((c) => c.isDuplicate).length;
    const newC = contacts.filter((c) => !c.isDuplicate && c.isValid).length;
    return { total: contacts.length, valid, invalid, duplicates: dups, newCount: newC };
  }, [contacts]);

  const selectedCount = useMemo(
    () => contacts.filter((c) => c.selected).length,
    [contacts]
  );

  const allSelected = selectedCount === contacts.length && contacts.length > 0;

  // Handlers
  const handleApplyMapping = useCallback(
    (mapping: typeof columnMapping) => {
      setColumnMapping(mapping);
      // Re-map contacts with new mapping
      setTimeout(() => mapAndValidateContacts(), 0);
      Toast.show({
        type: 'success',
        text1: 'Column mapping applied',
        visibilityTime: 1500,
      });
    },
    [setColumnMapping, mapAndValidateContacts]
  );

  const handleCheckDuplicates = useCallback(async () => {
    try {
      await loadDeviceContacts();
      runDuplicateCheck(defaultDuplicateAction);
      setShowDuplicateModal(true);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('genericError', lang),
        text2: error instanceof Error ? error.message : 'Failed to load contacts',
        visibilityTime: 3000,
      });
    }
  }, [loadDeviceContacts, runDuplicateCheck, defaultDuplicateAction, lang]);

  const handleBulkDuplicateAction = useCallback(
    (action: DuplicateAction) => {
      setBulkDuplicateAction(action);
    },
    [setBulkDuplicateAction]
  );

  const handleStartImport = useCallback(() => {
    setShowDuplicateModal(false);

    const selectedValid = contacts.filter((c) => c.selected && c.isValid);
    const selectedDups = selectedValid.filter((c) => c.isDuplicate && c.duplicateAction !== 'skip');
    const selectedNew = selectedValid.filter((c) => !c.isDuplicate);
    const toImportCount = selectedNew.length + selectedDups.length;

    if (toImportCount === 0) {
      Toast.show({
        type: 'info',
        text1: 'No contacts to import',
        text2: 'All selected contacts are duplicates set to skip.',
        visibilityTime: 3000,
      });
      return;
    }

    Alert.alert(
      t('startImport', lang),
      `Import ${toImportCount} contact${toImportCount !== 1 ? 's' : ''} to your device?` +
        (selectedDups.length > 0 ? `\n(${selectedDups.length} duplicate${selectedDups.length !== 1 ? 's' : ''} will be updated/added)` : ''),
      [
        { text: t('cancel', lang), style: 'cancel' },
        {
          text: t('startImport', lang),
          onPress: () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {
              // Haptics not available
            }
            navigation.navigate('ImportProgress');
          },
        },
      ]
    );
  }, [navigation, contacts, lang]);

  const handleEdit = useCallback((contact: ContactRow) => {
    setEditingContact(contact);
  }, []);

  const handleSaveEdit = useCallback(
    (id: string, updates: Partial<ContactRow>) => {
      updateContact(id, updates);
    },
    [updateContact]
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeContact(id);
    },
    [removeContact]
  );

  const handleToggleSelectAll = useCallback(() => {
    selectAllContacts(!allSelected);
  }, [selectAllContacts, allSelected]);

  // Empty state
  if (!parsedFile) {
    return (
      <View
        style={[
          styles.container,
          isDark && { backgroundColor: COLORS.backgroundDark },
          { paddingTop: insets.top },
        ]}
      >
        <EmptyState
          icon="file-document-outline"
          title={t('noFileLoaded', lang)}
          message={t('noFileMessage', lang)}
        />
      </View>
    );
  }

  // Column mapping needed
  if (!hasRequiredMappings(columnMapping)) {
    return (
      <View
        style={[
          styles.container,
          isDark && { backgroundColor: COLORS.backgroundDark },
          { paddingTop: insets.top },
        ]}
      >
        <EmptyState
          icon="table-column"
          title={t('requiredFieldsMissing', lang)}
          message={t('columnMapperSubtitle', lang)}
          actionLabel={t('mapColumns', lang)}
          onAction={() => setShowColumnMapper(true)}
        />
        <ColumnMapperModal
          visible={showColumnMapper}
          onDismiss={() => setShowColumnMapper(false)}
          headers={parsedFile.headers}
          currentMapping={columnMapping}
          onApply={handleApplyMapping}
        />
      </View>
    );
  }

  const renderContact = ({ item }: { item: ContactRow }) => (
    <ContactCard
      contact={item}
      onToggleSelect={toggleContactSelection}
      onRemove={handleRemove}
      onEdit={handleEdit}
      onDuplicateAction={setDuplicateAction}
    />
  );

  const getItemLayout = (_data: unknown, index: number) => ({
    length: LIST_ITEM_HEIGHT,
    offset: LIST_ITEM_HEIGHT * index,
    index,
  });

  return (
    <View
      style={[
        styles.container,
        isDark && { backgroundColor: COLORS.backgroundDark },
        { paddingTop: insets.top },
      ]}
    >
      {/* Stats */}
      <StatsBar
        total={stats.total}
        valid={stats.valid}
        invalid={stats.invalid}
        duplicates={stats.duplicates}
        newCount={stats.newCount}
      />

      {/* Search + Actions */}
      <View style={styles.toolbar}>
        <Searchbar
          placeholder={t('searchPlaceholder', lang)}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchbar, isDark && { backgroundColor: COLORS.surfaceDark }]}
          iconColor={COLORS.textSecondary}
          onClearIconPress={clearSearch}
        />
      </View>

      <View style={styles.actionBar}>
        <Button
          mode="text"
          onPress={handleToggleSelectAll}
          compact
          icon={allSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
        >
          {allSelected ? t('deselectAll', lang) : t('selectAll', lang)}
        </Button>

        <View style={styles.actionButtons}>
          <IconButton
            icon="table-column"
            size={20}
            onPress={() => setShowColumnMapper(true)}
            accessibilityLabel={t('mapColumns', lang)}
          />
          <Button
            mode="outlined"
            onPress={handleCheckDuplicates}
            loading={isLoadingDeviceContacts}
            compact
            icon="account-search"
            style={styles.actionBtn}
          >
            {t('checkDuplicates', lang)}
          </Button>
        </View>
      </View>

      <Divider />

      {/* Contacts List */}
      <FlatList
        data={filteredContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="magnify"
            title="No contacts found"
            message={searchQuery ? 'Try a different search term' : 'No valid contacts in file'}
          />
        }
      />

      {/* Import FAB */}
      {selectedCount > 0 && (
        <View style={[styles.fabContainer, { bottom: insets.bottom + 16 }]}>
          <Button
            mode="contained"
            onPress={
              duplicateResult
                ? handleStartImport
                : handleCheckDuplicates
            }
            icon="import"
            style={styles.importButton}
            labelStyle={styles.importButtonLabel}
            contentStyle={styles.importButtonContent}
          >
            {duplicateResult
              ? `${t('startImport', lang)} (${selectedCount})`
              : `${t('checkDuplicates', lang)} & ${t('startImport', lang)}`}
          </Button>
        </View>
      )}

      {/* Modals */}
      <ColumnMapperModal
        visible={showColumnMapper}
        onDismiss={() => setShowColumnMapper(false)}
        headers={parsedFile.headers}
        currentMapping={columnMapping}
        onApply={handleApplyMapping}
      />

      <DuplicateSummaryModal
        visible={showDuplicateModal}
        onDismiss={() => setShowDuplicateModal(false)}
        result={duplicateResult}
        onBulkAction={handleBulkDuplicateAction}
        onProceed={handleStartImport}
      />

      <EditContactModal
        visible={editingContact !== null}
        onDismiss={() => setEditingContact(null)}
        contact={editingContact}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  toolbar: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  searchbar: {
    borderRadius: 12,
    elevation: 0,
    height: 44,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    borderRadius: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
  fabContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  importButton: {
    borderRadius: 12,
    elevation: 6,
  },
  importButtonLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  importButtonContent: {
    paddingVertical: 8,
  },
});
