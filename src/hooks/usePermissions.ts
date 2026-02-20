/**
 * Hook for managing contacts permissions
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import {
  requestContactsPermission,
  checkContactsPermission,
} from '../services/contactsService';

interface UsePermissionsReturn {
  hasPermission: boolean | null;
  canAskAgain: boolean;
  isChecking: boolean;
  requestPermission: () => Promise<boolean>;
  openSettings: () => void;
}

export function usePermissions(): UsePermissionsReturn {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  // Check permission on mount
  useEffect(() => {
    const check = async () => {
      try {
        const result = await checkContactsPermission();
        setHasPermission(result.granted);
        setCanAskAgain(result.canAskAgain);
      } catch {
        setHasPermission(false);
      } finally {
        setIsChecking(false);
      }
    };

    check();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setIsChecking(true);
      const result = await requestContactsPermission();
      setHasPermission(result.granted);
      setCanAskAgain(result.canAskAgain);
      return result.granted;
    } catch {
      setHasPermission(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  return {
    hasPermission,
    canAskAgain,
    isChecking,
    requestPermission,
    openSettings,
  };
}
