/**
 * Hook for picking and parsing Excel/CSV files
 */

import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type { ParsedFile } from '../types';
import { SUPPORTED_MIME_TYPES } from '../types';
import { parseFile } from '../utils/fileParser';
import { useContactsStore } from '../store';

interface UseFilePickerReturn {
  pickFile: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useFilePicker(): UseFilePickerReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setParsedFile = useContactsStore((s) => s.setParsedFile);

  const pickFile = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: SUPPORTED_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        throw new Error('No file selected');
      }

      // Validate file extension
      const fileName = asset.name || 'unknown';
      const ext = fileName.toLowerCase().split('.').pop();
      if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
        throw new Error(
          'Unsupported file format. Please use .xlsx, .xls, or .csv files.'
        );
      }

      // Parse the file
      const parsed = await parseFile(asset.uri, fileName);
      setParsedFile(parsed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load file';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setParsedFile]);

  const clearError = useCallback(() => setError(null), []);

  return { pickFile, isLoading, error, clearError };
}
