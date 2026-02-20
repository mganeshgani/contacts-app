/**
 * Zustand store for app-wide state management
 */

import { create } from 'zustand';
import type {
  ContactRow,
  ColumnMapping,
  ParsedFile,
  ImportProgress,
  ImportRecord,
  PhoneContact,
  AppSettings,
  DuplicateAction,
  DuplicateCheckResult,
} from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { mapRawRowToContact } from '../utils/validators';
import { autoDetectColumns, hasRequiredMappings } from '../utils/fileParser';
import { checkDuplicates, getAllDeviceContacts, buildPhoneLookupMap } from '../services/contactsService';
import { loadSettings, saveSettings, loadImportHistory, saveImportRecord } from '../services/storageService';

// ─── Contacts Store ─────────────────────────────────────────────────────────

interface ContactsState {
  /** Currently parsed file data */
  parsedFile: ParsedFile | null;

  /** Column mapping for current file */
  columnMapping: ColumnMapping;

  /** Mapped contact rows ready for import */
  contacts: ContactRow[];

  /** Cached device contacts */
  deviceContacts: PhoneContact[];

  /** Duplicate check result */
  duplicateResult: DuplicateCheckResult | null;

  /** Import progress */
  importProgress: ImportProgress | null;

  /** Last import record ID */
  lastImportRecordId: string | null;

  /** Cancel token for imports */
  cancelToken: { cancelled: boolean };

  /** Loading states */
  isParsingFile: boolean;
  isLoadingDeviceContacts: boolean;
  isCheckingDuplicates: boolean;

  /** Actions */
  setParsedFile: (file: ParsedFile) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  mapAndValidateContacts: () => void;
  loadDeviceContacts: () => Promise<void>;
  runDuplicateCheck: (defaultAction: DuplicateAction) => void;
  setDuplicateAction: (contactId: string, action: DuplicateAction) => void;
  setBulkDuplicateAction: (action: DuplicateAction) => void;
  toggleContactSelection: (contactId: string) => void;
  selectAllContacts: (selected: boolean) => void;
  removeContact: (contactId: string) => void;
  updateContact: (contactId: string, updates: Partial<ContactRow>) => void;
  setImportProgress: (progress: ImportProgress | null) => void;
  setLastImportRecordId: (id: string | null) => void;
  cancelImport: () => void;
  reset: () => void;
}

const initialContactsState = {
  parsedFile: null,
  columnMapping: { name: null, phone: null, email: null, company: null, notes: null },
  contacts: [],
  deviceContacts: [],
  duplicateResult: null,
  importProgress: null,
  lastImportRecordId: null,
  cancelToken: { cancelled: false },
  isParsingFile: false,
  isLoadingDeviceContacts: false,
  isCheckingDuplicates: false,
};

export const useContactsStore = create<ContactsState>((set, get) => ({
  ...initialContactsState,

  setParsedFile: (file: ParsedFile) => {
    const mapping = autoDetectColumns(file.headers);
    set({
      parsedFile: file,
      columnMapping: mapping,
      contacts: [],
      duplicateResult: null,
    });

    // Auto-map if required fields detected
    if (hasRequiredMappings(mapping)) {
      get().mapAndValidateContacts();
    }
  },

  setColumnMapping: (mapping: ColumnMapping) => {
    set({ columnMapping: mapping, contacts: [], duplicateResult: null });
  },

  mapAndValidateContacts: () => {
    const { parsedFile, columnMapping } = get();
    if (!parsedFile) return;

    const mapped = parsedFile.rows.map((row) =>
      mapRawRowToContact(row, columnMapping)
    );

    set({ contacts: mapped });
  },

  loadDeviceContacts: async () => {
    set({ isLoadingDeviceContacts: true });
    try {
      const contacts = await getAllDeviceContacts();
      set({ deviceContacts: contacts, isLoadingDeviceContacts: false });
    } catch (error) {
      set({ isLoadingDeviceContacts: false });
      throw error;
    }
  },

  runDuplicateCheck: (defaultAction: DuplicateAction) => {
    const { contacts, deviceContacts } = get();
    set({ isCheckingDuplicates: true });

    const result = checkDuplicates(contacts, deviceContacts, defaultAction);

    // Update contacts with duplicate info
    const updatedContacts = contacts.map((contact) => {
      const dup = result.duplicates.find((d) => d.id === contact.id);
      if (dup) {
        return { ...contact, ...dup };
      }
      const newC = result.newContacts.find((n) => n.id === contact.id);
      if (newC) {
        return { ...contact, ...newC };
      }
      return contact;
    });

    set({
      contacts: updatedContacts,
      duplicateResult: result,
      isCheckingDuplicates: false,
    });
  },

  setDuplicateAction: (contactId: string, action: DuplicateAction) => {
    const { contacts } = get();
    set({
      contacts: contacts.map((c) =>
        c.id === contactId ? { ...c, duplicateAction: action } : c
      ),
    });
  },

  setBulkDuplicateAction: (action: DuplicateAction) => {
    const { contacts } = get();
    set({
      contacts: contacts.map((c) =>
        c.isDuplicate ? { ...c, duplicateAction: action } : c
      ),
    });
  },

  toggleContactSelection: (contactId: string) => {
    const { contacts } = get();
    set({
      contacts: contacts.map((c) =>
        c.id === contactId ? { ...c, selected: !c.selected } : c
      ),
    });
  },

  selectAllContacts: (selected: boolean) => {
    const { contacts } = get();
    set({
      contacts: contacts.map((c) => ({ ...c, selected })),
    });
  },

  removeContact: (contactId: string) => {
    const { contacts } = get();
    set({
      contacts: contacts.filter((c) => c.id !== contactId),
    });
  },

  updateContact: (contactId: string, updates: Partial<ContactRow>) => {
    const { contacts } = get();
    set({
      contacts: contacts.map((c) =>
        c.id === contactId ? { ...c, ...updates } : c
      ),
    });
  },

  setImportProgress: (progress: ImportProgress | null) => {
    set({ importProgress: progress });
  },

  setLastImportRecordId: (id: string | null) => {
    set({ lastImportRecordId: id });
  },

  cancelImport: () => {
    get().cancelToken.cancelled = true;
  },

  reset: () => {
    set({
      ...initialContactsState,
      cancelToken: { cancelled: false },
      deviceContacts: get().deviceContacts, // Keep cached device contacts
    });
  },
}));

// ─── Settings Store ─────────────────────────────────────────────────────────

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    const settings = await loadSettings();
    set({ settings, isLoaded: true });
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    const newSettings = { ...get().settings, ...updates };
    set({ settings: newSettings });
    await saveSettings(newSettings);
  },

  resetSettings: async () => {
    set({ settings: DEFAULT_SETTINGS });
    await saveSettings(DEFAULT_SETTINGS);
  },
}));

// ─── History Store ──────────────────────────────────────────────────────────

interface HistoryState {
  records: ImportRecord[];
  isLoaded: boolean;
  loadHistory: () => Promise<void>;
  addRecord: (record: ImportRecord) => Promise<void>;
  markUndone: (recordId: string) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  records: [],
  isLoaded: false,

  loadHistory: async () => {
    const records = await loadImportHistory();
    set({ records, isLoaded: true });
  },

  addRecord: async (record: ImportRecord) => {
    await saveImportRecord(record);
    const records = await loadImportHistory();
    set({ records });
  },

  markUndone: (recordId: string) => {
    const { records } = get();
    set({
      records: records.map((r) =>
        r.id === recordId ? { ...r, canUndo: false } : r
      ),
    });
  },
}));
