# 🔧 Configuración Final Cloudflare R2 para POS MiniVeci

## ✅ Tu configuración actual:
- Account ID: `8cb1d51307cdce14ace435166c2cafc6`
- Bucket Name: `pos-miniveci-bucket`
- API Token: `xHnuQNuj3eyh-Ce5e8DyT7Lzmfa0pYhJ0wmPlrEu`

## 🔑 PASO FALTANTE: Crear R2 API Tokens

El token que tienes es de "Account API". Para el POS necesitas "R2 API Tokens" específicos.

### 1. Ir a R2 API Tokens:
```
https://dash.cloudflare.com/profile/api-tokens
```

### 2. Crear Nuevo Token:
- Click "Create Token"
- Usar "Custom token" template
- **Token name**: `pos-miniveci-r2`

### 3. Configurar Permisos:
```
Permissions:
- Account: Cloudflare R2:Edit
- Zone Resources: Include All zones

Account Resources: 
- Include: Your Account (8cb1d51307cdce14ace435166c2cafc6)

Zone Resources:
- Include: All zones
```

### 4. IMPORTANTE: Generar S3 Credentials
Después de crear el token, ir a:
```
Dashboard → R2 Object Storage → Manage R2 API tokens → Create API token
```

**Configuración específica para S3:**
```
Token name: pos-miniveci-s3
Permissions: Object Read & Write  
Bucket resource: pos-miniveci-bucket
TTL: No expiry
```

Esto te dará:
- **Access Key ID**: (como aws_access_key_id)
- **Secret Access Key**: (como aws_secret_access_key)

## 📝 Variables de Entorno Finales:

```env
# ===== Cloudflare R2 =====
R2_ENDPOINT=https://8cb1d51307cdce14ace435166c2cafc6.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=aqui_tu_access_key_id
R2_SECRET_ACCESS_KEY=aqui_tu_secret_access_key  
R2_BUCKET_NAME=pos-miniveci-bucket
R2_PUBLIC_URL=https://cdn.miniveci.cl

# ===== WooCommerce (mantener las tuyas) =====
NEXT_PUBLIC_WOO_URL=https://miniveci.cl
WOO_CONSUMER_KEY=ck_c1fa81b4625f3bb5426f2d7e82d3cc86abf30438
WOO_CONSUMER_SECRET=cs_2391e5ead1c080fa7c4b91838845a345aeb78721
WOO_WEBHOOK_SECRET=genera_un_secret_random_aqui
```

## 🧪 Test de Conexión:

Después de configurar las variables, ejecutar:

```bash
# Test conexión R2
node -e "
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'auto',
  endpoint: 'https://8cb1d51307cdce14ace435166c2cafc6.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'TU_ACCESS_KEY_ID',
    secretAccessKey: 'TU_SECRET_ACCESS_KEY',
  },
});
client.send(new ListObjectsV2Command({ Bucket: 'pos-miniveci-bucket', MaxKeys: 1 }))
  .then(() => console.log('✅ R2 Connection OK'))
  .catch(err => console.error('❌ R2 Connection Failed:', err));
"
```

## 🌐 Configurar Custom Domain (Opcional pero Recomendado):

1. **Agregar CNAME en Cloudflare DNS**:
   ```
   Type: CNAME
   Name: cdn
   Target: pos-miniveci-bucket.8cb1d51307cdce14ace435166c2cafc6.r2.cloudflarestorage.com
   Proxy status: Proxied (🧡)
   ```

2. **Actualizar R2_PUBLIC_URL**:
   ```env
   R2_PUBLIC_URL=https://cdn.miniveci.cl
   ```

## 🚀 Una vez configurado:

1. **Probar migración de imágenes**:
   ```bash
   npm run migrate:images
   ```

2. **Verificar POS**:
   ```bash
   npm run dev
   # Ir a http://localhost:3000/pos/checkout
   ```

¡Con esto tendrás imágenes optimizadas cargando desde tu CDN global! 🎉