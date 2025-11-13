import sharp from 'sharp';
import { R2ApiClient, R2ApiUtils } from '../r2/r2-api-client';
import type { WooWebhookPayload, OptimizedImages } from '../sync/types';

// Crear instancia del cliente R2 cuando se necesite
let r2Client: R2ApiClient | null = null;

function getR2Client(): R2ApiClient {
  if (!r2Client) {
    r2Client = new R2ApiClient();
  }
  return r2Client;
}

/**
 * Procesa imagen de producto WooCommerce
 * 
 * @description
 * - Descarga imagen original de WordPress (puede ser 17MB)
 * - Genera 3 variantes optimizadas en WebP
 * - Sube a Cloudflare R2
 * - Retorna URLs del CDN
 * 
 * @performance
 * - 17MB → 210KB total (99% reducción)
 * - Procesamiento: ~2-3s por producto
 * - Fallback: usa imagen original si falla
 * 
 * @param wooProduct - Producto de WooCommerce
 * @returns URLs optimizadas o null si no hay imagen
 */
export async function processProductImage(
  wooProduct: WooWebhookPayload
): Promise<OptimizedImages | null> {
  
  const imageUrl = wooProduct.images[0]?.src;
  if (!imageUrl) {
    console.warn(`No image found for product ${wooProduct.id}`);
    return null;
  }
  
  const sku = wooProduct.sku || `product-${wooProduct.id}`;
  
  try {
    console.log(`🔄 Downloading image from WordPress: ${imageUrl}`);
    
    // 1. Descargar imagen original
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'MiniVeci-POS/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`📊 Original size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
    
    // 2. Generar variantes optimizadas con Sharp
    const variants = await generateImageVariants(buffer);
    
    // 3. Subir a Cloudflare R2
    const uploadedUrls = await uploadToR2(sku, variants);
    
    console.log(`✅ Image processed successfully for ${sku}`);
    console.log(`   📱 Thumb: ${uploadedUrls.thumb}`);
    console.log(`   💻 Medium: ${uploadedUrls.medium}`);
    console.log(`   🖥️ Large: ${uploadedUrls.large}`);
    
    return uploadedUrls;
    
  } catch (error) {
    console.error(`❌ Failed to process image for ${sku}:`, error);
    
    // Fallback: retornar imagen original de WordPress
    return {
      thumb: imageUrl,
      medium: imageUrl,
      large: imageUrl,
    };
  }
}

/**
 * Genera 3 variantes optimizadas de una imagen
 */
async function generateImageVariants(buffer: Buffer) {
  const [thumb, medium, large] = await Promise.all([
    // Thumbnail: 150x150, crop cover
    sharp(buffer)
      .resize(150, 150, { 
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85, effort: 6 })
      .toBuffer(),
    
    // Medium: 600x600, fit inside
    sharp(buffer)
      .resize(600, 600, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85, effort: 6 })
      .toBuffer(),
    
    // Large: 1200x1200, fit inside
    sharp(buffer)
      .resize(1200, 1200, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85, effort: 6 })
      .toBuffer(),
  ]);
  
  console.log(`📐 Variants generated:`);
  console.log(`   📱 Thumb: ${(thumb.length / 1024).toFixed(2)}KB`);
  console.log(`   💻 Medium: ${(medium.length / 1024).toFixed(2)}KB`);
  console.log(`   🖥️ Large: ${(large.length / 1024).toFixed(2)}KB`);
  
  return { thumb, medium, large };
}

/**
 * Sube variantes de imagen a Cloudflare R2
 */
async function uploadToR2(
  sku: string,
  variants: { thumb: Buffer; medium: Buffer; large: Buffer }
): Promise<OptimizedImages> {
  const uploads = Object.entries(variants).map(async ([variant, buffer]) => {
    const key = R2ApiUtils.generateImageKey(sku, variant as 'thumb' | 'medium' | 'large');
    const metadata = R2ApiUtils.generateImageMetadata(sku, variant);
    
    const r2 = getR2Client();
    await r2.putObject(key, buffer, {
      contentType: 'image/webp',
      metadata,
    });
    
    return {
      variant,
      url: r2.getPublicUrl(key),
    };
  });
  
  const uploaded = await Promise.all(uploads);
  
  return {
    thumb: uploaded.find(u => u.variant === 'thumb')!.url,
    medium: uploaded.find(u => u.variant === 'medium')!.url,
    large: uploaded.find(u => u.variant === 'large')!.url,
  };
}

/**
 * Elimina imágenes de producto de R2
 */
export async function deleteProductImages(sku: string): Promise<void> {
  const variants: ('thumb' | 'medium' | 'large')[] = ['thumb', 'medium', 'large'];
  
  const r2 = getR2Client();
  
  await Promise.all(variants.map(async (variant) => {
    const key = R2ApiUtils.generateImageKey(sku, variant);
    
    try {
      await r2.deleteObject(key);
      console.log(`🗑️ Deleted image: ${key}`);
    } catch (error) {
      console.warn(`⚠️ Failed to delete ${key}:`, error);
    }
  }));
}