import { headers } from 'next/headers';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { insertProductDual, updateProductDual, deleteProductDual, getProductById } from '@/lib/db/dual-db-operations';
import { processProductImage } from '@/lib/images/image-processor';
import { incrementPendingChanges } from '@/lib/db/sync-metadata';
import type { WooWebhookPayload } from '@/lib/sync/types';

/**
 * Webhook de WooCommerce para sincronización en tiempo real
 * 
 * @description
 * Recibe notificaciones de WooCommerce cuando:
 * - Se crea un producto
 * - Se actualiza un producto
 * - Se elimina un producto
 * 
 * Valida signature HMAC SHA256 para seguridad
 * 
 * @endpoint POST /api/webhooks/woo
 * @security Requiere WOO_WEBHOOK_SECRET válido
 * 
 * @example
 * ```bash
 * # WooCommerce envía:
 * POST https://pos.miniveci.cl/api/webhooks/woo
 * Headers:
 *   X-WC-Webhook-Topic: product.updated
 *   X-WC-Webhook-Signature: base64_hmac_sha256
 * Body: { id, name, price, ... }
 * ```
 */
export async function POST(request: Request) {
  try {
    // 1. Leer payload RAW (necesario para validar signature)
    const rawBody = await request.text();
    const headersList = await headers();
    const signature = headersList.get('x-wc-webhook-signature');
    const topic = headersList.get('x-wc-webhook-topic');
    
    if (!signature || !topic) {
      console.error('❌ Missing webhook headers');
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }
    
    // 2. Validar signature HMAC
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WOO_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('base64');
    
    if (signature !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // 3. Parsear payload
    const payload: WooWebhookPayload = JSON.parse(rawBody);
    
    // 4. Procesar según tipo de evento
    console.log(`🔔 Webhook received: ${topic} for product ${payload.id}`);
    
    switch (topic) {
      case 'product.created':
      case 'product.updated':
        await handleProductUpsert(payload);
        break;
        
      case 'product.deleted':
        await handleProductDelete(payload.id);
        break;
        
      default:
        console.warn(`⚠️ Unhandled webhook topic: ${topic}`);
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Processed ${topic} for product ${payload.id}`
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { 
        error: 'Processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Procesa creación/actualización de producto
 */
async function handleProductUpsert(wooProduct: WooWebhookPayload) {
  try {
    const productId = `woo-${wooProduct.id}`;
    
    // 1. Verificar si imagen cambió (para evitar reprocesar)
    const currentProduct = await getProductById(productId);
    const imageChanged = !currentProduct || 
      currentProduct.imageOriginal !== wooProduct.images[0]?.src;
    
    // 2. Procesar imagen solo si cambió
    let optimizedImages = null;
    if (imageChanged && wooProduct.images[0]?.src) {
      console.log(`🖼️ Processing image for product ${wooProduct.sku}...`);
      optimizedImages = await processProductImage(wooProduct);
    } else if (currentProduct) {
      // Reutilizar imágenes existentes
      optimizedImages = {
        thumb: currentProduct.imageThumb,
        medium: currentProduct.imageMedium,
        large: currentProduct.imageLarge,
      };
    }
    
    // 3. Mapear a formato interno
    const product = mapWooToInternal(wooProduct, optimizedImages);
    
    // 4. Upsert en DB dual (local + cloud)
    if (currentProduct) {
      await updateProductDual(productId, product);
      console.log(`✅ Product ${productId} updated via webhook`);
    } else {
      await insertProductDual(product);
      console.log(`✅ Product ${productId} created via webhook`);
    }
    
    // 5. Incrementar cambios pendientes para estadísticas
    await incrementPendingChanges();
    
  } catch (error) {
    console.error(`❌ Failed to process product ${wooProduct.id}:`, error);
    throw error;
  }
}

/**
 * Procesa eliminación de producto
 */
async function handleProductDelete(wooProductId: number) {
  try {
    const productId = `woo-${wooProductId}`;
    await deleteProductDual(productId);
    
    // TODO: Eliminar imágenes de R2 (opcional, R2 lifecycle puede hacerlo)
    
    console.log(`🗑️ Product ${productId} deleted via webhook`);
    await incrementPendingChanges();
    
  } catch (error) {
    console.error(`❌ Failed to delete product ${wooProductId}:`, error);
    throw error;
  }
}

/**
 * Mapea producto WooCommerce a formato interno
 */
function mapWooToInternal(
  wooProduct: WooWebhookPayload,
  optimizedImages: { thumb: string | null; medium: string | null; large: string | null } | null
) {
  return {
    id: `woo-${wooProduct.id}`,
    name: wooProduct.name,
    price: parseFloat(wooProduct.price) || 0,
    stock: wooProduct.stock_quantity ?? 0,
    stockStatus: wooProduct.stock_status as 'instock' | 'outofstock' | 'onbackorder',
    category: wooProduct.categories[0]?.name || 'Sin categoría',
    
    // Imágenes optimizadas
    imageThumb: optimizedImages?.thumb || null,
    imageMedium: optimizedImages?.medium || null,
    imageLarge: optimizedImages?.large || null,
    imageOriginal: wooProduct.images[0]?.src || null,
    
    sku: wooProduct.sku || null,
    description: wooProduct.description || null,
    unit: extractUnit(wooProduct.name),
    
    synced: true, // Viene de webhook, consideramos sincronizado
    lastSyncedAt: new Date(),
    updatedAt: new Date(wooProduct.date_modified),
  };
}

/**
 * Extrae unidad del nombre del producto
 * @example "Coca Cola 2L" → "L"
 */
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