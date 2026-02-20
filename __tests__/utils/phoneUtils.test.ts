/**
 * Unit tests for phone utility functions
 */

import {
  normalizePhone,
  validatePhone,
  applyCountryCode,
  phoneToLookupKey,
  formatPhoneForDisplay,
} from '../../src/utils/phoneUtils';

describe('normalizePhone', () => {
  it('removes spaces, dashes, parens but preserves leading +', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
    expect(normalizePhone('(044) 2345-6789')).toBe('04423456789');
  });

  it('returns empty string for empty/undefined/null', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone(undefined as any)).toBe('');
    expect(normalizePhone(null as any)).toBe('');
  });

  it('trims whitespace before normalizing', () => {
    expect(normalizePhone('  1234567890  ')).toBe('1234567890');
  });

  it('returns digits without + when input has no +', () => {
    expect(normalizePhone('91 98765 43210')).toBe('919876543210');
  });

  it('handles Excel numeric phone values', () => {
    expect(normalizePhone(9876543210 as any)).toBe('9876543210');
    expect(normalizePhone(919876543210 as any)).toBe('919876543210');
  });

  it('strips 00 international prefix', () => {
    expect(normalizePhone('00919876543210')).toBe('919876543210');
  });
});

describe('validatePhone', () => {
  it('returns valid for 10-digit numbers', () => {
    expect(validatePhone('9876543210').valid).toBe(true);
  });

  it('returns valid for numbers with country code (12-13 digits)', () => {
    expect(validatePhone('919876543210').valid).toBe(true);
  });

  it('returns valid for +91 prefixed numbers', () => {
    expect(validatePhone('+919876543210').valid).toBe(true);
    expect(validatePhone('+91 98765 43210').valid).toBe(true);
  });

  it('returns invalid for too short numbers', () => {
    const result = validatePhone('12345');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('at least');
  });

  it('returns invalid for too long numbers', () => {
    const result = validatePhone('1234567890123456');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('at most');
  });

  it('returns invalid for empty string', () => {
    const result = validatePhone('');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('required');
  });

  it('returns invalid for null/undefined', () => {
    expect(validatePhone(null as any).valid).toBe(false);
    expect(validatePhone(undefined as any).valid).toBe(false);
  });

  it('returns invalid for phone with letters', () => {
    const result = validatePhone('98765abc10');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('letters');
  });

  it('returns invalid for all-zero numbers', () => {
    const result = validatePhone('0000000000');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('zeros');
  });
});

describe('applyCountryCode', () => {
  it('prepends country code to 10-digit number', () => {
    expect(applyCountryCode('9876543210', '+91')).toBe('+919876543210');
  });

  it('detects 12-digit numbers starting with country code and adds +', () => {
    expect(applyCountryCode('919876543210', '+91')).toBe('+919876543210');
  });

  it('returns original if already has + prefix', () => {
    const result = applyCountryCode('+919876543210', '+91');
    expect(result).toBe('+919876543210');
  });

  it('handles empty/null input', () => {
    expect(applyCountryCode('', '+91')).toBe('');
    expect(applyCountryCode(null as any, '+91')).toBe('');
  });
});

describe('phoneToLookupKey', () => {
  it('returns last 10 digits for India-style lookup', () => {
    expect(phoneToLookupKey('919876543210')).toBe('9876543210');
    expect(phoneToLookupKey('+919876543210')).toBe('9876543210');
  });

  it('returns full normalized number if <= 10 digits', () => {
    expect(phoneToLookupKey('9876543210')).toBe('9876543210');
  });

  it('handles short numbers gracefully', () => {
    expect(phoneToLookupKey('12345')).toBe('12345');
  });

  it('handles numeric input', () => {
    expect(phoneToLookupKey(9876543210 as any)).toBe('9876543210');
  });
});

describe('formatPhoneForDisplay', () => {
  it('formats Indian 12-digit number', () => {
    expect(formatPhoneForDisplay('+919876543210')).toBe('+91 98765 43210');
  });

  it('formats 10-digit number', () => {
    expect(formatPhoneForDisplay('9876543210')).toBe('98765 43210');
  });

  it('returns original for other formats', () => {
    expect(formatPhoneForDisplay('+14155551234')).toBe('+14155551234');
  });
});
