/**
 * Unit tests for file parser utility functions
 */

import {
  autoDetectColumns,
  hasRequiredMappings,
  generateCSV,
  generateVCF,
} from '../../src/utils/fileParser';
import type { ColumnMapping, ContactRow } from '../../src/types';

describe('autoDetectColumns', () => {
  it('detects standard English headers', () => {
    const headers = ['Name', 'Phone', 'Email', 'Company', 'Notes'];
    const mapping = autoDetectColumns(headers);
    expect(mapping.name).toBe('Name');
    expect(mapping.phone).toBe('Phone');
    expect(mapping.email).toBe('Email');
    expect(mapping.company).toBe('Company');
    expect(mapping.notes).toBe('Notes');
  });

  it('detects case-insensitive headers', () => {
    const headers = ['name', 'PHONE NUMBER', 'EMAIL ADDRESS', 'COMPANY'];
    const mapping = autoDetectColumns(headers);
    expect(mapping.name).not.toBeNull();
    expect(mapping.phone).not.toBeNull();
    expect(mapping.email).not.toBeNull();
    expect(mapping.company).not.toBeNull();
  });

  it('detects variations like "mobile" for phone', () => {
    const headers = ['Full Name', 'Mobile', 'E-mail'];
    const mapping = autoDetectColumns(headers);
    expect(mapping.name).toBe('Full Name');
    expect(mapping.phone).toBe('Mobile');
    expect(mapping.email).toBe('E-mail');
  });

  it('returns null for unmapped fields', () => {
    const headers = ['Col A', 'Col B', 'Col C'];
    const mapping = autoDetectColumns(headers);
    expect(mapping.name).toBeNull();
    expect(mapping.phone).toBeNull();
  });

  it('handles empty headers array', () => {
    const mapping = autoDetectColumns([]);
    expect(mapping.name).toBeNull();
    expect(mapping.phone).toBeNull();
    expect(mapping.email).toBeNull();
    expect(mapping.company).toBeNull();
    expect(mapping.notes).toBeNull();
  });
});

describe('hasRequiredMappings', () => {
  it('returns true when name and phone are mapped', () => {
    const mapping: ColumnMapping = {
      name: 'Name',
      phone: 'Phone',
      email: null,
      company: null,
      notes: null,
    };
    expect(hasRequiredMappings(mapping)).toBe(true);
  });

  it('returns false when name is missing', () => {
    const mapping: ColumnMapping = {
      name: null,
      phone: 'Phone',
      email: null,
      company: null,
      notes: null,
    };
    expect(hasRequiredMappings(mapping)).toBe(false);
  });

  it('returns false when phone is missing', () => {
    const mapping: ColumnMapping = {
      name: 'Name',
      phone: null,
      email: null,
      company: null,
      notes: null,
    };
    expect(hasRequiredMappings(mapping)).toBe(false);
  });
});

describe('generateCSV', () => {
  it('generates valid CSV with headers', () => {
    const contacts: ContactRow[] = [
      {
        id: '1',
        name: 'John Doe',
        phone: '9876543210',
        email: 'john@test.com',
        company: 'Acme',
        notes: 'Test',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
    ];
    const csv = generateCSV(contacts);
    expect(csv).toContain('Name,Phone,Email,Company,Notes');
    expect(csv).toContain('John Doe,9876543210,john@test.com,Acme,Test');
  });

  it('handles empty contacts array', () => {
    const csv = generateCSV([]);
    expect(csv).toContain('Name,Phone,Email,Company,Notes');
    // Only header, no data rows
    expect(csv.trim().split('\n').length).toBe(1);
  });

  it('escapes commas in fields', () => {
    const contacts: ContactRow[] = [
      {
        id: '1',
        name: 'Doe, John',
        phone: '9876543210',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
    ];
    const csv = generateCSV(contacts);
    expect(csv).toContain('"Doe, John"');
  });
});

describe('generateVCF', () => {
  it('generates valid VCF format', () => {
    const contacts: ContactRow[] = [
      {
        id: '1',
        name: 'John Doe',
        phone: '9876543210',
        email: 'john@test.com',
        company: 'Acme',
        notes: 'Test note',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
    ];
    const vcf = generateVCF(contacts);
    expect(vcf).toContain('BEGIN:VCARD');
    expect(vcf).toContain('VERSION:3.0');
    expect(vcf).toContain('FN:John Doe');
    expect(vcf).toContain('TEL:9876543210');
    expect(vcf).toContain('EMAIL:john@test.com');
    expect(vcf).toContain('ORG:Acme');
    expect(vcf).toContain('NOTE:Test note');
    expect(vcf).toContain('END:VCARD');
  });

  it('handles contact without optional fields', () => {
    const contacts: ContactRow[] = [
      {
        id: '1',
        name: 'Jane',
        phone: '1234567890',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
    ];
    const vcf = generateVCF(contacts);
    expect(vcf).toContain('FN:Jane');
    expect(vcf).toContain('TEL:1234567890');
    expect(vcf).not.toContain('EMAIL:');
    expect(vcf).not.toContain('ORG:');
  });

  it('generates multiple vCards', () => {
    const contacts: ContactRow[] = [
      {
        id: '1', name: 'A', phone: '1111111111',
        isValid: true, validationErrors: [], isDuplicate: false,
        duplicateAction: 'skip', selected: true,
      },
      {
        id: '2', name: 'B', phone: '2222222222',
        isValid: true, validationErrors: [], isDuplicate: false,
        duplicateAction: 'skip', selected: true,
      },
    ];
    const vcf = generateVCF(contacts);
    const cards = vcf.split('BEGIN:VCARD').filter(Boolean);
    expect(cards.length).toBe(2);
  });
});
