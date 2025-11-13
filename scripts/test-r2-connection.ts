#!/usr/bin/env tsx

// Cargar variables de entorno ANTES de importar cualquier módulo
import { config } from 'dotenv';
config({ path: '.env.local' });

/**
 * Script para probar la conexión con Cloudflare R2
 * 
 * @description
 * Verifica que las credenciales R2 estén configuradas correctamente
 * y que se pueda conectar al bucket.
 * 
 * @usage
 * ```bash
 * npm run test:r2
 * # o directamente:
 * npx tsx scripts/test-r2-connection.ts
 * ```
 */

// IMPORTANTE: Importar DESPUÉS de cargar las variables de entorno
import { R2ApiClient, R2ApiUtils } from '../src/lib/r2/r2-api-client';

async function testR2Connection() {
  console.log('🧪 Testing Cloudflare R2 Connection...\n');

  try {
    // 1. Crear cliente R2 
    const r2ApiClient = new R2ApiClient();
    
    // 2. Mostrar configuración
    const bucketInfo = r2ApiClient.getBucketInfo();
    console.log('📋 R2 Configuration:');
    console.log(`   Bucket: ${bucketInfo.bucketName}`);
    console.log(`   Account ID: ${bucketInfo.accountId}`);
    console.log(`   API Endpoint: ${bucketInfo.apiEndpoint}`);
    console.log(`   Public URL: ${bucketInfo.publicUrl}`);
    console.log(`   Auth Method: ${bucketInfo.authMethod}\n`);

    // 2. Test de conexión básica
    console.log('🔌 Testing basic connection...');
    const isConnected = await r2ApiClient.testConnection();
    
    if (!isConnected) {
      throw new Error('Failed to connect to R2');
    }

    // 3. Test de subida de archivo
    console.log('📤 Testing file upload...');
    const testKey = 'test/connection-test.txt';
    const testContent = `R2 Connection Test - ${new Date().toISOString()}`;
    
    await r2ApiClient.putObject(testKey, testContent, {
      contentType: 'text/plain',
      metadata: {
        'test-purpose': 'connection-validation',
        'created-by': 'test-r2-connection-script',
      },
    });

    // 4. Test de descarga de archivo
    console.log('📥 Testing file download...');
    const downloadedObject = await r2ApiClient.getObject(testKey);
    
    if (!downloadedObject.body) {
      throw new Error('Downloaded object has no body');
    }

    // Convertir stream a string para verificar contenido
    const chunks: Uint8Array[] = [];
    const reader = downloadedObject.body.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    
    const downloadedContent = new TextDecoder().decode(
      new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0)).map((_, i) => {
        for (const chunk of chunks) {
          if (i < chunk.length) return chunk[i];
          i -= chunk.length;
        }
        return 0;
      })
    );

    if (downloadedContent !== testContent) {
      throw new Error('Downloaded content does not match uploaded content');
    }

    // 5. Test de URL pública
    console.log('🌐 Testing public URL generation...');
    const publicUrl = r2ApiClient.getPublicUrl(testKey);
    console.log(`   Public URL: ${publicUrl}`);

    // 6. Test de utilidades R2
    console.log('🛠️ Testing R2 utilities...');
    const testSku = 'TEST@Product#123!';
    const sanitizedKey = R2ApiUtils.generateImageKey(testSku, 'medium');
    console.log(`   Original SKU: ${testSku}`);
    console.log(`   Sanitized Key: ${sanitizedKey}`);

    const metadata = R2ApiUtils.generateImageMetadata(testSku, 'medium');
    console.log(`   Generated metadata:`, metadata);

    // 7. Test de listado de objetos
    console.log('📂 Testing object listing...');
    const listResult = await r2ApiClient.listObjects('test/', 5);
    console.log(`   Found ${listResult.totalCount} objects in test/ prefix`);

    // 8. Limpiar archivo de prueba
    console.log('🧹 Cleaning up test file...');
    await r2ApiClient.deleteObject(testKey);

    // 9. Mostrar estadísticas finales
    console.log('\n✅ All R2 tests passed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Basic connection');
    console.log('   ✅ File upload');
    console.log('   ✅ File download');
    console.log('   ✅ Content verification');
    console.log('   ✅ Public URL generation');
    console.log('   ✅ Utilities functions');
    console.log('   ✅ Object listing');
    console.log('   ✅ File deletion');
    
    console.log('\n🎉 Your R2 configuration is working perfectly!');
    console.log('💡 You can now run the image migration script:');
    console.log('   npm run migrate:images\n');

  } catch (error) {
    console.error('\n❌ R2 Connection Test Failed!');
    console.error('Error details:', error);
    
    // Mostrar posibles soluciones
    console.log('\n🔧 Troubleshooting Guide:');
    console.log('\n1. Verify your .env.local file has these variables:');
    console.log('   CLOUDFLARE_ACCOUNT_ID=8cb1d51307cdce14ace435166c2cafc6');
    console.log('   CLOUDFLARE_API_TOKEN=-OtkUgeslT0cqZH3OtN30_hsP30YGCHG4i7SsQvf');
    console.log('   R2_BUCKET_NAME=pos-miniveci-bucket');
    console.log('   R2_PUBLIC_URL=https://pos-miniveci-bucket.8cb1d51307cdce14ace435166c2cafc6.r2.cloudflarestorage.com');
    
    console.log('\n2. Check that your API token has the correct permissions:');
    console.log('   - Account: Cloudflare R2:Edit');
    console.log('   - Zone Resources: Include All zones');
    
    console.log('\n3. Verify your bucket exists in Cloudflare dashboard:');
    console.log('   https://dash.cloudflare.com → R2 Object Storage');
    
    console.log('\n4. Make sure your account has R2 enabled and billing configured');
    
    console.log('\n📚 For more help, see: docs/CLOUDFLARE_R2_SETUP.md\n');
    
    process.exit(1);
  }
}

// Ejecutar test si se llama directamente
if (require.main === module) {
  testR2Connection()
    .then(() => {
      console.log('Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}