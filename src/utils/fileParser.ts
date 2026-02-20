/**
 * Excel/CSV file parsing utilities using the xlsx library
 */

import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import type { ParsedFile, RawRow, ColumnMapping } from '../types';
import { HEADER_ALIASES, MAX_FILE_ROWS } from '../constants';

/**
 * Read and parse an Excel/CSV file from a URI.
 * Returns headers and raw rows.
 */
export async function parseFile(uri: string, fileName: string): Promise<ParsedFile> {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Parse with xlsx
    const workbook = XLSX.read(base64, { type: 'base64' });

    // Use first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No sheets found in the file');
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error('Could not read the worksheet');
    }

    // Convert to JSON with headers
    // raw: false ensures numbers → strings, but we also handle raw numbers in sanitizePhone
    const jsonData = XLSX.utils.sheet_to_json<RawRow>(worksheet, {
      defval: '',
      raw: false, // Convert all values to strings
    });

    if (jsonData.length === 0) {
      throw new Error('The file is empty or has no data rows');
    }

    if (jsonData.length > MAX_FILE_ROWS) {
      throw new Error(
        `File has ${jsonData.length} rows. Maximum supported is ${MAX_FILE_ROWS}.`
      );
    }

    // Extract headers from first row keys
    const headers = Object.keys(jsonData[0] || {});

    if (headers.length === 0) {
      throw new Error('No columns found in the file');
    }

    return {
      fileName,
      headers,
      rows: jsonData,
      rowCount: jsonData.length,
      parseDate: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to parse the file. Please check the format.');
  }
}

/**
 * Auto-detect column mapping based on header names.
 * Uses fuzzy matching against known header aliases.
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: null,
    phone: null,
    email: null,
    company: null,
    notes: null,
  };

  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalizedHeaders.findIndex(
        (h) => h === alias || h.includes(alias) || alias.includes(h)
      );
      if (idx !== -1 && mapping[field as keyof ColumnMapping] === null) {
        mapping[field as keyof ColumnMapping] = headers[idx];
        break;
      }
    }
  }

  return mapping;
}

/**
 * Check if the required columns (name, phone) are mapped.
 */
export function hasRequiredMappings(mapping: ColumnMapping): boolean {
  return mapping.name !== null && mapping.phone !== null;
}

/**
 * Generate a CSV string from contact rows for export.
 */
export function generateCSV(
  rows: Array<{ name: string; phone: string; email?: string; company?: string; notes?: string }>
): string {
  const headers = ['Name', 'Phone', 'Email', 'Company', 'Notes'];
  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = [
      escapeCsvField(row.name),
      escapeCsvField(row.phone),
      escapeCsvField(row.email || ''),
      escapeCsvField(row.company || ''),
      escapeCsvField(row.notes || ''),
    ];
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Generate a VCF (vCard) string from contact rows.
 */
export function generateVCF(
  rows: Array<{ name: string; phone: string; email?: string; company?: string; notes?: string }>
): string {
  const cards: string[] = [];

  for (const row of rows) {
    const parts: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${escapeVcfField(row.name)}`,
      `TEL:${row.phone}`,
    ];

    if (row.email) {
      parts.push(`EMAIL:${escapeVcfField(row.email)}`);
    }
    if (row.company) {
      parts.push(`ORG:${escapeVcfField(row.company)}`);
    }
    if (row.notes) {
      parts.push(`NOTE:${escapeVcfField(row.notes)}`);
    }

    parts.push('END:VCARD');
    cards.push(parts.join('\r\n'));
  }

  return cards.join('\r\n');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeVcfField(value: string): string {
  return value.replace(/[;,\\]/g, (match) => `\\${match}`);
}
