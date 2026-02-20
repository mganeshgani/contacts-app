/**
 * App-wide constants
 */

/** Batch processing */
export const DEFAULT_BATCH_SIZE = 100;
export const MAX_FILE_ROWS = 10_000;
export const PARSE_TIMEOUT_MS = 10_000;

/** Phone validation */
export const PHONE_MIN_DIGITS = 10;
export const PHONE_MAX_DIGITS = 15;
export const PHONE_REGEX = /^\+?[\d\s\-()]{10,20}$/;
export const DIGITS_ONLY_REGEX = /\d/g;

/** Common header aliases for auto-mapping */
export const HEADER_ALIASES: Record<string, string[]> = {
  name: [
    'name', 'full name', 'fullname', 'contact name', 'contactname',
    'first name', 'firstname', 'person', 'display name',
    'பெயர்', 'नाम', 'పేరు', 'പേര്',
  ],
  phone: [
    'phone', 'phone number', 'phonenumber', 'mobile', 'mobile number',
    'cell', 'cell phone', 'telephone', 'tel', 'number',
    'contact number', 'phone no', 'mobile no', 'ph no',
    'தொலைபேசி', 'फोन', 'मोबाइल', 'ఫోన్', 'ഫോൺ',
  ],
  email: [
    'email', 'e-mail', 'email address', 'emailaddress', 'mail',
    'மின்னஞ்சல்', 'ईमेल', 'ఇమెయిల్', 'ഇമെയിൽ',
  ],
  company: [
    'company', 'organization', 'organisation', 'org', 'firm',
    'business', 'நிறுவனம்', 'कंपनी', 'కంపెనీ', 'കമ്പനി',
  ],
  notes: [
    'notes', 'note', 'comment', 'comments', 'description', 'remarks',
    'குறிப்புகள்', 'टिप्पणी', 'గమనికలు', 'കുറിപ്പുകൾ',
  ],
};

/** Storage keys */
export const STORAGE_KEYS = {
  SETTINGS: '@eci_settings',
  IMPORT_HISTORY: '@eci_import_history',
  ONBOARDING_COMPLETE: '@eci_onboarding_complete',
  LAST_COLUMN_MAPPING: '@eci_last_column_mapping',
} as const;

/** UI constants */
export const ANIMATION_DURATION = 300;
export const DEBOUNCE_MS = 300;
export const LIST_ITEM_HEIGHT = 72;
export const BATCH_PROGRESS_INTERVAL = 100;

/** Colors */
export const COLORS = {
  primary: '#1E40AF',
  primaryLight: '#3B82F6',
  secondary: '#7C3AED',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  duplicate: '#FBBF24',
  duplicateBg: '#FEF3C7',
  background: '#F8FAFC',
  backgroundDark: '#0F172A',
  surface: '#FFFFFF',
  surfaceDark: '#1E293B',
  text: '#1E293B',
  textDark: '#F1F5F9',
  textSecondary: '#64748B',
  textSecondaryDark: '#94A3B8',
  border: '#E2E8F0',
  borderDark: '#334155',
} as const;
