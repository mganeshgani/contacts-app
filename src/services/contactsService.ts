/**
 * Contacts Service - Handles all device contact operations
 * Uses expo-contacts for cross-platform contact access.
 * Production-hardened with retry logic, permission re-checks, and per-contact error recovery.
 */

import * as Contacts from 'expo-contacts';
import type {
  ContactRow,
  PhoneContact,
  DuplicateCheckResult,
  ImportProgress,
  ImportError,
  DuplicateAction,
} from '../types';
import { phoneToLookupKey, applyCountryCode, normalizePhone, validatePhone } from '../utils/phoneUtils';
import { DEFAULT_BATCH_SIZE } from '../constants';

/** Max retries for individual contact save */
const MAX_RETRIES = 2;
/** Delay between retries in ms */
const RETRY_DELAY_MS = 200;
/** Delay between batches in ms (gives UI thread breathing room) */
const BATCH_DELAY_MS = 80;

/**
 * Request contacts permission.
 * Returns whether permission was granted.
 */
export async function requestContactsPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  try {
    const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
    };
  } catch (error) {
    return { granted: false, canAskAgain: false };
  }
}

/**
 * Check current contacts permission status.
 */
export async function checkContactsPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  try {
    const { status, canAskAgain } = await Contacts.getPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? true,
    };
  } catch (error) {
    return { granted: false, canAskAgain: false };
  }
}

/**
 * Get all device contacts (optimized: limited fields).
 * Returns normalized PhoneContact array.
 */
export async function getAllDeviceContacts(): Promise<PhoneContact[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
      Contacts.Fields.Company,
    ],
    sort: Contacts.SortTypes.FirstName,
  });

  return data.map((contact): PhoneContact => {
    const phones = (contact.phoneNumbers || [])
      .map((p) => p.number || '')
      .filter(Boolean);

    const normalizedPhones = phones.map(phoneToLookupKey).filter(Boolean);

    const emails = (contact.emails || [])
      .map((e) => e.email || '')
      .filter(Boolean);

    return {
      id: contact.id!,
      name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
      phones,
      normalizedPhones,
      emails,
      company: contact.company || undefined,
    };
  });
}

/**
 * Build a fast lookup map from phone -> contact for duplicate detection.
 */
export function buildPhoneLookupMap(
  contacts: PhoneContact[]
): Map<string, PhoneContact> {
  const map = new Map<string, PhoneContact>();

  for (const contact of contacts) {
    for (const phone of contact.normalizedPhones) {
      if (phone && !map.has(phone)) {
        map.set(phone, contact);
      }
    }
  }

  return map;
}

/**
 * Check for duplicates between imported rows and existing contacts.
 */
export function checkDuplicates(
  rows: ContactRow[],
  existingContacts: PhoneContact[],
  defaultAction: DuplicateAction = 'skip'
): DuplicateCheckResult {
  const lookupMap = buildPhoneLookupMap(existingContacts);
  const newContacts: ContactRow[] = [];
  const duplicates: ContactRow[] = [];

  // Also track within-batch duplicates
  const batchPhonesSeen = new Set<string>();

  for (const row of rows) {
    if (!row.isValid) continue;

    const lookupKey = phoneToLookupKey(row.phone);

    // Check against existing device contacts
    const existing = lookupMap.get(lookupKey);

    // Check for duplicates within the same import batch
    if (batchPhonesSeen.has(lookupKey)) {
      duplicates.push({
        ...row,
        isDuplicate: true,
        duplicateAction: defaultAction,
        existingContactId: existing?.id,
      });
      continue;
    }

    batchPhonesSeen.add(lookupKey);

    if (existing) {
      duplicates.push({
        ...row,
        isDuplicate: true,
        duplicateAction: defaultAction,
        existingContactId: existing.id,
      });
    } else {
      newContacts.push({
        ...row,
        isDuplicate: false,
      });
    }
  }

  return {
    newContacts,
    duplicates,
    totalExisting: existingContacts.length,
  };
}

/**
 * Safely split a full name into first and last name parts.
 */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return { firstName: 'Unknown', lastName: '' };

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || '',
  };
}

/**
 * Build a Contacts.Contact object from a ContactRow.
 */
function buildContactPayload(row: ContactRow, countryCode: string): Contacts.Contact {
  const { firstName, lastName } = splitName(row.name);
  const phone = applyCountryCode(row.phone, countryCode);

  const contact: Contacts.Contact = {
    contactType: Contacts.ContactTypes.Person,
    firstName,
    lastName,
    name: row.name.trim(),
    phoneNumbers: [
      {
        number: phone,
        label: 'mobile',
        isPrimary: true,
      },
    ],
  } as Contacts.Contact;

  if (row.email) {
    contact.emails = [
      {
        email: row.email.trim(),
        label: 'home',
        isPrimary: true,
      },
    ];
  }

  if (row.company) {
    contact.company = row.company.trim();
  }

  if (row.notes) {
    contact.note = row.notes.trim();
  }

  return contact;
}

/**
 * Add a single contact to the device with retry logic.
 * Returns the new contact ID.
 */
export async function addContactToDevice(row: ContactRow, countryCode: string): Promise<string> {
  const contact = buildContactPayload(row, countryCode);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const contactId = await Contacts.addContactAsync(contact);
      return contactId;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError || new Error('Failed to add contact after retries');
}

/**
 * Update an existing contact on the device with retry logic.
 */
export async function updateContactOnDevice(
  existingId: string,
  row: ContactRow,
  countryCode: string
): Promise<void> {
  const contact = buildContactPayload(row, countryCode);
  const updates: Contacts.Contact = { ...contact, id: existingId };

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await Contacts.updateContactAsync(updates);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError || new Error('Failed to update contact after retries');
}

/**
 * Remove a contact from the device by ID.
 */
export async function removeContactFromDevice(contactId: string): Promise<void> {
  await Contacts.removeContactAsync(contactId);
}

/**
 * Pre-validate a contact row before attempting device save.
 * Returns an error string if invalid, or null if OK.
 */
function preValidateRow(row: ContactRow): string | null {
  if (!row.name || !row.name.trim()) {
    return 'Contact name is empty';
  }
  if (!row.phone) {
    return 'Phone number is empty';
  }
  const phoneCheck = validatePhone(row.phone);
  if (!phoneCheck.valid) {
    return phoneCheck.reason || 'Invalid phone number';
  }
  return null;
}

/**
 * Bulk import contacts with progress reporting, retry logic, and permission re-checks.
 * Processes in batches to avoid UI freezes.
 */
export async function bulkImportContacts(
  rows: ContactRow[],
  countryCode: string,
  batchSize: number = DEFAULT_BATCH_SIZE,
  onProgress?: (progress: ImportProgress) => void,
  cancelToken?: { cancelled: boolean }
): Promise<{
  progress: ImportProgress;
  addedContactIds: string[];
}> {
  const totalBatches = Math.ceil(rows.length / batchSize);
  const addedContactIds: string[] = [];

  const progress: ImportProgress = {
    total: rows.length,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    updated: 0,
    isRunning: true,
    isCancelled: false,
    currentBatch: 0,
    totalBatches,
    errors: [],
  };

  // Pre-flight permission check
  const permCheck = await checkContactsPermission();
  if (!permCheck.granted) {
    progress.isRunning = false;
    progress.errors.push({
      rowIndex: -1,
      contactName: '',
      phone: '',
      errorMessage: 'Contacts permission not granted. Please enable it in Settings.',
    });
    onProgress?.({ ...progress });

    // Mark all as failed
    progress.failed = rows.length;
    progress.processed = rows.length;
    onProgress?.({ ...progress });

    return { progress, addedContactIds };
  }

  // Track phones added in this batch to avoid saving same phone twice
  const phonesAddedInSession = new Set<string>();

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    // Check cancellation
    if (cancelToken?.cancelled) {
      progress.isCancelled = true;
      progress.isRunning = false;
      onProgress?.({ ...progress });
      break;
    }

    progress.currentBatch = batchIndex + 1;
    const start = batchIndex * batchSize;
    const end = Math.min(start + batchSize, rows.length);
    const batch = rows.slice(start, end);

    // Re-check permission every 5 batches for long imports
    if (batchIndex > 0 && batchIndex % 5 === 0) {
      const recheck = await checkContactsPermission();
      if (!recheck.granted) {
        progress.isRunning = false;
        progress.errors.push({
          rowIndex: start,
          contactName: '',
          phone: '',
          errorMessage: 'Contacts permission was revoked during import.',
        });
        onProgress?.({ ...progress });
        break;
      }
    }

    for (const row of batch) {
      if (cancelToken?.cancelled) break;

      try {
        // Skip invalid rows
        if (!row.isValid) {
          progress.skipped++;
          progress.processed++;
          onProgress?.({ ...progress });
          continue;
        }

        // Pre-validate before attempting device operation
        const preError = preValidateRow(row);
        if (preError) {
          progress.failed++;
          progress.errors.push({
            rowIndex: start + batch.indexOf(row),
            contactName: row.name || 'Unknown',
            phone: row.phone || '',
            errorMessage: preError,
          });
          progress.processed++;
          onProgress?.({ ...progress });
          continue;
        }

        // Check for duplicate phone within this import session
        const lookupKey = phoneToLookupKey(row.phone);

        if (row.isDuplicate) {
          switch (row.duplicateAction) {
            case 'skip':
              progress.skipped++;
              break;
            case 'update':
              if (row.existingContactId) {
                await updateContactOnDevice(row.existingContactId, row, countryCode);
                progress.updated++;
              } else {
                progress.skipped++;
              }
              break;
            case 'force_add': {
              const newId = await addContactToDevice(row, countryCode);
              addedContactIds.push(newId);
              phonesAddedInSession.add(lookupKey);
              progress.successful++;
              break;
            }
          }
        } else if (phonesAddedInSession.has(lookupKey)) {
          // Duplicate within same import session - skip to avoid double entry
          progress.skipped++;
        } else {
          const newId = await addContactToDevice(row, countryCode);
          addedContactIds.push(newId);
          phonesAddedInSession.add(lookupKey);
          progress.successful++;
        }
      } catch (error) {
        progress.failed++;
        const importError: ImportError = {
          rowIndex: start + batch.indexOf(row),
          contactName: row.name || 'Unknown',
          phone: row.phone || '',
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        };
        progress.errors.push(importError);
      }

      progress.processed++;
      onProgress?.({ ...progress });
    }

    // Delay between batches to let UI breathe
    if (batchIndex < totalBatches - 1) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  progress.isRunning = false;
  onProgress?.({ ...progress });

  return { progress, addedContactIds };
}

/**
 * Undo a batch import by removing all added contacts.
 * Processes with retries for reliability.
 */
export async function undoImport(contactIds: string[]): Promise<{
  removed: number;
  failed: number;
}> {
  let removed = 0;
  let failed = 0;

  for (const id of contactIds) {
    let success = false;
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        await removeContactFromDevice(id);
        removed++;
        success = true;
        break;
      } catch {
        if (attempt === 1) failed++;
        else await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  return { removed, failed };
}
