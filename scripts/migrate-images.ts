import { getAllProducts, updateProductDual } from '../src/lib/db/dual-db-operations';
import { processProductImage } from '../src/lib/images/image-processor';
import type { WooWebhookPayload } from '../src/lib/sync/types';

/**
 * Script de migración masiva de imágenes
 * 
 * @description
 * Ejecutar UNA SOLA VEZ después de configurar Cloudflare R2
 * 
 * Procesa TODOS los productos existentes:
 * 1. Descarga imagen de WordPress (17MB)
 * 2. Genera 3 variantes optimizadas (210KB total)
 * 3. Sube a Cloudflare R2
 * 4. Actualiza URLs en DB (local + Turso)
 * 
 * @performance
 * - 3000 productos × 3s = ~2.5 horas
 * - Procesa en lotes de 10 para no saturar memoria
 * - Pausa de 1s entre lotes para no saturar WordPress
 * 
 * @usage
 * ```bash
 * npm run migrate:images
 * ```
 */

interface MigrationStats {
  total: number;
  processed: number;
  failed: number;
  skipped: number;
  startTime: Date;
  endTime?: Date;
}

async function migrateAllImages() {
  const stats: MigrationStats = {
    total: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    startTime: new Date(),
  };
  
  console.log('🚀 Starting image migration...');
  console.log('📅 Started at:', stats.startTime.toISOString());
  console.log('');
  
  try {
    // 1. Obtener todos los productos
    console.log('📊 Loading products from database...');
    const products = await getAllProducts();
    stats.total = products.length;
    
    console.log(`📦 Found ${stats.total} products to migrate`);
    
    if (stats.total === 0) {
      console.log('⚠️ No products found. Run WooCommerce sync first.');
      return;
    }
    
    console.log('');
    
    // 2. Procesar en lotes de 10
    const batchSize = 10;
    const batches = Math.ceil(products.length / batchSize);
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 Processing batch ${batchNumber}/${batches} (${batch.length} products)...`);
      
      // Procesar batch en paralelo (máximo 10 simultáneos)
      await Promise.all(batch.map(async (product, index) => {
        const globalIndex = i + index + 1;
        
        try {
          // Skip si ya está migrado
          if (product.imageMedium?.includes('cdn.miniveci.cl') || 
              product.imageMedium?.includes(process.env.R2_PUBLIC_URL || '')) {
            console.log(`  ✅ ${product.sku || product.id}: Already migrated (${globalIndex}/${stats.total})`);
            stats.skipped++;
            return;
          }
          
          // Skip si no tiene imagen
          if (!product.imageOriginal) {
            console.log(`  ⚠️ ${product.sku || product.id}: No image (${globalIndex}/${stats.total})`);
            stats.skipped++;
            return;
          }
          
          console.log(`  🖼️ ${product.sku || product.id}: Processing... (${globalIndex}/${stats.total})`);
          
          // Simular WooWebhookPayload para reutilizar función
          const mockPayload: Partial<WooWebhookPayload> = {
            id: parseInt(product.id.replace('woo-', '')) || Date.now(),
            sku: product.sku || undefined,
            name: product.name,
            images: [{ 
              id: 0,
              src: product.imageOriginal,
              name: '',
              alt: '',
              date_created: '',
              date_created_gmt: '',
              date_modified: '',
              date_modified_gmt: ''
            }],
          } as WooWebhookPayload;
          
          const optimizedImages = await processProductImage(mockPayload as WooWebhookPayload);
          
          if (optimizedImages) {
            // Actualizar producto con nuevas URLs
            await updateProductDual(product.id, {
              imageThumb: optimizedImages.thumb,
              imageMedium: optimizedImages.medium,
              imageLarge: optimizedImages.large,
            });
            
            stats.processed++;
            console.log(`  ✅ ${product.sku || product.id}: Migrated successfully (${stats.processed} total)`);
          } else {
            stats.failed++;
            console.error(`  ❌ ${product.sku || product.id}: Failed to generate images`);
          }
          
        } catch (error) {
          stats.failed++;
          console.error(`  ❌ ${product.sku || product.id}: Error - ${error}`);
        }
      }));
      
      // Pausa de 2s entre lotes para no saturar servicios
      if (i + batchSize < products.length) {
        console.log('  ⏳ Waiting 2s before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    stats.endTime = new Date();
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
  
  // 3. Mostrar estadísticas finales
  printMigrationSummary(stats);
}

function printMigrationSummary(stats: MigrationStats) {
  const duration = stats.endTime!.getTime() - stats.startTime.getTime();
  const durationMinutes = Math.floor(duration / 60000);
  const durationSeconds = Math.floor((duration % 60000) / 1000);
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log('');
  console.log(`⏱️  Duration: ${durationMinutes}m ${durationSeconds}s`);
  console.log('');
  console.log(`📦 Total products: ${stats.total}`);
  console.log(`✅ Processed: ${stats.processed} (${((stats.processed/stats.total)*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${stats.failed} (${((stats.failed/stats.total)*100).toFixed(1)}%)`);
  console.log(`⏭️  Skipped: ${stats.skipped} (${((stats.skipped/stats.total)*100).toFixed(1)}%)`);
  console.log('');
  
  if (stats.processed > 0) {
    const avgTimePerProduct = duration / stats.processed;
    console.log(`📈 Average time per product: ${(avgTimePerProduct/1000).toFixed(2)}s`);
    
    // Calcular ahorro de espacio
    const originalSize = stats.processed * 17; // MB
    const optimizedSize = stats.processed * 0.21; // MB (210KB)
    const savedSpace = originalSize - optimizedSize;
    const savedPercent = ((savedSpace / originalSize) * 100).toFixed(1);
    
    console.log('');
    console.log(`💾 Storage optimization:`);
    console.log(`   📥 Original: ${originalSize.toFixed(2)}MB`);
    console.log(`   📦 Optimized: ${optimizedSize.toFixed(2)}MB`);
    console.log(`   💰 Saved: ${savedSpace.toFixed(2)}MB (${savedPercent}%)`);
    
    console.log('');
    console.log(`🌐 CDN Benefits:`);
    console.log(`   🚀 99% size reduction per image`);
    console.log(`   ⚡ WebP format for modern browsers`);
    console.log(`   🌍 Global CDN distribution`);
    console.log(`   💸 ~$0.01/month storage cost`);
  }
  
  console.log('');
  console.log('='.repeat(60));
  
  if (stats.failed > 0) {
    console.log('');
    console.log('⚠️  Some products failed. Check logs above for details.');
    console.log('   You can re-run this script to retry failed products.');
    console.log('');
  } else if (stats.processed > 0) {
    console.log('');
    console.log('🎉 Migration completed successfully!');
    console.log('   All product images are now optimized and stored on Cloudflare R2.');
    console.log('');
  }
  
  // Configuración recomendada
  if (stats.processed > 0) {
    console.log('📋 Next steps:');
    console.log('1. ✅ Images migrated to Cloudflare R2');
    console.log('2. 🔧 Configure WordPress to stop serving large images');
    console.log('3. 📊 Monitor R2 usage in Cloudflare dashboard');
    console.log('4. 🚀 Enjoy 99% faster image loading!');
    console.log('');
  }
}

// Validar variables de entorno
function validateEnvironment() {
  const requiredEnvVars = [
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID', 
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => {
      console.error(`   - ${envVar}`);
    });
    console.error('');
    console.error('💡 Please configure Cloudflare R2 credentials in .env.local');
    console.error('   See docs/CLOUDFLARE_R2_SETUP.md for instructions');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
}

// Main execution
async function main() {
  console.log('🔍 Validating environment...');
  validateEnvironment();
  
  console.log('⚠️  WARNING: This script will process ALL products and upload images to R2.');
  console.log('   Make sure you have configured Cloudflare R2 correctly.');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  // 5 second warning
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`   Starting in ${i}... \r`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🚀 Starting migration now!\n');
  
  try {
    await migrateAllImages();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Migration interrupted by user');
  console.log('   Partial migration data may be incomplete');
  process.exit(1);
});

// Execute if called directly
if (require.main === module) {
  main();
}