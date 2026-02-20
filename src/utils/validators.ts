/**
 * Data validation utilities for contact rows.
 * Production-hardened with robust sanitization, phone type coercion,
 * and comprehensive field validation.
 */

import type { ContactRow, RawRow, ColumnMapping } from '../types';
import { validatePhone, normalizePhone } from './phoneUtils';

/**
 * Sanitize a string value: trim, remove control chars, collapse whitespace.
 * Handles numbers (Excel stores phone as number), null, undefined.
 */
export function sanitizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  // Remove control characters except newline/tab
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Sanitize a phone value, handling Excel numbers that lose leading zeros or +.
 */
export function sanitizePhone(value: unknown): string {
  if (value === null || value === undefined) return '';

  // Excel may store phone as number (e.g. 919876543210 instead of "+919876543210")
  if (typeof value === 'number') {
    return String(value);
  }

  return sanitizeString(value);
}

/**
 * Validate a name field.
 */
export function validateName(name: string): { valid: boolean; reason?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, reason: 'Name is required' };
  }

  const sanitized = sanitizeString(name);
  if (sanitized.length < 1) {
    return { valid: false, reason: 'Name is too short' };
  }

  if (sanitized.length > 200) {
    return { valid: false, reason: 'Name is too long (max 200 chars)' };
  }

  // Check for numeric-only names (likely a data issue)
  if (/^\d+$/.test(sanitized)) {
    return { valid: false, reason: 'Name cannot be numbers only' };
  }

  return { valid: true };
}

/**
 * Validate email (basic check).
 */
export function validateEmail(email: string): { valid: boolean; reason?: string } {
  if (!email) return { valid: true }; // Optional field

  const trimmed = email.trim();
  if (!trimmed) return { valid: true };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: 'Invalid email format' };
  }

  // Check for suspiciously long email
  if (trimmed.length > 254) {
    return { valid: false, reason: 'Email address is too long' };
  }

  return { valid: true };
}

/**
 * Generate a unique ID for a contact row.
 */
let idCounter = 0;
export function generateRowId(): string {
  idCounter += 1;
  return `row_${Date.now()}_${idCounter}`;
}

/**
 * Reset the ID counter (for testing).
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Map a raw row into a ContactRow using column mapping.
 * Handles Excel numeric phone values, robust sanitization, and comprehensive validation.
 */
export function mapRawRowToContact(
  raw: RawRow,
  mapping: ColumnMapping,
): ContactRow {
  const errors: string[] = [];

  const name = mapping.name ? sanitizeString(raw[mapping.name]) : '';
  // Use sanitizePhone for phone to handle Excel number type
  const phone = mapping.phone ? sanitizePhone(raw[mapping.phone]) : '';
  const email = mapping.email ? sanitizeString(raw[mapping.email]) : '';
  const company = mapping.company ? sanitizeString(raw[mapping.company]) : '';
  const notes = mapping.notes ? sanitizeString(raw[mapping.notes]) : '';

  // Validate required fields
  const nameCheck = validateName(name);
  if (!nameCheck.valid) errors.push(nameCheck.reason!);

  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.valid) errors.push(phoneCheck.reason!);

  // Validate optional fields
  if (email) {
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) errors.push(emailCheck.reason!);
  }

  return {
    id: generateRowId(),
    name,
    phone: normalizePhone(phone),
    email: email || undefined,
    company: company || undefined,
    notes: notes || undefined,
    isValid: errors.length === 0,
    validationErrors: errors,
    isDuplicate: false,
    duplicateAction: 'skip',
    existingContactId: undefined,
    selected: true,
  };
}

/**
 * Validate an entire batch of contact rows.
 * Returns stats about the batch.
 */
export function validateBatch(contacts: ContactRow[]): {
  valid: number;
  invalid: number;
  total: number;
} {
  let valid = 0;
  let invalid = 0;

  for (const contact of contacts) {
    if (contact.isValid) valid++;
    else invalid++;
  }

  return { valid, invalid, total: contacts.length };
}
