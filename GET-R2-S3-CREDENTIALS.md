# 🔑 Cómo Obtener Credenciales S3 para R2

## ⚠️ IMPORTANTE
Tu token `-OtkUgeslT0cqZH3OtN30_hsP30YGCHG4i7SsQvf` es válido, pero necesitas credenciales **S3-compatible** diferentes.

## 📋 Pasos Exactos:

### 1. **Ir a R2 API Tokens (NO Account API Tokens)**
```
https://dash.cloudflare.com → R2 Object Storage → Manage R2 API tokens
```

### 2. **Crear Nuevo Token R2**
- Click "Create API token"
- **Token name**: `pos-miniveci-s3`
- **Permissions**: Object Read & Write
- **Bucket resource**: `pos-miniveci-bucket`
- **TTL**: No expiry

### 3. **IMPORTANTE: Después de crear**
Te dará estas credenciales **S3-compatible**:
```
Access Key ID: R2xxxxxxxxxxxxxxxxxxxxx
Secret Access Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

### 4. **Usar en .env.local:**
```env
# Cloudflare R2 S3-compatible credentials
R2_ENDPOINT=https://8cb1d51307cdce14ace435166c2cafc6.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=R2xxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
R2_BUCKET_NAME=pos-miniveci-bucket
R2_PUBLIC_URL=https://cdn.miniveci.cl
```

## 🔍 Diferencia Clave:

### ❌ Lo que tienes (API Token):
```
Authorization: Bearer -OtkUgeslT0cqZH3OtN30_hsP30YGCHG4i7SsQvf
```

### ✅ Lo que necesitas (S3 Credentials):
```
Access Key ID: R2xxxxx...
Secret Access Key: yyyyy...
```

## 🧪 Test después de configurar:
```bash
npm run test:r2
# Debería mostrar: ✅ All R2 tests passed successfully!
```

## 📞 Si tienes problemas:
1. Verificar que el bucket `pos-miniveci-bucket` existe
2. Verificar permisos del token (Object Read & Write)
3. Usar exactamente el bucket name correcto