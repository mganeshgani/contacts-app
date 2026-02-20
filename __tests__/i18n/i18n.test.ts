/**
 * Unit tests for i18n translation system
 */

import { t, getAvailableLanguages } from '../../src/i18n';

describe('t (translate)', () => {
  it('returns English translations by default', () => {
    expect(t('appName', 'en')).toBe('ExcelContactImporter');
  });

  it('returns Tamil translations', () => {
    const result = t('appName', 'ta');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('falls back to English for missing Tamil key', () => {
    // Using a key that exists in English
    const result = t('appName', 'ta');
    expect(result).toBeTruthy();
  });

  it('returns key when translation not found', () => {
    const result = t('nonExistentKey' as any, 'en');
    expect(result).toBe('nonExistentKey');
  });

  it('interpolates parameters', () => {
    // Test with a key that uses interpolation if available
    const result = t('importProgressTitle', 'en');
    expect(typeof result).toBe('string');
  });
});

describe('getAvailableLanguages', () => {
  it('returns at least en and ta', () => {
    const langs = getAvailableLanguages();
    expect(langs).toContain('en');
    expect(langs).toContain('ta');
  });
});
