/**
 * Unit tests for contacts service
 */

import {
  buildPhoneLookupMap,
  checkDuplicates,
} from '../../src/services/contactsService';
import type { PhoneContact, ContactRow } from '../../src/types';

describe('buildPhoneLookupMap', () => {
  it('builds a map keyed by normalizedPhones values', () => {
    // normalizedPhones should already be lookup keys (last 10 digits)
    const contacts: PhoneContact[] = [
      {
        id: 'c1',
        name: 'John',
        phones: ['+919876543210'],
        normalizedPhones: ['9876543210'],
        emails: [],
      },
      {
        id: 'c2',
        name: 'Jane',
        phones: ['8765432109'],
        normalizedPhones: ['8765432109'],
        emails: [],
      },
    ];
    const map = buildPhoneLookupMap(contacts);
    expect(map.has('9876543210')).toBe(true);
    expect(map.has('8765432109')).toBe(true);
    expect(map.get('9876543210')?.name).toBe('John');
  });

  it('handles empty contacts array', () => {
    const map = buildPhoneLookupMap([]);
    expect(map.size).toBe(0);
  });

  it('handles contacts with multiple phones', () => {
    const contacts: PhoneContact[] = [
      {
        id: 'c1',
        name: 'Multi',
        phones: ['9876543210', '8765432109'],
        normalizedPhones: ['9876543210', '8765432109'],
        emails: [],
      },
    ];
    const map = buildPhoneLookupMap(contacts);
    expect(map.has('9876543210')).toBe(true);
    expect(map.has('8765432109')).toBe(true);
  });
});

describe('checkDuplicates', () => {
  const deviceContacts: PhoneContact[] = [
    {
      id: 'c1',
      name: 'Existing Contact',
      phones: ['+919876543210'],
      normalizedPhones: ['9876543210'],
      emails: ['existing@test.com'],
    },
  ];

  it('identifies duplicate contacts', () => {
    const contacts: ContactRow[] = [
      {
        id: '1',
        name: 'Duplicate Person',
        phone: '9876543210',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
    ];
    const result = checkDuplicates(contacts, deviceContacts);
    expect(result.duplicates.length).toBe(1);
    expect(result.duplicates[0].isDuplicate).toBe(true);
    expect(result.newContacts.length).toBe(0);
  });

  it('identifies new contacts', () => {
    const contacts: ContactRow[] = [
      {
        id: '1',
        name: 'New Person',
        phone: '1111111111',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
    ];
    const result = checkDuplicates(contacts, deviceContacts);
    expect(result.newContacts.length).toBe(1);
    expect(result.duplicates.length).toBe(0);
  });

  it('separates duplicates and new contacts correctly', () => {
    const contacts: ContactRow[] = [
      {
        id: '1',
        name: 'Dup',
        phone: '9876543210',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
      {
        id: '2',
        name: 'New',
        phone: '5555555555',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
    ];
    const result = checkDuplicates(contacts, deviceContacts);
    expect(result.duplicates.length).toBe(1);
    expect(result.newContacts.length).toBe(1);
    expect(result.totalExisting).toBe(1);
  });

  it('handles empty import contacts', () => {
    const result = checkDuplicates([], deviceContacts);
    expect(result.duplicates.length).toBe(0);
    expect(result.newContacts.length).toBe(0);
  });

  it('handles empty device contacts', () => {
    const contacts: ContactRow[] = [
      {
        id: '1',
        name: 'Person',
        phone: '9876543210',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
    ];
    const result = checkDuplicates(contacts, []);
    expect(result.duplicates.length).toBe(0);
    expect(result.newContacts.length).toBe(1);
  });

  it('detects duplicates within the same import batch', () => {
    const contacts: ContactRow[] = [
      {
        id: '1',
        name: 'Person A',
        phone: '5555555555',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
      {
        id: '2',
        name: 'Person B',
        phone: '5555555555',
        isValid: true,
        validationErrors: [],
        isDuplicate: false,
        duplicateAction: 'skip',
        selected: true,
      },
    ];
    const result = checkDuplicates(contacts, []);
    // First one is new, second is duplicate within batch
    expect(result.newContacts.length).toBe(1);
    expect(result.duplicates.length).toBe(1);
    expect(result.duplicates[0].name).toBe('Person B');
  });
});
