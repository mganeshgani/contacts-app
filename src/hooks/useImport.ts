/**
 * Hook for bulk import operations.
 * Provides startImport, cancelImport, and undoLastImport with robust error handling.
 */

import { useCallback, useRef } from 'react';
import { useContactsStore, useHistoryStore, useSettingsStore } from '../store';
import { bulkImportContacts, undoImport } from '../services/contactsService';
import { markImportAsUndone } from '../services/storageService';
import type { ImportRecord, ContactRow } from '../types';

interface UseImportReturn {
  startImport: () => Promise<ImportRecord>;
  cancelImport: () => void;
  undoLastImport: (recordId: string) => Promise<{ removed: number; failed: number }>;
}

export function useImport(): UseImportReturn {
  const cancelTokenRef = useRef({ cancelled: false });

  const contacts = useContactsStore((s) => s.contacts);
  const setImportProgress = useContactsStore((s) => s.setImportProgress);
  const setLastImportRecordId = useContactsStore((s) => s.setLastImportRecordId);
  const parsedFile = useContactsStore((s) => s.parsedFile);

  const settings = useSettingsStore((s) => s.settings);
  const addRecord = useHistoryStore((s) => s.addRecord);
  const markUndone = useHistoryStore((s) => s.markUndone);

  const startImport = useCallback(async (): Promise<ImportRecord> => {
    // Reset cancel token
    cancelTokenRef.current = { cancelled: false };

    // Filter to selected and valid contacts
    const toImport = contacts.filter((c) => c.selected && c.isValid);

    if (toImport.length === 0) {
      throw new Error('No valid contacts selected for import');
    }

    const { progress, addedContactIds } = await bulkImportContacts(
      toImport,
      settings.defaultCountryCode,
      settings.batchSize,
      (p) => setImportProgress(p),
      cancelTokenRef.current
    );

    // Create import record
    const record: ImportRecord = {
      id: `import_${Date.now()}`,
      fileName: parsedFile?.fileName || 'Unknown',
      date: new Date().toISOString(),
      totalRows: toImport.length,
      imported: progress.successful,
      skipped: progress.skipped,
      updated: progress.updated,
      failed: progress.failed,
      contactIds: addedContactIds,
      canUndo: addedContactIds.length > 0,
    };

    await addRecord(record);
    setLastImportRecordId(record.id);

    return record;
  }, [contacts, settings, parsedFile, setImportProgress, setLastImportRecordId, addRecord]);

  const cancelImport = useCallback(() => {
    cancelTokenRef.current.cancelled = true;
  }, []);

  const undoLastImport = useCallback(
    async (recordId: string) => {
      const record = useHistoryStore.getState().records.find((r) => r.id === recordId);
      if (!record || !record.canUndo) {
        return { removed: 0, failed: 0 };
      }

      if (record.contactIds.length === 0) {
        return { removed: 0, failed: 0 };
      }

      const result = await undoImport(record.contactIds);
      markUndone(recordId);

      try {
        await markImportAsUndone(recordId);
      } catch {
        // Non-critical - history update can fail silently
      }

      return result;
    },
    [markUndone]
  );

  return { startImport, cancelImport, undoLastImport };
}
