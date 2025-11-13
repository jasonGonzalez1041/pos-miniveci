# ☁️ Configuración Cloudflare R2 para POS MiniVeci

## 📋 Resumen

Esta guía te llevará paso a paso para configurar **Cloudflare R2** como storage optimizado para las imágenes del POS MiniVeci, logrando una reducción del **99% en el peso** de las imágenes (de 17MB a 210KB por producto).

### 🎯 Beneficios de R2
- 💰 **$0.015/GB/mes** (vs S3 $0.023/GB)
- 🆓 **Ancho de banda gratis** dentro de Cloudflare
- 🚀 **CDN global automático** (200+ ciudades)
- 🔗 **S3-compatible** (sin cambios de código)
- ⚡ **Latencia <50ms** globalmente

## 🚀 Paso 1: Crear Cuenta Cloudflare

1. **Registrarse en Cloudflare**
   ```
   https://cloudflare.com
   ```

2. **Agregar tu dominio** (ej: `miniveci.cl`)
   - Cambiar nameservers a Cloudflare
   - Esperar propagación DNS (24-48h)

3. **Verificar configuración**
   ```bash
   dig NS miniveci.cl
   # Debe mostrar nameservers de Cloudflare
   ```

## 🪣 Paso 2: Crear Bucket R2

### 2.1 Activar R2
1. Ir a **R2 Object Storage** en dashboard
2. Hacer clic en **Purchase R2**
3. Aceptar términos y configurar billing

### 2.2 Crear Bucket
```bash
Bucket Name: miniveci-products
Region: Automatic (recomendado)
```

### 2.3 Configurar CORS
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## 🔑 Paso 3: Generar API Keys

### 3.1 Crear R2 Token
1. Ir a **R2** → **Manage R2 API Tokens**
2. Clic en **Create API Token**
3. Configurar permisos:
   ```
   Token Name: pos-miniveci-r2
   Permissions: Object Read & Write
   Bucket: miniveci-products
   TTL: Never (o 1 año)
   ```

4. **Guardar credenciales**:
   ```bash
   Access Key ID: xxx (guarda este valor)
   Secret Access Key: xxx (guarda este valor)
   ```

### 3.2 Obtener Endpoint URL
```bash
# Formato general
https://{ACCOUNT_ID}.r2.cloudflarestorage.com

# Ejemplo
https://abc123def456.r2.cloudflarestorage.com
```

## 🌐 Paso 4: Configurar Custom Domain (CDN)

### 4.1 Crear Subdomain
1. En **DNS** de tu dominio en Cloudflare
2. Agregar registro CNAME:
   ```
   Type: CNAME
   Name: cdn
   Target: miniveci-products.{ACCOUNT_ID}.r2.cloudflarestorage.com
   Proxy: Enabled (orange cloud)
   ```

### 4.2 Verificar CDN
```bash
# Test URL
https://cdn.miniveci.cl/test.txt

# Debe responder desde R2
curl -I https://cdn.miniveci.cl
# X-Cache: HIT (después del primer request)
```

### 4.3 Configurar Cache Rules (Opcional)
```bash
Rule Name: R2 Product Images
Match: cdn.miniveci.cl/products/*

Cache Settings:
- Browser TTL: 1 year
- Edge TTL: 1 month
- Cache Level: Cache Everything
```

## ⚙️ Paso 5: Configurar Variables de Entorno

### 5.1 Crear .env.local
```bash
# ===== Cloudflare R2 =====
R2_ENDPOINT=https://abc123def456.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=tu_access_key_id_aqui
R2_SECRET_ACCESS_KEY=tu_secret_access_key_aqui
R2_BUCKET_NAME=miniveci-products
R2_PUBLIC_URL=https://cdn.miniveci.cl
```

### 5.2 Verificar Configuración
```typescript
// test/r2-connection.ts
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function testConnection() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      MaxKeys: 1,
    });
    
    const response = await client.send(command);
    console.log('✅ R2 Connection successful');
    console.log('Bucket contents:', response.Contents?.length || 0, 'objects');
  } catch (error) {
    console.error('❌ R2 Connection failed:', error);
  }
}

testConnection();
```

```bash
# Ejecutar test
npx tsx test/r2-connection.ts
```

## 🖼️ Paso 6: Migrar Imágenes Existentes

### 6.1 Preparar Migración
```bash
# Instalar dependencias necesarias
npm install sharp @aws-sdk/client-s3

# Verificar productos en DB
npm run sync:woo  # Sync desde WooCommerce primero
```

### 6.2 Ejecutar Migración
```bash
# ⚠️ ADVERTENCIA: Procesará TODAS las imágenes
# Puede tomar 2-3 horas para 3000 productos

npm run migrate:images
```

### 6.3 Monitorear Progreso
```bash
# La migración muestra progreso en tiempo real:
📦 Processing batch 1/300 (10 products)...
  🖼️ COCA-COLA-2L: Processing... (1/3000)
  ✅ COCA-COLA-2L: Migrated successfully (1 total)
  
📊 MIGRATION SUMMARY
⏱️  Duration: 45m 32s
📦 Total products: 3000
✅ Processed: 2950 (98.3%)
❌ Failed: 25 (0.8%)
⏭️  Skipped: 25 (0.8%)

💾 Storage optimization:
   📥 Original: 51000.00MB
   📦 Optimized: 620.00MB  
   💰 Saved: 50380.00MB (98.8%)
```

## 🎯 Paso 7: Verificar Funcionamiento

### 7.1 Test Manual
```bash
# 1. Subir imagen de prueba
curl -X PUT "https://{ACCOUNT_ID}.r2.cloudflarestorage.com/miniveci-products/test.webp" \
  -H "Authorization: AWS4-HMAC-SHA256..." \
  -H "Content-Type: image/webp" \
  --data-binary "@test.webp"

# 2. Verificar CDN
curl -I https://cdn.miniveci.cl/test.webp
# Status: 200 OK
# Content-Type: image/webp

# 3. Verificar cache
curl -I https://cdn.miniveci.cl/test.webp
# cf-cache-status: HIT
```

### 7.2 Test en POS
1. Abrir POS en navegador
2. Verificar que imágenes cargan desde `cdn.miniveci.cl`
3. Usar DevTools Network tab:
   ```
   Request URL: https://cdn.miniveci.cl/products/coca-cola-2l/medium.webp
   Status: 200
   Size: 45.2 KB (vs 17MB original)
   Time: <100ms
   ```

## 📊 Paso 8: Monitoreo y Analytics

### 8.1 Dashboard R2
```
Cloudflare Dashboard → R2 Object Storage → miniveci-products

Métricas importantes:
- Total Objects: ~9000 (3000 productos × 3 variantes)
- Total Storage: ~620MB (vs 51GB original)  
- Requests/day: Variable según tráfico POS
- Bandwidth: $0 (dentro de Cloudflare)
```

### 8.2 Analytics Avanzado
```bash
# Configurar Cloudflare Analytics
1. Ir a Analytics → Web Analytics
2. Activar para cdn.miniveci.cl
3. Monitorear:
   - Cache Hit Ratio (objetivo >95%)
   - Bandwidth Saved
   - Response Time (objetivo <100ms)
```

### 8.3 Alertas
```javascript
// Configurar Worker para monitoreo
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  
  // Alert si muchas imágenes fallan
  if (!response.ok && request.url.includes('/products/')) {
    console.error('R2 image failed:', request.url)
    // Enviar a servicio de monitoreo
  }
  
  return response
}
```

## 💰 Paso 9: Costos y Optimización

### 9.1 Estimación de Costos
```bash
# Para 3000 productos × 3 variantes = 9000 objetos

Storage: 620MB × $0.015/GB = ~$0.01/mes
Requests: 
  - Class A (PUT): 9000 × $0.0036/1000 = $0.03 (una vez)
  - Class B (GET): Variable × $0.0018/1000 = $0.01-0.05/mes
Bandwidth: $0 (dentro de Cloudflare)

Total estimado: $0.02-0.06/mes (vs cientos en otros providers)
```

### 9.2 Optimizaciones Adicionales
```typescript
// 1. Lifecycle Rules (eliminar versiones antiguas)
{
  "Rules": [{
    "ID": "DeleteOldImages",
    "Status": "Enabled",
    "Filter": {"Prefix": "products/"},
    "Expiration": {"Days": 365}
  }]
}

// 2. Intelligent Tiering (futuro)
// R2 moverá automáticamente objetos poco accedidos a storage más barato

// 3. Compression en Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  
  if (request.headers.get('Accept-Encoding')?.includes('br')) {
    // Habilitar Brotli compression para WebP
    response.headers.set('Content-Encoding', 'br')
  }
  
  return response
}
```

## 🚨 Paso 10: Troubleshooting

### 10.1 Problemas Comunes

#### Error 403 Forbidden
```bash
# Causa: API key sin permisos
# Solución: Verificar token R2 tiene Object Read & Write

# Test
aws s3 ls s3://miniveci-products \
  --endpoint-url=https://abc123.r2.cloudflarestorage.com \
  --profile r2
```

#### Imágenes no cargan desde CDN
```bash
# Causa: DNS no propagado o CNAME incorrecto
# Solución:
dig CNAME cdn.miniveci.cl
# Debe mostrar: miniveci-products.abc123.r2.cloudflarestorage.com
```

#### Migration falla
```bash
# Causa común: WordPress rate limiting
# Solución: Reducir batch size

# En scripts/migrate-images.ts
const batchSize = 5; // Reduce de 10 a 5
```

### 10.2 Rollback Plan
```bash
# Si algo falla, rollback a imágenes originales:

# 1. Actualizar env
R2_PUBLIC_URL=https://wordpress-original.com

# 2. O usar campo image_original como fallback
const imageUrl = product.imageMedium || product.imageOriginal;
```

### 10.3 Support Resources
```bash
# Cloudflare Community
https://community.cloudflare.com/c/developers/workers/40

# R2 Documentation
https://developers.cloudflare.com/r2/

# Discord de POS MiniVeci
https://discord.gg/miniveci-dev
```

## ✅ Checklist Final

- [ ] ✅ Bucket R2 creado y configurado
- [ ] ✅ API tokens generados y guardados
- [ ] ✅ Custom domain (cdn.miniveci.cl) funcionando
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Test de conexión exitoso
- [ ] ✅ Migración de imágenes completada
- [ ] ✅ POS carga imágenes desde CDN
- [ ] ✅ Monitoreo y alertas configuradas
- [ ] ✅ Costos optimizados

## 🎉 ¡Felicitaciones!

Ahora tienes configurado un sistema de imágenes súper optimizado que:

- 🚀 Carga **99% más rápido** (210KB vs 17MB)
- 💰 Cuesta **$0.01/mes** para 3000 productos
- 🌍 Se distribuye **globalmente** automáticamente
- ⚡ Tiene cache **inteligente** con Cloudflare
- 📈 Escala **automáticamente** sin límites

**Next Steps:**
1. [Configurar Webhooks WooCommerce](./WOOCOMMERCE_WEBHOOKS.md)
2. [Deploy en producción](./DEPLOYMENT.md)
3. [Setup monitoreo avanzado](./MONITORING.md)

---

*¿Problemas? Abre un issue en GitHub o contacta al equipo de desarrollo.*