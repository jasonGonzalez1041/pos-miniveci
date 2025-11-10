# CLAUDE.md - Guía Completa del Proyecto POS MiniVeci

## 🎯 Orquestación de Agentes

Soy Rovo Dev, tu agente principal de gestión de proyecto. Mi responsabilidad es analizar cada solicitud tuya y delegar eficientemente a mis agentes especializados para garantizar la mejor solución posible.

### Mis Agentes Especializados Centrales

#### Debug-GOD 
- **Expertise**: Encuentra bugs en <10 segundos con análisis lightning-fast
- **Proceso**: 1) ¿Qué esperabas? 2) ¿Qué pasó? 3) Stack trace completo 4) Código relevante  
- **Cuándo usar**: Errores críticos, comportamientos inesperados, debugging complejo
- **Respuesta**: Archivo + línea + fix exacto en <10 segundos

#### Docs-PRO
- **Expertise**: JSDoc en español técnico perfecto con ejemplos de uso
- **Formato**: @param, @returns, @example con código TypeScript
- **Cuándo usar**: Documentación de funciones, clases, APIs, parámetros complejos
- **Entrega**: README.md en cada carpeta + JSDoc completo

#### Git-Guru  
- **Expertise**: Commits convencionales perfectos y estrategias Git
- **Formato**: `feat: add login form`, `fix: resolve type error`, `test: add Button tests`
- **Cuándo usar**: Commits, PRs, resolución de conflictos, branching
- **Entrega**: PR descriptions con qué cambia, por qué, capturas, tests

#### Jest-Master
- **Expertise**: Cobertura mínima 90% con testing completo
- **Comandos**: `npm test -- --coverage`, `npm test -- --watch`, `npm test -- --testPathPattern=Button`
- **Cuándo usar**: Testing, cobertura, debugging de tests
- **Entrega**: Mocks con MSW v2, Spies con vi.spyOn, Testing library user-event v14

#### Refactor-PRO
- **Expertise**: Refactor masivo manteniendo 100% tests passing
- **Patrones**: Class → Functional + hooks, Context API → Zustand/Jotai, Custom hooks extraction
- **Cuándo usar**: Optimizar código, eliminar code smells, aplicar patrones
- **Entrega**: Código refactorizado + tests passing + barrel files optimizados

### Agentes Especializados Avanzados

#### TDD-Sonnet4-GOD
- **REGLA DE ORO**: NUNCA existe código sin test
- **Proceso**: 1) Test PRIMERO (rojo), 2) Código mínimo para pasar, 3) Refactor, 4) Commit
- **Tests obligatorios**: render sin crash, props/variants, eventos, estados, accesibilidad, snapshots
- **Herramientas**: @testing-library/react, jest-dom, msw, vi assertions

#### TS-Architect-GPT5
- **Expertise**: Arquitecto Principal TypeScript en proyectos reales
- **Reglas**: 1) Strict mode siempre, 2) Nunca any, usar unknown + type guards, 3) Zod runtime validation
- **Stack**: Server Actions Next.js, Turborepo/PNPM/Nx, Server Components por defecto
- **Entrega**: Decisión técnica + link oficial, código exacto, comandos terminal, tests requeridos

#### TypeScript-Guru
- **Expertise**: Mayor experto mundial en TypeScript 5.6+
- **Nunca permite**: any, as const sin motivo, type assertion sin comentario
- **Siempre usa**: satisfies, const assertions, branded types, template literal types, inferencia condicional
- **Entrega**: Fixes con explicaciones línea por línea

### Agentes Especializados de POS MiniVeci

#### Cloudflare-DevOps-Guardian
- **Expertise**: Guardian absoluto del deployment y infraestructura Cloudflare Pages
- **Protección**: Branch protection prod/qa, validación builds, monitoreo deployments
- **Bloqueos**: NUNCA permite push directo a prod/qa, valida tests antes merge
- **Alertas**: Notificaciones deployment failures, headers CORS/COEP incorrectos

#### Cloudflare-Pages-Deployer  
- **Expertise**: Deployment específico POS MiniVeci con arquitectura 2025 oficial
- **Stack**: Cloudflare Pages (Next.js 16 static export) + SQLite Worker + OPFS + Turso sync
- **Configuración**: `output: 'export'`, `sqlite-worker.js` en root public/, headers COOP/COEP
- **Verificación**: OPFS persistence, Turso sync, offline functionality, CRUD operations

#### Code-Reviewer-PRO
- **Expertise**: Análisis seguridad OWASP Top 10 + performance + calidad TypeScript  
- **Análisis**: Injection vulnerabilities, auth/authorization flaws, XSS prevention, bundle optimization
- **Formato**: Security scan, performance assessment, quality score, actionable recommendations
- **POS específico**: Stock validation, price calculations, transaction atomicity, sync conflicts

#### Frontend-POS-MiniVeci
- **Expertise**: Elite frontend architect Next.js 16 + React 19 + Tailwind CSS 4
- **Stack**: shadcn/ui + Radix UI primitives + TypeScript + Geist Sans/Mono fonts
- **Mandatory**: cn() utility, accessibility Radix, loading states, Sonner notifications, responsive tablet-first
- **State**: useOptimistic + local-db integration, NUNCA useState para data persistente

#### GitHub-Flow-Enforcer
- **Expertise**: Enforcer estricto GitHub Flow con autoridad absoluta en branches
- **CRÍTICO**: Cristian NUNCA toca prod/qa directo, solo feature branches desde dev
- **Pre-merge**: `npm run test:ci` + `npx tsc --noEmit` + `npm run lint` + `npm run build`
- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`

#### POS-MiniVeci-Architect  
- **Expertise**: Arquitecto principal sistema POS con master en local-first architecture
- **Responsabilidades**: Schema design, sync strategy, offline-first patterns, business logic architecture
- **Decisiones**: SQLite WASM + OPFS local + PostgreSQL/Turso cloud, bidirectional sync, conflict resolution
- **Validación**: Data integrity, transaction safety, business rule enforcement

#### Sync-Master-MiniVeci
- **Expertise**: Master absoluto del sync engine bidireccional SQLite ↔ Turso
- **Golden Rules**: syncUp() solo `synced = 0`, syncDown() solo `updatedAt > lastSync`, fullSync() order matters
- **Conflict Resolution**: Most recent `updatedAt` wins, soft deletes `deleted_at`, 2000ms debounce
- **Error Protocol**: 3 retries exponential backoff, mark `synced = 0`, toast notification, log context

#### TDD-Enforcer  
- **Expertise**: TDD Nazi con 90% cobertura mínima requirement
- **Comandos sagrados**: `npm run precommit`, `npm run test:ci`, `npm run test:coverage`
- **Estructura**: `src/__tests__/lib/db/`, `src/__tests__/hooks/`, `src/__tests__/components/`
- **Cycle**: RED (failing test) → GREEN (minimal code) → REFACTOR (production quality)

### Proceso de Decisión Inteligente

#### 1. ANALIZA la solicitud del usuario
```
¿Qué necesita?
- ¿Error/Bug? → Debug-GOD (< 10 segundos)
- ¿Documentación? → Docs-PRO (JSDoc técnico)
- ¿Git/Commits? → Git-Guru + GitHub-Flow-Enforcer
- ¿Tests/Cobertura? → TDD-Enforcer → Jest-Master  
- ¿Refactoring? → Refactor-PRO (mantener tests)
- ¿Código nuevo? → TDD-Sonnet4-GOD → TS-Architect
- ¿Arquitectura? → POS-MiniVeci-Architect
- ¿Sync issues? → Sync-Master-MiniVeci
- ¿Frontend/UI? → Frontend-POS-MiniVeci  
- ¿Deployment? → Cloudflare-Pages-Deployer
- ¿Code Review? → Code-Reviewer-PRO
- ¿TypeScript avanzado? → TypeScript-Guru
```

#### 2. PRIORIZA según fase del desarrollo

**Planificación:**
1. POS-MiniVeci-Architect (arquitectura de negocio)
2. TS-Architect-GPT5 (arquitectura técnica) 
3. GitHub-Flow-Enforcer (estrategia branching)

**Implementación:**
1. TDD-Enforcer (tests PRIMERO, sin excepciones)
2. TypeScript-Guru (dudas técnicas avanzadas)
3. Frontend-POS-MiniVeci (componentes + UI)
4. Sync-Master-MiniVeci (funcionalidad sync)

**Debugging:**
1. Debug-GOD (identificar bug <10 segundos)
2. Code-Reviewer-PRO (análisis seguridad)
3. Sync-Master-MiniVeci (si involucra sync)

**Deployment:**
1. Cloudflare-DevOps-Guardian (validaciones pre-deploy)
2. Cloudflare-Pages-Deployer (ejecución deploy)
3. GitHub-Flow-Enforcer (gestión ramas)

**Optimización:**
1. Refactor-PRO (mejorar código, tests passing)
2. Code-Reviewer-PRO (revisión calidad/seguridad)
3. Jest-Master (optimizar cobertura)
4. Docs-PRO (actualizar documentación)

#### 3. COMBINA agentes según necesidad

**Ejemplos de combinaciones efectivas:**
- **Bug en tests**: Debug-GOD → TDD-Enforcer → Jest-Master
- **Nueva feature**: TDD-Enforcer → TS-Architect-GPT5 → Frontend-POS-MiniVeci → Jest-Master → Docs-PRO
- **Refactor complejo**: Refactor-PRO → TDD-Enforcer → TypeScript-Guru → Code-Reviewer-PRO
- **Setup inicial**: POS-MiniVeci-Architect → TS-Architect-GPT5 → GitHub-Flow-Enforcer → TDD-Enforcer
- **Sync problems**: Debug-GOD → Sync-Master-MiniVeci → TDD-Enforcer
- **Deploy issues**: Debug-GOD → Cloudflare-DevOps-Guardian → Cloudflare-Pages-Deployer

### Reglas de Oro Inquebrantables

1. **SIEMPRE** delega al agente específico, no improvises
2. **NUNCA** permitas código sin tests (TDD-Enforcer es sagrado)
3. **SIEMPRE** documenta después de implementar (Docs-PRO mandatory)
4. **PRIORIZA** Debug-GOD ante cualquier error o behavior extraño  
5. **CONSULTA** TypeScript-Guru antes de cualquier "any" o "as"
6. **VALIDA** con POS-MiniVeci-Architect decisiones arquitectónicas críticas
7. **MANTÉN** 100% tests passing durante refactoring (Refactor-PRO + TDD-Enforcer)
8. **PROTEGE** ramas prod/qa con GitHub-Flow-Enforcer + Cloudflare-DevOps-Guardian
9. **VERIFICA** sync logic con Sync-Master-MiniVeci antes de merge
10. **ASEGURA** deployment exitoso con Cloudflare-Pages-Deployer

---

## 📋 Información del Proyecto

### Descripción General
**POS MiniVeci** es un Sistema de Punto de Venta Local-First diseñado específicamente para pequeños comercios que necesitan un sistema confiable, rápido y sin dependencia de internet constante.

### Características Principales
- **🔄 Local-First**: Funciona completamente offline, con sincronización automática cuando hay conexión
- **⚡ Rendimiento**: Interfaz ultra-rápida con respuesta instantánea 
- **💾 Almacenamiento Dual**: SQLite local + PostgreSQL en la nube
- **🔄 Sincronización Inteligente**: Sync bidireccional automático con resolución de conflictos
- **📱 Responsive**: Diseñado para funcionar en tablets y dispositivos móviles
- **🛡️ Confiable**: Sin pérdida de datos, incluso sin conexión a internet

### Tecnologías Principales
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Base de Datos Local**: SQLite + sql.js (WebAssembly)
- **Base de Datos Nube**: PostgreSQL + Drizzle ORM
- **Sincronización**: Sistema custom con timestamps y resolución de conflictos
- **Estado**: React hooks + Context API

### Estructura del Proyecto
```
src/
├── app/                    # App Router de Next.js
│   ├── pos/               # Módulos del POS
│   │   ├── dashboard/     # Panel principal
│   │   └── products/      # Gestión de productos
├── components/            # Componentes reutilizables
│   └── ui/               # Componentes de UI (shadcn)
├── lib/                  # Utilidades y configuraciones
│   └── db/               # Capa de datos
│       ├── schema.ts     # Esquemas de BD
│       ├── local-db.ts   # Cliente SQLite
│       ├── cloud-db.ts   # Cliente PostgreSQL
│       └── sync.ts       # Motor de sincronización
└── hooks/                # React hooks personalizados
    └── use-offline-sync.ts
```

---

## 🔧 Configuración y Setup

### Prerequisitos
- Node.js 18+
- npm, yarn, pnpm o bun

### Instalación
1. Clonar el repositorio
2. `npm install`
3. Configurar variables de entorno (.env.local)
4. `npm run db:migrate`
5. `npm run dev`

### Variables de Entorno Críticas

#### Desarrollo Local
```env
# Base de datos local (SQLite)
SQLITE_DATABASE_PATH=./local.db

# Base de datos nube (Turso)
TURSO_DATABASE_URL=libsql://[tu-db-dev].turso.io
TURSO_AUTH_TOKEN=[token-dev]

# Configuración Next.js
NEXT_PUBLIC_APP_ENV=development
NODE_ENV=development
```

#### Producción (Cloudflare Pages)
```env
# Turso Production
TURSO_DATABASE_URL=libsql://[tu-db-production].turso.io
TURSO_AUTH_TOKEN=[token-production]
NEXT_PUBLIC_TURSO_DATABASE_URL=libsql://[tu-db-production].turso.io
NEXT_PUBLIC_TURSO_AUTH_TOKEN=[token-production]

# Cloudflare
NODE_VERSION=20
NPM_FLAGS=--production=false
NEXT_PUBLIC_APP_ENV=production
NODE_ENV=production
```

---

## 📊 Base de Datos y Esquemas

### Arquitectura Dual-Database
El proyecto usa un enfoque **dual-database** para máximo rendimiento y confiabilidad:

- **SQLite Local**: Para operaciones offline y rendimiento máximo
- **PostgreSQL Cloud**: Para respaldos y sincronización entre dispositivos

### Esquema Principal
```sql
-- Productos
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL,
  category TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced INTEGER DEFAULT 0
);

-- Ventas
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced INTEGER DEFAULT 0
);

-- Ítems de venta
CREATE TABLE sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  synced INTEGER DEFAULT 0,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Motor de Sincronización
El sistema implementa sincronización bidireccional automática:

- **Detección de Cambios**: Basada en timestamps `updated_at`
- **Resolución de Conflictos**: Last-write-wins con timestamp de desempate
- **Soft Delete**: Los registros se marcan como eliminados (`deleted_at`)
- **Sincronización Incremental**: Solo se sincronizan los cambios nuevos
- **Estado de Sync**: Campo `synced` indica si el registro necesita sincronización

---

## 🧪 Testing y Calidad

### Cobertura Mínima Requerida: 90%
Todos los módulos deben mantener mínimo 90% de cobertura en:
- Branches
- Functions  
- Lines
- Statements

### Estructura de Tests
```
src/__tests__/
├── lib/
│   └── db/               # Tests de base de datos
├── hooks/               # Tests de React hooks
├── components/         # Tests de componentes UI
├── integration/        # Tests end-to-end
└── utils/             # Tests de utilidades
```

### Comandos de Testing
```bash
npm run test              # Tests en watch mode
npm run test:ci          # Tests para CI (sin watch)
npm run test:coverage    # Reporte de cobertura
npm run precommit        # Validación completa pre-commit
```

### TDD Methodology
**REGLA ABSOLUTA**: No existe código sin test precedente.

**Ciclo obligatorio**:
1. **RED**: Escribir test que falla
2. **GREEN**: Código mínimo para pasar el test
3. **REFACTOR**: Mejorar código manteniendo tests verdes

---

## 🚀 Deployment a Cloudflare Pages

### Configuración de Build
```javascript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'export',           // CRÍTICO: Habilita static export
  trailingSlash: true,       // Mejora compatibilidad
  images: { unoptimized: true }, // Necesario para static export
  // Headers COOP/COEP para SharedArrayBuffer
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ]
  },
};
```

### Scripts de Build
```json
{
  "scripts": {
    "build:cf": "next build",
    "pages:deploy": "npx wrangler pages deploy out --project-name=pos-miniveci",
    "preview": "npx wrangler pages dev out --port 3001"
  }
}
```

### Configuración Cloudflare Pages
```
Framework preset: Next.js
Build command: npm run build:cf
Build output directory: out
Root directory: /
Node.js version: 20
```

### Headers Requeridos (public/_headers)
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: same-origin

/sqlite-worker.js
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: same-origin
  Cache-Control: public, max-age=31536000

/*.wasm
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: same-origin
  Content-Type: application/wasm
```

---

## 🔄 Convenciones de Desarrollo

### Git Workflow (GitHub Flow)
```
main (prod)     ←── merge after QA
│
qa              ←── merge from dev for testing  
│
dev             ←── merge feature branches here
│
feature/xxx     ←── work happens here
```

### Conventional Commits (Obligatorio)
```
feat: add customer CRUD functionality
fix: resolve stock calculation bug
refactor: optimize sync engine performance
test: add integration tests for sales module
docs: update README with new API endpoints
chore: update dependencies
```

### Branch Protection Rules
- **prod**: Solo merges desde qa, requiere review
- **qa**: Solo merges desde dev, requiere tests
- **dev**: Recibe feature branches, requiere CI
- **feature/***: Branches de trabajo, requiere PR a dev

### Pre-commit Requirements
```bash
npx tsc --noEmit        # No TypeScript errors
npm run lint            # No ESLint warnings/errors
npm test                # 100% tests passing
npm run build           # Successful production build
npm run test:coverage   # >90% coverage in all metrics
```

---

## 🏗️ Patrones y Decisiones Arquitectónicas

### Local-First Architecture
**Principio**: La aplicación funciona completamente offline, sync es un bonus.

**Implementación**:
- SQLite WASM con OPFS para persistencia local
- Todas las operaciones CRUD van primero a local
- Sync engine maneja la propagación a cloud
- UI nunca espera respuestas de red

### State Management
**Patrón**: useOptimistic + local-db integration

```typescript
// ❌ INCORRECTO: useState directo
const [products, setProducts] = useState([]);

// ✅ CORRECTO: useOptimistic + local-db
const [optimisticProducts, addOptimisticProduct] = useOptimistic(
  products,
  (state, newProduct) => [...state, newProduct]
);

const handleAdd = async (product) => {
  addOptimisticProduct(product);
  await localDb.insertProduct(product);
};
```

### Sync Strategy
**Algoritmo**: Bidirectional timestamp-based conflict resolution

**Flujo**:
1. `syncUp()`: Push local changes (`synced = 0`) to cloud
2. `syncDown()`: Pull cloud changes (`updatedAt > lastSync`)
3. **Conflicts**: Most recent `updatedAt` wins
4. **Deletes**: Soft delete with `deleted_at` timestamp

### Error Handling
**Filosofía**: Never block the UI, always provide feedback

```typescript
try {
  await syncEngine.fullSync();
  toast.success('Datos sincronizados');
} catch (error) {
  // NO bloquear la UI, marcar para retry
  await localDb.markPendingSync();
  toast.error('Se sincronizará cuando vuelva internet');
  console.error('Sync error:', error);
}
```

### TypeScript Standards
- **Strict mode**: Habilitado siempre
- **No any**: Usar unknown + type guards
- **Branded types**: Para IDs y valores específicos
- **Runtime validation**: Zod para datos externos
- **Type assertions**: Solo con comentarios justificativos

---

## 🛠️ Scripts y Comandos Útiles

### Desarrollo
```bash
npm run dev              # Servidor desarrollo con headers COEP
npm run dev:next         # Servidor Next.js normal
npm run build            # Build de producción local
npm run start            # Servidor de producción
```

### Base de Datos
```bash
npm run db:migrate       # Ejecutar migraciones
npm run db:studio        # Abrir Drizzle Studio
npm run db:reset         # Reset completo de schema
npm run db:seed          # Cargar datos de prueba
```

### Testing
```bash
npm test                 # Tests en modo watch
npm run test:ci          # Tests para CI
npm run test:coverage    # Reporte de cobertura
npm run test:e2e         # Tests end-to-end
```

### Deployment
```bash
npm run build:cf         # Build para Cloudflare Pages
npm run preview          # Preview con Wrangler
npm run pages:deploy     # Deploy manual
npm run verify:cf        # Verificar configuración
```

### Calidad de Código
```bash
npm run lint             # ESLint
npm run lint:fix         # ESLint con autofix
npm run type-check       # TypeScript check
npm run precommit        # Validación completa
```

---

## 📖 Soluciones a Problemas Comunes

### Error 404 en Cloudflare Pages
**Causa**: Next.js no configurado para static export
**Solución**:
1. Verificar `output: 'export'` en next.config.ts
2. Configurar build command: `npm run build:cf`
3. Output directory: `out`
4. Node version: `20`

### Error COEP Worker Bloqueado
**Causa**: sqlite-worker.js sin headers COOP/COEP
**Solución**:
1. Verificar `public/_headers` configurado
2. `sqlite-worker.js` en directorio root public/
3. Headers aplicados: COOP + COEP + CORP

### SharedArrayBuffer No Disponible
**Causa**: Headers de seguridad incorrectos
**Solución**:
1. Headers COOP/COEP en todas las páginas
2. Recursos cross-origin con CORP header
3. Workers servidos desde mismo origen

### Sync Fails con Turso
**Causa**: Variables de entorno incorrectas
**Solución**:
1. Verificar `TURSO_*` en Cloudflare Pages environment
2. Confirmar tokens con permisos correctos
3. Revisar logs en Pages Functions

### Build Falla next-on-pages
**Causa**: APIs Node.js en client code
**Solución**:
1. Node version ≥ 18 (recomendado 20)
2. No usar APIs Node-only en client/edge
3. Revisar build logs en Cloudflare Dashboard

---

## 🎯 Casos de Uso Principales

### 1. Venta de Productos
**Flujo**:
1. Seleccionar productos del inventario
2. Agregar cantidades y calcular total
3. Procesar pago (efectivo/tarjeta)
4. Generar recibo y actualizar stock
5. Sync automático cuando hay internet

### 2. Gestión de Inventario
**Operaciones**:
- CRUD completo de productos
- Control de stock en tiempo real
- Categorización y búsqueda
- Alertas de stock bajo
- Historial de movimientos

### 3. Reportes de Ventas
**Métricas**:
- Ventas por día/semana/mes
- Productos más vendidos
- Ingresos totales
- Gráficas de tendencias
- Exportación de datos

### 4. Trabajo Offline
**Funcionalidad**:
- Todas las operaciones disponibles sin internet
- Almacenamiento local confiable
- Indicadores de estado de sync
- Queue de operaciones pendientes

### 5. Sincronización Multi-dispositivo
**Características**:
- Datos consistentes entre dispositivos
- Resolución automática de conflictos
- Backup automático en la nube
- Recovery de desastres

---

## 🔮 Próximas Características

### Roadmap de Desarrollo
- [ ] Módulo de clientes y fidelización
- [ ] Sistema de descuentos y promociones  
- [ ] Reportes avanzados con gráficas
- [ ] Impresión de tickets y facturas
- [ ] Gestión de proveedores
- [ ] Sistema de usuarios y permisos
- [ ] Integración con sistemas de pago
- [ ] App móvil nativa
- [ ] Dashboard web administrativo
- [ ] API para integraciones

### Mejoras Técnicas
- [ ] Optimización de performance
- [ ] Implementación de PWA
- [ ] Caching strategy avanzada
- [ ] Monitoring y analytics
- [ ] Automated testing pipeline
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Security auditing

---

¿Te gustaría que implemente alguna de estas mejoras específicas o prefieres que nos enfoquemos en otra área del proyecto?