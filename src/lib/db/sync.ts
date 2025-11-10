// Bidirectional sync engine for local-first architecture
// Handles Products, Sales, and Sale Items synchronization

import { localDb } from './local-db';
import { cloudDb } from './cloud-db';
import type { Product } from './schema';

export interface SyncResult {
  success: boolean;
  localToCloud: {
    products: number;
    sales: number;
    saleItems: number;
  };
  cloudToLocal: {
    products: number;
    sales: number;
    saleItems: number;
  };
  errors: string[];
  conflicts?: Array<{
    table: 'products' | 'sales' | 'sale_items';
    id: string | number;
    resolution: 'local-wins' | 'cloud-wins';
    reason: string;
  }>;
}

let isCurrentlySyncing = false;
let lastSyncTimestamp = 0;
const syncDebounceTimeout = new Map<string, NodeJS.Timeout>();

// Main sync function - handles bidirectional sync
export async function fullSync(): Promise<SyncResult> {
  if (isCurrentlySyncing) {
    throw new Error('Sync already in progress');
  }

  if (!cloudDb.isAvailable()) {
    return {
      success: false,
      localToCloud: { products: 0, sales: 0, saleItems: 0 },
      cloudToLocal: { products: 0, sales: 0, saleItems: 0 },
      errors: ['Cloud database not available']
    };
  }

  isCurrentlySyncing = true;
  const result: SyncResult = {
    success: true,
    localToCloud: { products: 0, sales: 0, saleItems: 0 },
    cloudToLocal: { products: 0, sales: 0, saleItems: 0 },
    errors: [],
    conflicts: []
  };

  try {
    console.log('[Sync] Starting full synchronization');

    // Step 1: Sync local changes to cloud
    await syncLocalToCloud(result);

    // Step 2: Sync cloud changes to local
    await syncCloudToLocal(result);

    lastSyncTimestamp = Date.now();
    console.log('[Sync] Synchronization completed', result);

  } catch (error) {
    result.success = false;
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    result.errors.push(errorMessage);
    console.error('[Sync] Synchronization failed:', error);
  } finally {
    isCurrentlySyncing = false;
  }

  return result;
}

// Sync local pending changes to cloud
async function syncLocalToCloud(result: SyncResult): Promise<void> {
  try {
    // Sync products
    const pendingProducts = await localDb.getPendingSync();
    for (const product of pendingProducts) {
      try {
        await cloudDb.upsertProduct(product);
        await localDb.markSynced(product.id!);
        result.localToCloud.products++;
      } catch (error) {
       const errorMsg = `Failed to sync product ${product.id}: ${error}`;
       result.errors.push(errorMsg);
       // Mark overall sync as failed if any item fails during local->cloud sync
       result.success = false;
       console.warn(errorMsg);
     }
    }

    // Sync sales
    const pendingSales = await localDb.getPendingSalesSync();
    for (const sale of pendingSales) {
      try {
        if (cloudDb.insertSale) {
          await cloudDb.insertSale(sale);
        }
        await localDb.markSaleSynced(sale.id);
        result.localToCloud.sales++;
      } catch (error) {
        const errorMsg = `Failed to sync sale ${sale.id}: ${error}`;
        result.errors.push(errorMsg);
        result.success = false;
        console.warn(errorMsg);
      }
    }

    // Sync sale items
    const pendingSaleItems = await localDb.getPendingSaleItemsSync();
    for (const saleItem of pendingSaleItems) {
      try {
        if (cloudDb.insertSaleItem) {
          await cloudDb.insertSaleItem(saleItem);
        }
        await localDb.markSaleItemSynced(saleItem.id);
        result.localToCloud.saleItems++;
      } catch (error) {
        const errorMsg = `Failed to sync sale item ${saleItem.id}: ${error}`;
        result.errors.push(errorMsg);
        result.success = false;
        console.warn(errorMsg);
      }
    }

  } catch (error) {
    throw new Error(`Local to cloud sync failed: ${error}`);
  }
}

// Sync cloud changes to local
async function syncCloudToLocal(result: SyncResult): Promise<void> {
  try {
    // If never synced before, use a date far in the past
    const lastSyncDate = lastSyncTimestamp > 0 ? new Date(lastSyncTimestamp) : new Date('2020-01-01');

    // Sync products from cloud
    const updatedProducts = await cloudDb.getUpdatedAfter(lastSyncDate);
    for (const cloudProduct of updatedProducts) {
      try {
        const localProduct = await localDb.getProduct(cloudProduct.id!);
        
        if (localProduct && localProduct.synced === 0) {
          // Conflict: both local and cloud have changes
          const conflict = resolveProductConflict(localProduct, cloudProduct);
          result.conflicts?.push(conflict);
          
          if (conflict.resolution === 'cloud-wins') {
            await localDb.updateProduct(cloudProduct.id!, cloudProduct);
            result.cloudToLocal.products++;
          }
          // If local wins, no action needed as local data is kept
        } else {
          // No conflict: apply cloud changes
          if (localProduct) {
            await localDb.updateProduct(cloudProduct.id!, cloudProduct);
          } else {
            await localDb.insertProduct(cloudProduct);
          }
          result.cloudToLocal.products++;
        }
      } catch (error) {
        const errorMsg = `Failed to sync product ${cloudProduct.id} from cloud: ${error}`;
        result.errors.push(errorMsg);
        // Mark overall sync as failed if any item fails during cloud->local sync
        result.success = false;
      }
    }

    // Sync sales from cloud (if cloud supports sales)
    if (cloudDb.getSalesUpdatedAfter) {
      const updatedSales = await cloudDb.getSalesUpdatedAfter(lastSyncDate);
      for (const cloudSale of updatedSales) {
        try {
          const localSale = await localDb.getSale(cloudSale.id);
          if (!localSale) {
            await localDb.insertSale(cloudSale);
            result.cloudToLocal.sales++;
          }
        } catch (error) {
          const errorMsg = `Failed to sync sale ${cloudSale.id} from cloud: ${error}`;
          result.errors.push(errorMsg);
          result.success = false;
        }
      }
    }

  } catch (error) {
    throw new Error(`Cloud to local sync failed: ${error}`);
  }
}

// Resolve conflicts between local and cloud data
function resolveProductConflict(localProduct: Product, cloudProduct: Product) {
  const localTimestamp = new Date(localProduct.updatedAt!).getTime();
  const cloudTimestamp = new Date(cloudProduct.updatedAt!).getTime();

  if (localTimestamp > cloudTimestamp) {
    return {
      table: 'products' as const,
      id: localProduct.id!,
      resolution: 'local-wins' as const,
      reason: 'local timestamp newer'
    };
  } else if (cloudTimestamp > localTimestamp) {
    return {
      table: 'products' as const,
      id: localProduct.id!,
      resolution: 'cloud-wins' as const,
      reason: 'cloud timestamp newer'
    };
  } else {
    // Same timestamp, prefer cloud (server wins)
    return {
      table: 'products' as const,
      id: localProduct.id!,
      resolution: 'cloud-wins' as const,
      reason: 'timestamp tie - server wins'
    };
  }
}

// Debounced sync trigger
export function scheduleSyncDebounced(delayMs: number = 2000): void {
  const key = 'fullSync';
  
  if (syncDebounceTimeout.has(key)) {
    clearTimeout(syncDebounceTimeout.get(key)!);
  }

  const timeout = setTimeout(async () => {
    syncDebounceTimeout.delete(key);
    try {
      await fullSync();
    } catch (error) {
      console.error('[Sync] Debounced sync failed:', error);
    }
  }, delayMs);

  syncDebounceTimeout.set(key, timeout);
}

// Quick sync for high-priority operations
export async function quickSync(table: 'products' | 'sales' | 'sale_items', id: string | number): Promise<boolean> {
  if (!cloudDb.isAvailable() || isCurrentlySyncing) {
    return false;
  }

  try {
    switch (table) {
      case 'products':
        const product = await localDb.getProduct(id as number);
        if (product && product.synced === 0) {
          await cloudDb.upsertProduct(product);
          await localDb.markSynced(product.id!);
          return true;
        }
        break;
      
      case 'sales':
        const sale = await localDb.getSale(id as string);
        if (sale && sale.synced === 0) {
          await cloudDb.insertSale?.(sale);
          await localDb.markSaleSynced(sale.id);
          return true;
        }
        break;
      
      case 'sale_items':
        const saleItems = await localDb.getAllSaleItems();
        const saleItem = saleItems.find(item => item.id === id);
        if (saleItem && saleItem.synced === 0) {
          await cloudDb.insertSaleItem?.(saleItem);
          await localDb.markSaleItemSynced(saleItem.id);
          return true;
        }
        break;
    }
  } catch (error) {
    console.error(`[Sync] Quick sync failed for ${table}:${id}:`, error);
  }

  return false;
}

// Get sync status
export function getSyncStatus(): {
  isCurrentlySyncing: boolean;
  lastSyncTimestamp: number;
  timeSinceLastSync: number;
} {
  return {
    isCurrentlySyncing,
    lastSyncTimestamp,
    timeSinceLastSync: Date.now() - lastSyncTimestamp
  };
}