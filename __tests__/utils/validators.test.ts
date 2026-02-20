/**
 * Unit tests for validation utility functions
 */

import {
  sanitizeString,
  sanitizePhone,
  validateName,
  validateEmail,
  generateRowId,
  mapRawRowToContact,
} from '../../src/utils/validators';
import type { ColumnMapping, RawRow } from '../../src/types';

describe('sanitizeString', () => {
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('returns empty string for undefined/null', () => {
    expect(sanitizeString(undefined)).toBe('');
    expect(sanitizeString(null as any)).toBe('');
  });

  it('removes control characters', () => {
    expect(sanitizeString('hello\x00world')).toBe('helloworld');
  });

  it('converts numbers to string', () => {
    expect(sanitizeString(12345)).toBe('12345');
  });
});

describe('sanitizePhone', () => {
  it('handles number type (Excel format)', () => {
    expect(sanitizePhone(9876543210)).toBe('9876543210');
  });

  it('handles string type', () => {
    expect(sanitizePhone('+91 98765 43210')).toBe('+91 98765 43210');
  });

  it('returns empty for null/undefined', () => {
    expect(sanitizePhone(null)).toBe('');
    expect(sanitizePhone(undefined)).toBe('');
  });
});

describe('validateName', () => {
  it('returns valid for normal names', () => {
    expect(validateName('John Doe').valid).toBe(true);
    expect(validateName('Ravi Kumar').valid).toBe(true);
  });

  it('returns invalid for empty/whitespace', () => {
    expect(validateName('').valid).toBe(false);
    expect(validateName('   ').valid).toBe(false);
  });

  it('returns invalid for names that are too long', () => {
    const result = validateName('A'.repeat(300));
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('too long');
  });

  it('accepts single character names', () => {
    expect(validateName('A').valid).toBe(true);
  });

  it('rejects numeric-only names', () => {
    const result = validateName('12345');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('numbers only');
  });
});

describe('validateEmail', () => {
  it('returns valid for valid emails', () => {
    expect(validateEmail('test@example.com').valid).toBe(true);
    expect(validateEmail('user.name+tag@domain.co').valid).toBe(true);
  });

  it('returns valid for empty/undefined (optional field)', () => {
    expect(validateEmail('').valid).toBe(true);
    expect(validateEmail(undefined as any).valid).toBe(true);
  });

  it('returns invalid for invalid emails', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
    expect(validateEmail('@missing-local.com').valid).toBe(false);
    expect(validateEmail('missing@.com').valid).toBe(false);
  });

  it('rejects suspiciously long emails', () => {
    const longEmail = 'a'.repeat(250) + '@test.com';
    expect(validateEmail(longEmail).valid).toBe(false);
  });
});

describe('generateRowId', () => {
  it('returns a string', () => {
    expect(typeof generateRowId()).toBe('string');
  });

  it('returns unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRowId()));
    expect(ids.size).toBe(100);
  });
});

describe('mapRawRowToContact', () => {
  const mapping: ColumnMapping = {
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    company: 'Company',
    notes: null,
  };

  it('maps raw row to contact row', () => {
    const raw: RawRow = {
      Name: 'John Doe',
      Phone: '9876543210',
      Email: 'john@test.com',
      Company: 'Acme',
    };
    const contact = mapRawRowToContact(raw, mapping);
    expect(contact.name).toBe('John Doe');
    expect(contact.phone).toBe('9876543210');
    expect(contact.email).toBe('john@test.com');
    expect(contact.company).toBe('Acme');
    expect(contact.selected).toBe(true);
  });

  it('marks invalid when name is missing', () => {
    const raw: RawRow = { Name: '', Phone: '9876543210' };
    const contact = mapRawRowToContact(raw, mapping);
    expect(contact.isValid).toBe(false);
    expect(contact.validationErrors.length).toBeGreaterThan(0);
  });

  it('marks invalid when phone is missing', () => {
    const raw: RawRow = { Name: 'John', Phone: '' };
    const contact = mapRawRowToContact(raw, mapping);
    expect(contact.isValid).toBe(false);
  });

  it('marks invalid for invalid phone format', () => {
    const raw: RawRow = { Name: 'John', Phone: '123' };
    const contact = mapRawRowToContact(raw, mapping);
    expect(contact.isValid).toBe(false);
  });

  it('marks valid for correct data', () => {
    const raw: RawRow = { Name: 'John', Phone: '9876543210' };
    const contact = mapRawRowToContact(raw, mapping);
    expect(contact.isValid).toBe(true);
    expect(contact.validationErrors).toEqual([]);
  });
});
