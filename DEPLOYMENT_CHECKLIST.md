# 🚀 Checklist de Deployment a Cloudflare Pages

## ✅ Pre-requisitos Completados

- [x] ✅ Dependencias agregadas (`@cloudflare/next-on-pages`, `wrangler`)
- [x] ✅ Scripts de build/deploy configurados
- [x] ✅ Headers CORS configurados (`public/_headers`)
- [x] ✅ Next.js config con headers COOP/COEP

## 📋 Pasos de Deployment

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Build Local (Prueba)
```bash
npm run pages:build
```

### 3. Configurar Proyecto en Cloudflare
1. Ir a **Cloudflare Dashboard** → **Pages** → **Create Project**
2. Conectar repositorio GitHub de POS MiniVeci
3. Configurar Build Settings:
   - **Build command**: `npx @cloudflare/next-on-pages@1`
   - **Build output directory**: `.vercel/output/static`
   - **Node version**: `20` (en Environment → Build settings)

### 4. Variables de Entorno (CRÍTICO)
En **Project Settings** → **Environment variables**:

#### Production
```
TURSO_DATABASE_URL=libsql://[tu-db-production].turso.io
TURSO_AUTH_TOKEN=[token-production] (como Secret)
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

#### Preview
```
TURSO_DATABASE_URL=libsql://[tu-db-preview].turso.io  
TURSO_AUTH_TOKEN=[token-preview] (como Secret)
NODE_ENV=preview
NEXT_PUBLIC_APP_ENV=preview
```

### 5. Configurar Dominio Personalizado (Opcional)
1. **Pages** → **Custom domains** → **Add custom domain**
2. Verificar DNS
3. Activar **Always use HTTPS**
4. Activar **HSTS** (recomendado para producción)

## 🧪 Testing Post-Deployment

### 1. Verificar Headers CORS
```bash
# Homepage
curl -I https://tu-dominio.com
# Debe incluir: Cross-Origin-Opener-Policy: same-origin
# Debe incluir: Cross-Origin-Embedder-Policy: require-corp

# SQLite Worker
curl -I https://tu-dominio.com/sqlite-worker.js  
# Debe incluir: COOP + COEP + CORP

# WASM files (si existen)
curl -I https://tu-dominio.com/alguna-ruta.wasm
# Debe incluir: COOP + COEP + CORP + Content-Type: application/wasm
```

### 2. Verificar SharedArrayBuffer
En **DevTools Console**:
```javascript
typeof SharedArrayBuffer === 'function'
// Debe retornar: true
```

### 3. Test Offline Functionality
1. ✅ Abrir la app, crear/editar productos
2. ✅ Verificar datos en **Application** → **Storage** (OPFS/IndexedDB)
3. ✅ Simular offline: **DevTools** → **Network** → **Offline**
4. ✅ Verificar que la app sigue funcionando
5. ✅ Volver online y verificar sincronización con Turso

### 4. Verificar Sync con Turso
1. ✅ Crear productos online
2. ✅ Verificar que aparecen en base remota
3. ✅ Verificar logs de sincronización

### 5. Test de Performance
1. ✅ Web Vitals (LCP < 2.5s, CLS < 0.1)
2. ✅ Tiempo de carga inicial
3. ✅ Funcionalidad de rutas (/pos/dashboard, /pos/products)

## 🔧 Comandos Útiles

```bash
# Install Cloudflare tools
npm install -D @cloudflare/next-on-pages wrangler

# Build for Pages
npm run pages:build

# Deploy manual (si no usas GitHub integration)
npm run pages:deploy

# Ver logs de deployment
npx wrangler pages logs pos-miniveci

# Preview local con Cloudflare
npx wrangler pages dev .vercel/output/static --port 3001
```

## 🚨 Troubleshooting

### Error: SharedArrayBuffer not available
- ✅ Verificar headers COOP/COEP en respuesta
- ✅ Confirmar que `public/_headers` está en el build
- ✅ Verificar que no hay recursos cross-origin sin CORP

### Error: Worker/WASM blocked by COEP  
- ✅ Verificar que `sqlite-worker.js` incluye CORP header
- ✅ Confirmar que worker se sirve desde mismo origen

### Error: Sync con Turso falla
- ✅ Verificar variables `TURSO_*` en Environment
- ✅ Confirmar que tokens tienen permisos correctos
- ✅ Verificar logs en Pages Functions

### Build falla con next-on-pages
- ✅ Verificar Node version (debe ser 18+, recomendado 20)
- ✅ Confirmar que no usas APIs Node-only en client/edge code
- ✅ Revisar logs de build en Cloudflare Dashboard

## 📊 Monitoring Post-Launch

### Cloudflare Analytics
- **Pages** → **Deployments** → **Logs** para errores
- **Analytics** tab para métricas de tráfico

### Error Tracking (Opcional)
Integrar Sentry o similar:
```bash
npm install @sentry/nextjs
# Configurar para edge/browser error tracking
```

### Performance Monitoring
- Web Vitals via Google Analytics
- Cloudflare Speed insights
- Core Web Vitals reportes

---

## ✅ Sign-off Final

- [ ] Headers CORS verificados
- [ ] SharedArrayBuffer habilitado  
- [ ] Funcionamiento offline confirmado
- [ ] Sync con Turso operacional
- [ ] Performance aceptable (LCP < 2.5s)
- [ ] SSL/HTTPS funcionando
- [ ] Variables de entorno configuradas
- [ ] Dominio personalizado activo (si aplica)

**Deployment completado por**: ________________
**Fecha**: ________________
**URL Producción**: ________________
**URL Preview**: ________________