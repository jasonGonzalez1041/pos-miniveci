'use client';

// React hook for automatic offline/online sync
// Detects connectivity changes and triggers background sync

import { useEffect, useState, useCallback } from 'react';
import { fullSync, scheduleSyncDebounced } from '@/lib/db/sync';
import { initLocalDb } from '@/lib/db/local-db';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);


  // Initialize local database on mount
  const initDb = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      await initLocalDb();
      console.log('[useOfflineSync] Local DB initialized');
      setIsInitialized(true);
      // Initial sync on mount after state updates are flushed
      setTimeout(() => { void fullSync(); }, 0);
    } catch (err) {
      console.error('[useOfflineSync] Failed to initialize local DB:', err);
    }
  }, []);

  useEffect(() => {
    void initDb();
  }, [initDb]);

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('[useOfflineSync] Connection restored, syncing...');
      setIsOnline(true);
      // Trigger sync when coming back online
      void fullSync();
    };

    const handleOffline = () => {
      console.log('[useOfflineSync] Connection lost, working offline');
      setIsOnline(false);
    };

    // Set initial online status
    setIsOnline(navigator.onLine);

    // Listen for connectivity changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic background sync (every 30 seconds when online)
  useEffect(() => {
    if (!isOnline || !isInitialized) return;

    const interval = setInterval(() => {
      console.log('[useOfflineSync] Periodic sync check');
      scheduleSyncDebounced(1000);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, isInitialized]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncing || !isInitialized) return;

    setIsSyncing(true);

    try {
      const result = await fullSync();

      if (result.success) {
        console.log('[useOfflineSync] Sync successful:', result);
      } else {
        console.error('[useOfflineSync] Sync had errors:', result.errors);
      }
    } catch (err) {
      console.error('[useOfflineSync] Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, isInitialized]);

  return {
    isOnline,
    isSyncing,
    isInitialized,
    triggerSync,
  };
}
