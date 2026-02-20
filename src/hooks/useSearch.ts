/**
 * Hook for debounced search in contact lists
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEBOUNCE_MS } from '../constants';
import type { ContactRow } from '../types';

interface UseSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredContacts: ContactRow[];
  clearSearch: () => void;
}

export function useContactSearch(contacts: ContactRow[]): UseSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<ContactRow[]>(contacts);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    timerRef.current = setTimeout(() => {
      const query = searchQuery.toLowerCase().trim();
      const filtered = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          (c.email && c.email.toLowerCase().includes(query)) ||
          (c.company && c.company.toLowerCase().includes(query))
      );
      setFilteredContacts(filtered);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchQuery, contacts]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilteredContacts(contacts);
  }, [contacts]);

  return { searchQuery, setSearchQuery, filteredContacts, clearSearch };
}
