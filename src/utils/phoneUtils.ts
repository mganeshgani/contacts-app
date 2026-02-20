/**
 * Phone number normalization and validation utilities
 * Handles Indian (+91) and international phone formats robustly.
 */

import { PHONE_MIN_DIGITS, PHONE_MAX_DIGITS, DIGITS_ONLY_REGEX } from '../constants';

/**
 * Normalize a phone number to digits-only with optional leading +.
 * Strips spaces, dashes, parentheses, dots, and other formatting.
 * Handles Excel numeric values (phone stored as number type).
 * 
 * Examples:
 *   "+91 98765-43210"  → "+919876543210"
 *   "(044) 2345-6789"  → "04423456789"
 *   "91 98765 43210"   → "919876543210"
 *   9876543210 (number) → "9876543210"
 */
export function normalizePhone(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';

  // Handle Excel storing phone as number
  let cleaned = String(raw).trim();

  if (!cleaned) return '';

  // Preserve leading + if present
  const hasPlus = cleaned.startsWith('+');

  // Remove all non-digit characters
  const digits = cleaned.match(DIGITS_ONLY_REGEX);
  if (!digits) return '';

  let digitStr = digits.join('');

  // Strip leading zeros for international dialing (00 prefix)
  if (!hasPlus && digitStr.startsWith('00') && digitStr.length > 12) {
    digitStr = digitStr.substring(2);
  }

  return hasPlus ? `+${digitStr}` : digitStr;
}

/**
 * Validate a phone number after normalization.
 * Must have 10-15 digits (excluding leading +).
 * Accepts Indian numbers in all common formats.
 */
export function validatePhone(phone: string | number | null | undefined): { valid: boolean; reason?: string } {
  if (phone === null || phone === undefined || phone === '') {
    return { valid: false, reason: 'Phone number is required' };
  }

  const raw = String(phone);

  // Check for letters (invalid)
  if (/[a-zA-Z]/.test(raw)) {
    return { valid: false, reason: 'Phone number contains letters' };
  }

  const normalized = normalizePhone(raw);
  if (!normalized) {
    return { valid: false, reason: 'Phone number contains no digits' };
  }

  // Count digits only
  const digitCount = normalized.replace(/\D/g, '').length;

  if (digitCount < PHONE_MIN_DIGITS) {
    return { valid: false, reason: `Phone must have at least ${PHONE_MIN_DIGITS} digits (has ${digitCount})` };
  }

  if (digitCount > PHONE_MAX_DIGITS) {
    return { valid: false, reason: `Phone must have at most ${PHONE_MAX_DIGITS} digits (has ${digitCount})` };
  }

  // Check for all-zero numbers (invalid)
  if (/^0+$/.test(normalized.replace(/\D/g, ''))) {
    return { valid: false, reason: 'Phone number cannot be all zeros' };
  }

  return { valid: true };
}

/**
 * Apply default country code if the number doesn't already have one.
 * Intelligently handles:
 *   - 10-digit numbers: prepend country code (e.g. +91)
 *   - 12-digit starting with 91 (no +): add + prefix
 *   - Already has +: return as-is
 *   - Other lengths: add + prefix
 *
 * @param phone Normalized phone string
 * @param countryCode e.g. "+91"
 */
export function applyCountryCode(phone: string | number | null | undefined, countryCode: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return '';

  // Already has country code with +
  if (normalized.startsWith('+')) return normalized;

  const digits = normalized.replace(/\D/g, '');
  const codeDigits = countryCode.replace(/\D/g, ''); // e.g. "91" from "+91"

  // For 10-digit numbers, prepend full country code
  if (digits.length === 10) {
    return `${countryCode}${digits}`;
  }

  // For numbers that already include the country code digits (e.g. "919876543210")
  // Detect by checking if digits start with country code and remaining is 10 digits
  if (codeDigits && digits.startsWith(codeDigits)) {
    const remaining = digits.substring(codeDigits.length);
    if (remaining.length === 10) {
      return `+${digits}`;
    }
  }

  // For other lengths, just prepend +
  return `+${digits}`;
}

/**
 * Create a phone lookup key for duplicate detection.
 * Strips country code to compare last 10 digits for India-centric matching.
 * This ensures +919876543210, 919876543210, and 9876543210 all match.
 */
export function phoneToLookupKey(phone: string | number | null | undefined): string {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/\D/g, '');

  // Use last 10 digits as the key (handles country code differences)
  if (digits.length >= 10) {
    return digits.slice(-10);
  }

  return digits;
}

/**
 * Format a phone number for display.
 * E.g. "+919876543210" → "+91 98765 43210"
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return phone;

  const digits = normalized.replace(/\D/g, '');

  // Indian format: +91 XXXXX XXXXX
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.substring(2, 7)} ${digits.substring(7)}`;
  }

  // 10-digit: XXXXX XXXXX
  if (digits.length === 10) {
    return `${digits.substring(0, 5)} ${digits.substring(5)}`;
  }

  return normalized;
}
