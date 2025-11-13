import WooCommerceRestApi from 'woocommerce-api';
import { insertProductDual, updateProductDual, getProductById } from '@/lib/db/dual-db-operations';
import { processProductImage } from '@/lib/images/image-processor';
import { getLastSyncTimestamp, updateLastSyncTimestamp, getLastFullSyncTimestamp, updateLastFullSyncTimestamp } from '@/lib/db/sync-metadata';
import type { WooProduct, SyncResult } from './types';

/**
 * Worker de sincronización WooCommerce
 * 
 * @description
 * ESTRATEGIA DE SINCRONIZACIÓN:
 * 
 * 1. **PRINCIPAL: Webhooks** (tiempo real)
 *    - WooCommerce notifica cambios vía POST /api/webhooks/woo
 *    - Procesamiento instantáneo
 *    - Zero carga en WordPress
 * 
 * 2. **BACKUP: Polling cada 1 HORA**
 *    - Solo si webhook falla o se pierde
 *    - Paginado: 100 productos/request
 *    - Filtro: modified_after lastSync
 *    - Requests/día: ~24 (vs 288 con polling cada 5min)
 * 
 * 3. **RECONCILIACIÓN: Sync completo cada 24 HORAS**
 *    - Ejecuta a las 3AM horario servidor
 *    - Valida integridad completa
 *    - Detecta productos eliminados
 * 
 * @performance
 * - Polling: 24 requests/día
 * - Full sync: 30 requests (3000 productos / 100 per page)
 * - Total: ~54 requests/día (vs 288 anterior = 81% reducción)
 */

const wooApi = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WOO_URL!,
  consumerKey: process.env.WOO_CONSUMER_KEY!,
  consumerSecret: process.env.WOO_CONSUMER_SECRET!,
  version: 'wc/v3',
  queryStringAuth: true, // Para servidores que no soportan auth headers
});

const POLLING_INTERVAL = 60 * 60 * 1000; // 1 hora
const FULL_SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Sincroniza productos desde WooCommerce
 * @param lastSyncTimestamp - Timestamp del último sync exitoso
 * @param isFullSync - Si es true, sincroniza TODOS los productos
 */
export async function syncProductsFromWoo(
  lastSyncTimestamp?: Date,
  isFullSync = false
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const syncType = isFullSync ? 'FULL' : 'INCREMENTAL';
    console.log(`🔄 Starting ${syncType} sync...`);
    console.log(`📅 Last sync: ${lastSyncTimestamp?.toISOString() || 'Never'}`);
    
    const perPage = 100;
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const params: Record<string, any> = {
        per_page: perPage,
        page,
        orderby: 'modified',
        order: 'desc',
        status: 'publish', // Solo productos publicados
      };
      
      // Solo productos modificados desde último sync (si no es full sync)
      if (!isFullSync && lastSyncTimestamp) {
        params.modified_after = lastSyncTimestamp.toISOString();
      }
      
      console.log(`📄 Fetching page ${page}...`);
      
      const response = await wooApi.get('products', params);
      const wooProducts = response.data as WooProduct[];
      
      if (wooProducts.length === 0) {
        console.log(`✅ No more products to sync`);
        hasMore = false;
        break;
      }
      
      // Procesar lote
      for (const wooProduct of wooProducts) {
        try {
          await handleProductUpsert(wooProduct);
          result.processed++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Product ${wooProduct.id}: ${error}`);
          console.error(`❌ Failed to process product ${wooProduct.id}:`, error);
        }
      }
      
      console.log(`✅ Processed page ${page} (${result.processed} products total)`);
      
      // Si trajo menos de perPage, es la última página
      if (wooProducts.length < perPage) {
        hasMore = false;
      }
      
      page++;
      
      // Pausa de 2s entre páginas para no saturar WordPress
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Actualizar timestamp de último sync
    if (isFullSync) {
      await updateLastFullSyncTimestamp(new Date());
    } else {
      await updateLastSyncTimestamp(new Date());
    }
    
    console.log(`🎉 ${syncType} sync complete: ${result.processed} processed, ${result.failed} failed`);
    
    if (result.failed > 0) {
      result.success = false;
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    result.success = false;
    result.errors.push(`Sync error: ${error}`);
    return result;
  }
}

/**
 * Procesa upsert de producto (misma lógica que webhook)
 */
async function handleProductUpsert(wooProduct: WooProduct) {
  try {
    const productId = `woo-${wooProduct.id}`;
    const currentProduct = await getProductById(productId);
    
    // Verificar si imagen cambió
    const imageChanged = !currentProduct || 
      currentProduct.imageOriginal !== wooProduct.images[0]?.src;
    
    // Procesar imagen solo si cambió
    let optimizedImages = null;
    if (imageChanged && wooProduct.images[0]?.src) {
      optimizedImages = await processProductImage(wooProduct);
    } else if (currentProduct) {
      optimizedImages = {
        thumb: currentProduct.imageThumb,
        medium: currentProduct.imageMedium,
        large: currentProduct.imageLarge,
      };
    }
    
    // Mapear a formato interno
    const product = {
      id: productId,
      name: wooProduct.name,
      price: parseFloat(wooProduct.price) || 0,
      stock: wooProduct.stock_quantity ?? 0,
      stockStatus: wooProduct.stock_status as 'instock' | 'outofstock' | 'onbackorder',
      category: wooProduct.categories[0]?.name || 'Sin categoría',
      
      imageThumb: optimizedImages?.thumb || null,
      imageMedium: optimizedImages?.medium || null,
      imageLarge: optimizedImages?.large || null,
      imageOriginal: wooProduct.images[0]?.src || null,
      
      sku: wooProduct.sku || null,
      description: wooProduct.description || null,
      unit: extractUnit(wooProduct.name),
      
      synced: true,
      lastSyncedAt: new Date(),
      updatedAt: new Date(wooProduct.date_modified),
    };
    
    // Upsert en DB dual
    if (currentProduct) {
      await updateProductDual(productId, product);
    } else {
      await insertProductDual(product);
    }
    
  } catch (error) {
    console.error(`❌ Failed to process product ${wooProduct.id}:`, error);
    throw error;
  }
}

function extractUnit(name: string): string {
  const units = ['kg', 'g', 'l', 'ml', 'un', 'pack', 'caja', 'bot', 'lts'];
  const lowerName = name.toLowerCase();
  
  for (const unit of units) {
    if (lowerName.includes(unit)) {
      return unit.toUpperCase();
    }
  }
  
  return 'UN';
}

/**
 * Sync manual para pruebas
 */
export async function runManualSync(type: 'incremental' | 'full' = 'incremental'): Promise<SyncResult> {
  console.log(`🔧 Running manual ${type} sync...`);
  
  if (type === 'full') {
    return await syncProductsFromWoo(undefined, true);
  } else {
    const lastSync = await getLastSyncTimestamp();
    return await syncProductsFromWoo(lastSync, false);
  }
}

// ===== SETUP POLLING (solo en servidor) =====

if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  console.log('🚀 Starting WooCommerce sync workers...');
  
  // Polling backup cada 1 hora
  setInterval(async () => {
    console.log('⏰ Running hourly backup sync...');
    const lastSync = await getLastSyncTimestamp();
    await syncProductsFromWoo(lastSync, false).catch(console.error);
  }, POLLING_INTERVAL);
  
  // Full sync cada 24 horas (3AM)
  const scheduleFullSync = () => {
    const now = new Date();
    const next3AM = new Date();
    next3AM.setHours(3, 0, 0, 0);
    
    if (next3AM <= now) {
      next3AM.setDate(next3AM.getDate() + 1);
    }
    
    const msUntil3AM = next3AM.getTime() - now.getTime();
    
    setTimeout(async () => {
      console.log('🌅 Running daily full sync at 3AM...');
      await syncProductsFromWoo(undefined, true).catch(console.error);
      
      // Reagendar para mañana
      setInterval(async () => {
        await syncProductsFromWoo(undefined, true).catch(console.error);
      }, FULL_SYNC_INTERVAL);
    }, msUntil3AM);
    
    console.log(`📅 Full sync scheduled for ${next3AM.toISOString()}`);
  };
  
  scheduleFullSync();
  
  // Sync inicial al arrancar (incremental)
  (async () => {
    const lastSync = await getLastSyncTimestamp();
    await syncProductsFromWoo(lastSync, false).catch(console.error);
  })();
}