/**
 * Core type definitions for ExcelContactImporter
 */

/** Raw row parsed from Excel/CSV before column mapping */
export interface RawRow {
  [key: string]: string | undefined;
}

/** Mapped contact row after column mapping */
export interface ContactRow {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
  isValid: boolean;
  validationErrors: string[];
  isDuplicate: boolean;
  duplicateAction: DuplicateAction;
  existingContactId?: string;
  selected: boolean;
}

/** Duplicate handling strategies */
export type DuplicateAction = 'skip' | 'update' | 'force_add';

/** Column mapping configuration */
export interface ColumnMapping {
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  notes: string | null;
}

/** Required fields for validation */
export const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['name', 'phone'];

/** Parsed file result */
export interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: RawRow[];
  rowCount: number;
  parseDate: string;
}

/** Import progress tracking */
export interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  updated: number;
  isRunning: boolean;
  isCancelled: boolean;
  currentBatch: number;
  totalBatches: number;
  errors: ImportError[];
}

/** Individual import error */
export interface ImportError {
  rowIndex: number;
  contactName: string;
  phone: string;
  errorMessage: string;
}

/** Import history record */
export interface ImportRecord {
  id: string;
  fileName: string;
  date: string;
  totalRows: number;
  imported: number;
  skipped: number;
  updated: number;
  failed: number;
  contactIds: string[];
  canUndo: boolean;
}

/** Duplicate check result */
export interface DuplicateCheckResult {
  newContacts: ContactRow[];
  duplicates: ContactRow[];
  totalExisting: number;
}

/** Phone contact from device */
export interface PhoneContact {
  id: string;
  name: string;
  phones: string[];
  normalizedPhones: string[];
  emails: string[];
  company?: string;
}

/** App settings */
export interface AppSettings {
  darkMode: boolean;
  language: 'en' | 'ta' | 'hi' | 'te' | 'ml';
  defaultCountryCode: string;
  autoSkipDuplicates: boolean;
  batchSize: number;
  showOnboarding: boolean;
  defaultDuplicateAction: DuplicateAction;
}

/** Default settings */
export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  language: 'en',
  defaultCountryCode: '+91',
  autoSkipDuplicates: false,
  batchSize: 100,
  showOnboarding: true,
  defaultDuplicateAction: 'skip',
};

/** Navigation types */
export type RootTabParamList = {
  Home: undefined;
  Preview: undefined;
  History: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ImportProgress: undefined;
  ImportSummary: { recordId: string };
  ColumnMapper: undefined;
  Onboarding: undefined;
};

/** Toast types */
export type ToastType = 'success' | 'error' | 'info';

/** File type support */
export type SupportedFileType = 'xlsx' | 'xls' | 'csv';

export const SUPPORTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
  'text/comma-separated-values',
  'application/csv',
];

export const SUPPORTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
