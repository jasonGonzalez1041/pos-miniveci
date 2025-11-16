/**
 * Gestión de metadata de sincronización
 * Controla timestamps y estado del sistema de sync
 */

import { eq } from 'drizzle-orm';
import { initLocalDb } from './local-db';
import { cloudDb } from './cloud-db';
import { syncMetadata } from './schema';
import type { SyncMetadata } from '../sync/types';

const SINGLETON_ID = 'singleton';

/**
 * Obtiene metadata de sincronización
 */
export async function getSyncMetadata(): Promise<SyncMetadata | null> {
  try {
    const localDb = await initLocalDb();
    const result = await localDb
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.id, SINGLETON_ID))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error('❌ Failed to get sync metadata:', error);
    return null;
  }
}

/**
 * Inicializa metadata si no existe
 */
export async function initSyncMetadata(): Promise<SyncMetadata> {
  const existing = await getSyncMetadata();
  if (existing) {
    return existing;
  }

  const newMetadata = {
    id: SINGLETON_ID,
    lastSyncTimestamp: null,
    lastFullSyncTimestamp: null,
    pendingChanges: 0,
    updatedAt: new Date(),
  };

  try {
    const localDb = await initLocalDb();
    await localDb.insert(syncMetadata).values(newMetadata);
    
    // Sync to cloud
    try {
      const cloudDb = cloudDb();
      await cloudDb.insert(syncMetadata).values(newMetadata);
    } catch (cloudError) {
      console.warn('⚠️ Cloud sync metadata init failed:', cloudError);
    }
    
    return newMetadata as SyncMetadata;
    
  } catch (error) {
    console.error('❌ Failed to init sync metadata:', error);
    throw error;
  }
}

/**
 * Actualiza timestamp del último sync incremental
 */
export async function updateLastSyncTimestamp(timestamp: Date): Promise<void> {
  try {
    await initSyncMetadata(); // Ensure exists
    
    const localDb = await initLocalDb();
    await localDb
      .update(syncMetadata)
      .set({
        lastSyncTimestamp: timestamp,
        updatedAt: new Date(),
      })
      .where(eq(syncMetadata.id, SINGLETON_ID));
    
    // Sync to cloud
    try {
      const cloudDb = cloudDb();
      await cloudDb
        .update(syncMetadata)
        .set({
          lastSyncTimestamp: timestamp,
          updatedAt: new Date(),
        })
        .where(eq(syncMetadata.id, SINGLETON_ID));
    } catch (cloudError) {
      console.warn('⚠️ Cloud sync timestamp update failed:', cloudError);
    }
    
  } catch (error) {
    console.error('❌ Failed to update sync timestamp:', error);
    throw error;
  }
}

/**
 * Actualiza timestamp del último sync completo
 */
export async function updateLastFullSyncTimestamp(timestamp: Date): Promise<void> {
  try {
    await initSyncMetadata();
    
    const localDb = await initLocalDb();
    await localDb
      .update(syncMetadata)
      .set({
        lastFullSyncTimestamp: timestamp,
        updatedAt: new Date(),
      })
      .where(eq(syncMetadata.id, SINGLETON_ID));
    
    // Sync to cloud
    try {
      const cloudDb = cloudDb();
      await cloudDb
        .update(syncMetadata)
        .set({
          lastFullSyncTimestamp: timestamp,
          updatedAt: new Date(),
        })
        .where(eq(syncMetadata.id, SINGLETON_ID));
    } catch (cloudError) {
      console.warn('⚠️ Cloud full sync timestamp update failed:', cloudError);
    }
    
  } catch (error) {
    console.error('❌ Failed to update full sync timestamp:', error);
    throw error;
  }
}

/**
 * Incrementa contador de cambios pendientes
 */
export async function incrementPendingChanges(count = 1): Promise<void> {
  try {
    await initSyncMetadata();
    
    const current = await getSyncMetadata();
    const newCount = (current?.pendingChanges || 0) + count;
    
    const localDb = await initLocalDb();
    await localDb
      .update(syncMetadata)
      .set({
        pendingChanges: newCount,
        updatedAt: new Date(),
      })
      .where(eq(syncMetadata.id, SINGLETON_ID));
    
  } catch (error) {
    console.error('❌ Failed to increment pending changes:', error);
    throw error;
  }
}

/**
 * Resetea contador de cambios pendientes
 */
export async function resetPendingChanges(): Promise<void> {
  try {
    await initSyncMetadata();
    
    const localDb = await initLocalDb();
    await localDb
      .update(syncMetadata)
      .set({
        pendingChanges: 0,
        updatedAt: new Date(),
      })
      .where(eq(syncMetadata.id, SINGLETON_ID));
    
    // Sync to cloud
    try {
      const cloudDb = cloudDb();
      await cloudDb
        .update(syncMetadata)
        .set({
          pendingChanges: 0,
          updatedAt: new Date(),
        })
        .where(eq(syncMetadata.id, SINGLETON_ID));
    } catch (cloudError) {
      console.warn('⚠️ Cloud pending changes reset failed:', cloudError);
    }
    
  } catch (error) {
    console.error('❌ Failed to reset pending changes:', error);
    throw error;
  }
}

/**
 * Obtiene timestamp del último sync incremental
 */
export async function getLastSyncTimestamp(): Promise<Date | null> {
  const metadata = await getSyncMetadata();
  return metadata?.lastSyncTimestamp || null;
}

/**
 * Obtiene timestamp del último sync completo
 */
export async function getLastFullSyncTimestamp(): Promise<Date | null> {
  const metadata = await getSyncMetadata();
  return metadata?.lastFullSyncTimestamp || null;
}

/**
 * Verifica si necesita sync completo (más de 24 horas)
 */
export async function needsFullSync(): Promise<boolean> {
  const lastFullSync = await getLastFullSyncTimestamp();
  
  if (!lastFullSync) {
    return true; // Nunca ha hecho sync completo
  }
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return lastFullSync < twentyFourHoursAgo;
}

/**
 * Verifica si necesita sync incremental (más de 1 hora)
 */
export async function needsIncrementalSync(): Promise<boolean> {
  const lastSync = await getLastSyncTimestamp();
  
  if (!lastSync) {
    return true; // Nunca ha hecho sync
  }
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return lastSync < oneHourAgo;
}

/**
 * Obtiene número de cambios pendientes
 */
export async function getPendingChangesCount(): Promise<number> {
  const metadata = await getSyncMetadata();
  return metadata?.pendingChanges || 0;
}