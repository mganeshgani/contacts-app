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

/** Colors — Premium palette */
export const COLORS = {
  // Primary
  primary: '#1E40AF',
  primaryLight: '#3B82F6',
  primaryDark: '#1E3A8A',
  primarySoft: '#DBEAFE',

  // Secondary / Accent
  secondary: '#7C3AED',
  secondaryLight: '#A78BFA',
  secondarySoft: '#EDE9FE',

  // Accent gold (premium touch)
  accent: '#F59E0B',
  accentLight: '#FCD34D',
  accentSoft: '#FEF3C7',

  // Status
  success: '#059669',
  successLight: '#34D399',
  successSoft: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FBBF24',
  warningSoft: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#F87171',
  errorSoft: '#FEE2E2',

  // Duplicate
  duplicate: '#FBBF24',
  duplicateBg: '#FEF3C7',

  // Backgrounds
  background: '#F8FAFC',
  backgroundDark: '#0F172A',

  // Surfaces
  surface: '#FFFFFF',
  surfaceDark: '#1E293B',
  surfaceElevated: '#FFFFFF',
  surfaceElevatedDark: '#273548',

  // Text
  text: '#1E293B',
  textDark: '#F1F5F9',
  textSecondary: '#64748B',
  textSecondaryDark: '#94A3B8',

  // Borders
  border: '#E2E8F0',
  borderDark: '#334155',

  // Gradients (start, end) for LinearGradient use
  gradientPrimary: ['#1E40AF', '#3B82F6'] as readonly [string, string],
  gradientSecondary: ['#7C3AED', '#A78BFA'] as readonly [string, string],
  gradientDark: ['#0F172A', '#1E293B'] as readonly [string, string],
  gradientSuccess: ['#059669', '#34D399'] as readonly [string, string],
  gradientHero: ['#1E3A8A', '#1E40AF', '#3B82F6'] as readonly [string, string, string],
  gradientHeroDark: ['#0F172A', '#1E293B', '#1E3A8A'] as readonly [string, string, string],

  // Shimmer / glass effect
  glass: 'rgba(255,255,255,0.12)',
  glassDark: 'rgba(255,255,255,0.06)',
  overlay: 'rgba(0,0,0,0.4)',
  shimmer: 'rgba(255,255,255,0.25)',
} as const;

/** Shadow presets */
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

/** Border radius presets */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
