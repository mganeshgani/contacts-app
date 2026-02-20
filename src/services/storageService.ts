/**
 * Storage Service - AsyncStorage wrapper for persistent data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, ImportRecord, ColumnMapping } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { STORAGE_KEYS } from '../constants';

/**
 * Load app settings from storage.
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save app settings to storage.
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Load import history from storage.
 */
export async function loadImportHistory(): Promise<ImportRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.IMPORT_HISTORY);
    if (raw) {
      return JSON.parse(raw) as ImportRecord[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save a new import record.
 */
export async function saveImportRecord(record: ImportRecord): Promise<void> {
  try {
    const history = await loadImportHistory();
    history.unshift(record); // Most recent first
    // Keep last 50 records
    const trimmed = history.slice(0, 50);
    await AsyncStorage.setItem(STORAGE_KEYS.IMPORT_HISTORY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save import record:', error);
  }
}

/**
 * Remove an import record from history.
 */
export async function removeImportRecord(recordId: string): Promise<void> {
  try {
    const history = await loadImportHistory();
    const filtered = history.filter((r) => r.id !== recordId);
    await AsyncStorage.setItem(STORAGE_KEYS.IMPORT_HISTORY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove import record:', error);
  }
}

/**
 * Mark an import record as no longer undoable.
 */
export async function markImportAsUndone(recordId: string): Promise<void> {
  try {
    const history = await loadImportHistory();
    const updated = history.map((r) =>
      r.id === recordId ? { ...r, canUndo: false } : r
    );
    await AsyncStorage.setItem(STORAGE_KEYS.IMPORT_HISTORY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update import record:', error);
  }
}

/**
 * Save last used column mapping.
 */
export async function saveColumnMapping(mapping: ColumnMapping): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_COLUMN_MAPPING,
      JSON.stringify(mapping)
    );
  } catch {
    // Silently fail
  }
}

/**
 * Load last used column mapping.
 */
export async function loadColumnMapping(): Promise<ColumnMapping | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_COLUMN_MAPPING);
    if (raw) return JSON.parse(raw);
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if onboarding has been completed.
 */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark onboarding as complete.
 */
export async function setOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
  } catch {
    // Silently fail
  }
}

/**
 * Clear all app data.
 */
export async function clearAllData(): Promise<void> {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
}
