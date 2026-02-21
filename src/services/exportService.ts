/**
 * Export Service - Handles exporting contacts to VCF, CSV, XLSX files
 * and managing backup files in the device file system.
 *
 * CRITICAL: Phone numbers are always exported as plain strings, never as
 * numbers, to prevent scientific notation (e.g. 9.1915E+11) corruption.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';
import type { PhoneContact, ExportFormat, ExportOptions, BackupRecord } from '../types';
import { getAllDeviceContacts } from './contactsService';

/** Directory for storing backup files */
const BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;

/** Export batch size for progress reporting */
const EXPORT_BATCH_SIZE = 500;

/** Progress callback type */
export type ExportProgressCallback = (progress: {
  phase: 'reading' | 'processing' | 'writing' | 'done';
  processed: number;
  total: number;
  message: string;
}) => void;

/**
 * Ensure the backup directory exists.
 */
async function ensureBackupDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
}

/**
 * Generate a timestamped file name.
 */
function generateFileName(format: ExportFormat, prefix = 'contacts'): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${ts}.${format}`;
}

// ─── Phone Number Safety ────────────────────────────────────────────────────

/**
 * Ensure a phone number is always a plain string, never a number.
 * Prevents scientific notation like 9.1915E+11.
 * Also handles numbers stored as JS floats/ints.
 */
function safePhone(phone: string | number | null | undefined): string {
  if (phone === null || phone === undefined) return '';
  // If it's a number, convert to string without scientific notation
  if (typeof phone === 'number') {
    // Use toFixed(0) to avoid floating point issues, then remove trailing .0
    return phone.toFixed(0);
  }
  const str = String(phone).trim();
  // If it looks like scientific notation (e.g. "9.1915E+11"), parse and convert
  if (/^\d+\.?\d*[eE][+\-]?\d+$/.test(str)) {
    try {
      const num = parseFloat(str);
      if (!isNaN(num) && isFinite(num)) {
        return num.toFixed(0);
      }
    } catch { /* fall through */ }
  }
  return str;
}

/**
 * Safely join phone numbers as strings.
 * Ensures no phone number becomes scientific notation.
 * Deduplicates by last 10 digits so the same number never appears twice.
 */
function safeJoinPhones(phones: (string | number)[]): string {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const phone of phones) {
    const safe = safePhone(phone);
    if (!safe) continue;
    const key = safe.replace(/\D/g, '').slice(-10);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    unique.push(safe);
  }
  return unique.join('; ');
}

// ─── VCF Export ─────────────────────────────────────────────────────────────

/**
 * Convert a single PhoneContact to a vCard 3.0 string.
 */
function contactToVCard(contact: PhoneContact): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${contact.name}`,
  ];

  // Name parts
  const nameParts = contact.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  lines.push(`N:${lastName};${firstName};;;`);

  // Phone numbers - ALWAYS as plain strings
  for (const phone of contact.phones) {
    const safe = safePhone(phone);
    if (safe) {
      lines.push(`TEL;TYPE=CELL:${safe}`);
    }
  }

  // Emails
  for (const email of contact.emails) {
    lines.push(`EMAIL;TYPE=INTERNET:${email}`);
  }

  // Company
  if (contact.company) {
    lines.push(`ORG:${contact.company}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/**
 * Export contacts to VCF format with progress tracking.
 */
export async function exportToVCF(contacts: PhoneContact[], onProgress?: ExportProgressCallback): Promise<string> {
  if (!contacts || contacts.length === 0) {
    throw new Error('No contacts to export to VCF');
  }
  const total = contacts.length;
  const vcardParts: string[] = [];
  
  for (let i = 0; i < contacts.length; i++) {
    try {
      vcardParts.push(contactToVCard(contacts[i]));
    } catch {
      // Skip malformed contact, don't break entire export
      vcardParts.push(`BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${contacts[i]?.name || 'Unknown'}\r\nEND:VCARD`);
    }
    
    if (onProgress && i % EXPORT_BATCH_SIZE === 0) {
      onProgress({ phase: 'processing', processed: i, total, message: `Processing ${i}/${total}...` });
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  
  onProgress?.({ phase: 'writing', processed: total, total, message: 'Saving file...' });
  const vcards = vcardParts.join('\r\n');
  await ensureBackupDir();
  const fileName = generateFileName('vcf');
  const fileUri = `${BACKUP_DIR}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, vcards, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  onProgress?.({ phase: 'done', processed: total, total, message: 'Done!' });
  return fileUri;
}

// ─── CSV Export ─────────────────────────────────────────────────────────────

/**
 * Escape a CSV field value.
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export contacts to CSV format.
 * Phone numbers are always quoted strings to prevent spreadsheet apps
 * from converting them to numbers/scientific notation.
 */
export async function exportToCSV(contacts: PhoneContact[], onProgress?: ExportProgressCallback): Promise<string> {
  if (!contacts || contacts.length === 0) {
    throw new Error('No contacts to export to CSV');
  }
  const total = contacts.length;
  const header = 'Name,Phone,Email,Company';
  const rows: string[] = [];

  for (let i = 0; i < contacts.length; i++) {
    try {
      const c = contacts[i];
      const phone = safeJoinPhones(c.phones);
      const email = c.emails.join('; ');
      rows.push([
        escapeCSV(c.name || ''),
        // Force phone as string by wrapping in ="..." to prevent Excel auto-formatting
        `"=""${phone.replace(/"/g, '""')}"""`,
        escapeCSV(email),
        escapeCSV(c.company || ''),
      ].join(','));
    } catch {
      // Skip malformed row
      rows.push(`${escapeCSV(contacts[i]?.name || 'Unknown')},"","",""`);
    }

    if (onProgress && i % EXPORT_BATCH_SIZE === 0) {
      onProgress({ phase: 'processing', processed: i, total, message: `Processing ${i}/${total}...` });
      // Yield to UI thread
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  onProgress?.({ phase: 'writing', processed: total, total, message: 'Saving file...' });
  const csv = [header, ...rows].join('\n');

  await ensureBackupDir();
  const fileName = generateFileName('csv');
  const fileUri = `${BACKUP_DIR}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  onProgress?.({ phase: 'done', processed: total, total, message: 'Done!' });
  return fileUri;
}

// ─── XLSX Export ────────────────────────────────────────────────────────────

/**
 * Export contacts to XLSX format.
 * CRITICAL: Phone numbers are forced to text format (t:'s') in the worksheet
 * to prevent Excel/Google Sheets from showing scientific notation.
 */
export async function exportToXLSX(contacts: PhoneContact[], onProgress?: ExportProgressCallback): Promise<string> {
  if (!contacts || contacts.length === 0) {
    throw new Error('No contacts to export to XLSX');
  }
  const total = contacts.length;
  const data: Array<{ Name: string; Phone: string; Email: string; Company: string }> = [];

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    data.push({
      Name: c.name || '',
      Phone: safeJoinPhones(c.phones),
      Email: c.emails.join('; '),
      Company: c.company || '',
    });

    if (onProgress && i % EXPORT_BATCH_SIZE === 0) {
      onProgress({ phase: 'processing', processed: i, total, message: `Processing ${i}/${total}...` });
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  onProgress?.({ phase: 'writing', processed: total, total, message: 'Creating Excel file...' });

  const ws = XLSX.utils.json_to_sheet(data);

  // Force the Phone column (column B, index 1) to text format
  // This prevents Excel from auto-converting large numbers to scientific notation
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:D1');
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 }); // Column B = Phone
    const cell = ws[cellAddress];
    if (cell) {
      // Force cell type to string
      cell.t = 's';
      // Set number format to text (@)
      if (!cell.z) cell.z = '@';
      // Ensure value is a string
      cell.v = String(cell.v || '');
    }
  }

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 25 }, // Name
    { wch: 20 }, // Phone
    { wch: 30 }, // Email
    { wch: 20 }, // Company
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contacts');

  // Write as base64
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  await ensureBackupDir();
  const fileName = generateFileName('xlsx');
  const fileUri = `${BACKUP_DIR}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });
  onProgress?.({ phase: 'done', processed: total, total, message: 'Done!' });
  return fileUri;
}

// ─── Unified Export ─────────────────────────────────────────────────────────

/**
 * Deduplicate contacts by phone number.
 * When duplicates are found, the first contact is kept and additional phone
 * numbers / emails from duplicates are merged into it.
 */
function deduplicateContacts(contacts: PhoneContact[]): PhoneContact[] {
  const seen = new Map<string, PhoneContact>();
  const result: PhoneContact[] = [];

  for (const contact of contacts) {
    // Build lookup keys from phone numbers (last 10 digits)
    const keys = contact.phones.map((p) => {
      const digits = safePhone(p).replace(/\D/g, '');
      return digits.length >= 10 ? digits.slice(-10) : digits;
    }).filter(Boolean);

    // Find existing contact with matching phone
    let existing: PhoneContact | undefined;
    for (const key of keys) {
      if (seen.has(key)) {
        existing = seen.get(key);
        break;
      }
    }

    if (existing) {
      // Merge: add any new phones/emails to existing (deduplicate by last 10 digits)
      const existingPhoneKeys = new Set(
        existing.phones.map((p) => {
          const digits = safePhone(p).replace(/\D/g, '');
          return digits.length >= 10 ? digits.slice(-10) : digits;
        }).filter(Boolean)
      );
      for (const phone of contact.phones) {
        const digits = safePhone(phone).replace(/\D/g, '');
        const pk = digits.length >= 10 ? digits.slice(-10) : digits;
        if (pk && !existingPhoneKeys.has(pk)) {
          existing.phones.push(phone);
          existingPhoneKeys.add(pk);
        }
      }
      const existingEmails = new Set(existing.emails.map((e) => e.toLowerCase()));
      for (const email of contact.emails) {
        if (email && !existingEmails.has(email.toLowerCase())) {
          existing.emails.push(email);
        }
      }
      if (!existing.company && contact.company) {
        existing.company = contact.company;
      }
    } else {
      // Deep-copy so we don't mutate original; dedup phones within this contact too
      const phoneSeen = new Set<string>();
      const dedupedPhones: string[] = [];
      for (const phone of contact.phones) {
        const digits = safePhone(phone).replace(/\D/g, '');
        const pk = digits.length >= 10 ? digits.slice(-10) : digits;
        if (pk && phoneSeen.has(pk)) continue;
        if (pk) phoneSeen.add(pk);
        dedupedPhones.push(typeof phone === 'string' ? phone : String(phone));
      }
      const copy: PhoneContact = {
        ...contact,
        phones: dedupedPhones,
        emails: [...contact.emails],
      };
      result.push(copy);
      for (const key of keys) {
        if (key) seen.set(key, copy);
      }
    }
  }
  return result;
}

export interface ExportResult {
  fileUri: string;
  record: Omit<BackupRecord, 'id'>;
  duplicatesRemoved: number;
}

/**
 * Export contacts in the specified format.
 * Supports:
 * - Progress callback for UI feedback
 * - Duplicate merging (optional)
 * - Comprehensive error handling per format
 */
export async function exportContacts(
  options: ExportOptions & { mergeDuplicates?: boolean },
  onProgress?: ExportProgressCallback,
): Promise<ExportResult> {
  let contacts: PhoneContact[];
  let duplicatesRemoved = 0;

  // ── Read contacts ──
  try {
    onProgress?.({ phase: 'reading', processed: 0, total: 0, message: 'Reading contacts...' });

    if (options.contactIds && options.contactIds.length > 0) {
      const allContacts = await getAllDeviceContacts();
      const idsSet = new Set(options.contactIds);
      contacts = allContacts.filter((c) => idsSet.has(c.id));
    } else {
      contacts = await getAllDeviceContacts();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read device contacts: ${msg}`);
  }

  if (contacts.length === 0) {
    throw new Error('No contacts to export. Please check contacts permission and ensure you have contacts on the device.');
  }

  // ── Deduplicate if requested ──
  if (options.mergeDuplicates) {
    const beforeCount = contacts.length;
    contacts = deduplicateContacts(contacts);
    duplicatesRemoved = beforeCount - contacts.length;
    onProgress?.({
      phase: 'processing',
      processed: 0,
      total: contacts.length,
      message: duplicatesRemoved > 0
        ? `Merged ${duplicatesRemoved} duplicates. Exporting ${contacts.length} contacts...`
        : `No duplicates found. Exporting ${contacts.length} contacts...`,
    });
  }

  // ── Export ──
  let fileUri: string;
  try {
    switch (options.format) {
      case 'vcf':
        fileUri = await exportToVCF(contacts, onProgress);
        break;
      case 'csv':
        fileUri = await exportToCSV(contacts, onProgress);
        break;
      case 'xlsx':
        fileUri = await exportToXLSX(contacts, onProgress);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Check for specific error types
    if (msg.includes('No space') || msg.includes('ENOSPC') || msg.includes('disk full')) {
      throw new Error('Not enough storage space to create the backup file. Please free some space and try again.');
    }
    if (msg.includes('permission') || msg.includes('EACCES')) {
      throw new Error('File system permission denied. Please check app storage permissions.');
    }
    throw new Error(`Export to ${options.format.toUpperCase()} failed: ${msg}`);
  }

  // ── File info ──
  let fileSize = 0;
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    fileSize = fileInfo.exists && 'size' in fileInfo ? (fileInfo.size ?? 0) : 0;
  } catch {
    // Non-fatal — we still have the file
  }

  const fileName = fileUri.split('/').pop() || `contacts.${options.format}`;

  return {
    fileUri,
    duplicatesRemoved,
    record: {
      fileName,
      fileUri,
      format: options.format,
      contactCount: contacts.length,
      fileSize,
      createdAt: new Date().toISOString(),
      isAutoBackup: false,
    },
  };
}

// ─── Share ───────────────────────────────────────────────────────────────────

/**
 * Share a backup file using the system share sheet.
 */
export async function shareBackupFile(fileUri: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: getMimeType(fileUri),
    dialogTitle: 'Share Contacts Backup',
  });
}

/**
 * Get MIME type from file URI.
 */
function getMimeType(fileUri: string): string {
  const ext = fileUri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'vcf':
      return 'text/vcard';
    case 'csv':
      return 'text/csv';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}

// ─── File Management ────────────────────────────────────────────────────────

/**
 * Delete a backup file from the file system.
 */
export async function deleteBackupFile(fileUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (error) {
    console.error('Failed to delete backup file:', error);
  }
}

/**
 * Get all backup files in the backup directory.
 */
export async function listBackupFiles(): Promise<string[]> {
  try {
    await ensureBackupDir();
    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
    return files.map((f) => `${BACKUP_DIR}${f}`);
  } catch {
    return [];
  }
}

/**
 * Get the total size of all backup files.
 */
export async function getBackupDirectorySize(): Promise<number> {
  try {
    const files = await listBackupFiles();
    let total = 0;
    for (const file of files) {
      const info = await FileSystem.getInfoAsync(file);
      if (info.exists && 'size' in info) {
        total += info.size ?? 0;
      }
    }
    return total;
  } catch {
    return 0;
  }
}
