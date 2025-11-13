'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSyncMetadata, getPendingChangesCount } from '@/lib/db/sync-metadata';
import type { NetworkState } from '@/lib/sync/types';

/**
 * Hook mejorado para gestión del estado de red y sincronización
 * 
 * @description
 * - Detecta cambios online/offline
 * - Gestiona queue de sync con retry
 * - Proporciona estadísticas de sincronización
 * - Auto-sync cuando vuelve conexión
 * 
 * @performance
 * - Debounce en detección de conexión
 * - Retry exponencial para sync fallido
 * - Throttle en polling de metadata
 */
export function useNetworkState() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : false,
    pendingChanges: 0,
    lastSync: null,
    isSyncing: false,
  });

  // Cargar estado inicial
  useEffect(() => {
    if (typeof window === 'undefined') return;

    loadInitialState();
  }, []);

  const loadInitialState = async () => {
    try {
      const [metadata, pendingCount] = await Promise.all([
        getSyncMetadata(),
        getPendingChangesCount()
      ]);

      setNetworkState(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        pendingChanges: pendingCount,
        lastSync: metadata?.lastSyncTimestamp || null,
      }));
    } catch (error) {
      console.error('❌ Failed to load initial network state:', error);
    }
  };

  // Monitor online/offline status con debounce
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;

    const handleOnline = () => {
      // Debounce para evitar múltiples eventos
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        console.log('🟢 Connection restored, syncing...');
        setNetworkState(prev => ({ ...prev, isOnline: true }));
        
        // Auto-sync cuando vuelve la conexión
        await triggerSync();
      }, 1000);
    };

    const handleOffline = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log('🔴 Connection lost, working offline');
        setNetworkState(prev => ({ 
          ...prev, 
          isOnline: false,
          isSyncing: false 
        }));
      }, 1000);
    };

    // Listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Polling periódico de metadata (cada 30s)
  useEffect(() => {
    if (!networkState.isOnline) return;

    const interval = setInterval(async () => {
      try {
        const [metadata, pendingCount] = await Promise.all([
          getSyncMetadata(),
          getPendingChangesCount()
        ]);

        setNetworkState(prev => ({
          ...prev,
          pendingChanges: pendingCount,
          lastSync: metadata?.lastSyncTimestamp || null,
        }));
      } catch (error) {
        console.warn('⚠️ Failed to update network state:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [networkState.isOnline]);

  /**
   * Trigger manual sync con retry exponencial (via API route)
   */
  const triggerSync = useCallback(async (maxRetries = 3): Promise<boolean> => {
    if (!networkState.isOnline || networkState.isSyncing) {
      return false;
    }

    setNetworkState(prev => ({ ...prev, isSyncing: true }));

    let retries = 0;
    while (retries < maxRetries) {
      try {
        console.log(`🔄 Attempting sync (attempt ${retries + 1}/${maxRetries})...`);
        
        // Llamar API route en lugar de importar directamente woo-sync-worker
        const response = await fetch('/api/sync/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'incremental' }),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Sync successful:', result);
          
          // Actualizar estado
          const [metadata, pendingCount] = await Promise.all([
            getSyncMetadata(),
            getPendingChangesCount()
          ]);

          setNetworkState(prev => ({
            ...prev,
            isSyncing: false,
            pendingChanges: pendingCount,
            lastSync: metadata?.lastSyncTimestamp || null,
          }));
          
          return true;
        } else {
          throw new Error(`Sync API failed: ${response.status}`);
        }
      } catch (error) {
        retries++;
        console.error(`❌ Sync attempt ${retries} failed:`, error);
        
        if (retries < maxRetries) {
          // Retry exponencial: 1s, 2s, 4s
          const delay = Math.pow(2, retries - 1) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    setNetworkState(prev => ({ ...prev, isSyncing: false }));
    return false;
  }, [networkState.isOnline, networkState.isSyncing]);

  /**
   * Force full sync (útil para testing) via API route
   */
  const triggerFullSync = useCallback(async (): Promise<boolean> => {
    if (!networkState.isOnline || networkState.isSyncing) {
      return false;
    }

    setNetworkState(prev => ({ ...prev, isSyncing: true }));

    try {
      console.log('🔄 Starting full sync...');
      
      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'full' }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Full sync successful:', result);
        await loadInitialState();
        return true;
      } else {
        throw new Error(`Full sync API failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      return false;
    } finally {
      setNetworkState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [networkState.isOnline, networkState.isSyncing]);

  /**
   * Refresh network state manually
   */
  const refreshState = useCallback(async () => {
    await loadInitialState();
  }, []);

  /**
   * Check if sync is needed
   */
  const needsSync = useCallback(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return !networkState.lastSync || networkState.lastSync < oneHourAgo;
  }, [networkState.lastSync]);

  return {
    ...networkState,
    triggerSync,
    triggerFullSync,
    refreshState,
    needsSync,
  };
}