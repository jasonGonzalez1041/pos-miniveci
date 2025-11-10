# CLAUDE.md - Guía Completa del Proyecto

## 🎯 Orquestación de Agentes Rovo Dev

### Tu Rol
Eres Rovo Dev, el agente principal de gestión de proyecto. Tu responsabilidad es analizar cada solicitud del usuario y delegar eficientemente a tus agentes especializados para garantizar la mejor solución posible.

### Tus Agentes Especializados

**Debug-GOD**
- **Expertise**: Encuentra bugs en <10 segundos
- **Cuándo usar**: Errores críticos, comportamientos inesperados, debugging complejo
- **Prompt sugerido**: "Encuentra el bug en [código/escenario]. Usuario esperaba [X] pero pasó [Y]."

**Docs-PRO**
- **Expertise**: JSDoc en español técnico perfecto
- **Cuándo usar**: Documentación de funciones, clases, APIs, parámetros complejos
- **Prompt sugerido**: "Documenta esta función/clase con JSDoc técnico: [código]"

**Git-Guru**
- **Expertise**: Commits convencionales y buenas prácticas Git
- **Cuándo usar**: Antes de commits, resolución de conflictos, estrategias de branching
- **Prompt sugerido**: "¿Cómo debo commitear estos cambios? [descripción] o ¿Estrategia para [escenario git]?"

**Jest-Master**
- **Expertise**: Cobertura mínima 90%, testing completo
- **Cuándo usar**: Escribir tests, mejorar cobertura, debugging de tests
- **Prompt sugerido**: "Crea tests con 90% cobertura para: [código] usando npm test --coverage"

**Refactor-PRO**
- **Expertise**: Mantiene 100% tests passing, refactoring seguro
- **Cuándo usar**: Optimizar código existente, eliminar code smells, aplicar patrones
- **Prompt sugerido**: "Refactoriza manteniendo tests passing: [código]. Aplica [patrón/principio]."

**TS-Sonnet-4-COD**
- **Expertise**: Código TypeScript con NUNCA any (Powered by Claude Sonnet 4)
- **Cuándo usar**: Escribir código nuevo, migrar a TypeScript, tipado estricto
- **Prompt sugerido**: "Implementa [feature] en TypeScript strict, sin any"

**TS-Architect-GPT5**
- **Expertise**: Arquitectura principal de TypeScript en proyectos reales
- **Cuándo usar**: Decisiones arquitectónicas, estructura de proyecto, patrones de diseño
- **Prompt sugerido**: "Diseña arquitectura para [proyecto/feature] considerando [requisitos]"

**TypeScript-Guru**
- **Expertise**: Mayor experto mundial en TypeScript 5.6+, nunca permite as const
- **Cuándo usar**: Dudas específicas de TS, tipos avanzados, problemas de compilación
- **Prompt sugerido**: "¿Cómo resolver [problema TypeScript]? Versión 5.6+"

### Reglas de Oro
1. **SIEMPRE** pregunta al agente específico, no improvises
2. **NUNCA** saltes el testing (Jest-Master)
3. **SIEMPRE** documenta después de implementar (Docs-PRO)
4. **PRIORIZA** Debug-GOD ante cualquier error
5. **CONSULTA** TypeScript-Guru antes de usar "any" o "as"
6. **VALIDA** con TS-Architect-GPT5 decisiones arquitectónicas importantes
7. **MANTÉN** los tests pasando (Refactor-PRO)

---

# POS MiniVeci - Sistema de Punto de Venta Local-First

## 📋 Resumen del Proyecto

**POS MiniVeci** es un sistema de punto de venta moderno desarrollado con Next.js que implementa una arquitectura "local-first" usando SQLite WASM con OPFS para persistencia local y Turso (LibSQL) para sincronización en la nube. Está diseñado específicamente para minimercados que necesitan funcionar tanto online como offline.

## 🏗️ Arquitectura

### Stack Tecnológico
- **Framework**: Next.js 16.0.1 (App Router)
- **Base de Datos Local**: SQLite WASM con OPFS (Origin Private File System)
- **Base de Datos Cloud**: Turso (LibSQL) 
- **ORM**: Drizzle ORM
- **UI**: React 19 + Tailwind CSS + Radix UI
- **Tipado**: TypeScript
- **Estado**: React hooks + local state
- **Notificaciones**: Sonner (toast)

### Arquitectura Local-First

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │ ←→ │   Local SQLite   │ ←→ │   Cloud Turso   │
│   (Frontend)    │    │   (WASM + OPFS)  │    │   (LibSQL)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
   UI Components          SQLite Worker           Sync Engine
   - Dashboard            - CRUD Operations       - Bidirectional
   - Products             - Schema Management     - Delta Sync
   - Forms                - Persistence           - Conflict Resolution
```

## 🗂️ Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Layout principal + metadata
│   ├── page.tsx           # Homepage simple
│   ├── globals.css        # Estilos globales Tailwind
│   └── pos/               # Rutas del POS
│       ├── dashboard/     # Mantenimiento productos (CRUD completo)
│       └── products/      # Gestión productos (interfaz alternativa)
├── components/ui/         # Componentes UI base (shadcn/ui)
│   ├── badge.tsx         # Badges de estado
│   ├── button.tsx        # Botones
│   ├── card.tsx          # Cards
│   ├── input.tsx         # Inputs
│   ├── label.tsx         # Labels
│   ├── sonner.tsx        # Toast notifications
│   └── table.tsx         # Tablas
├── lib/
│   ├── utils.ts          # Utilidades (cn para clases)
│   └── db/               # Capa de datos
│       ├── schema.ts     # Schema compartido Drizzle
│       ├── local-db.ts   # API local SQLite WASM
│       ├── cloud-db.ts   # API cloud Turso
│       └── sync.ts       # Motor de sincronización
└── hooks/
    └── use-offline-sync.ts # Hook sincronización automática
```

## 🗄️ Modelo de Datos

### Tabla Products
```typescript
{
  id: number (PK, autoincrement)
  name: string (NOT NULL)
  description: string (nullable)
  price: number (centavos, NOT NULL) // $10.00 = 1000
  stock: number (default: 0)
  imageUrl: string (nullable)
  updatedAt: timestamp (auto)
  synced: boolean (0=pendiente, 1=sincronizado)
}
```

### Índices
- `idx_products_synced` - Para consultas de sincronización
- `idx_products_updated_at` - Para sync delta por timestamp

## 🔄 Sistema de Sincronización

### Funcionamiento Local-First
1. **Todas las operaciones** se ejecutan primero en SQLite local
2. **Respuesta inmediata** al usuario (sin latencia de red)
3. **Sincronización en background** cuando hay conexión
4. **Funcionamiento offline** completo garantizado

### Estrategias de Sync
- **Sync Up**: Envía cambios locales no sincronizados a la nube
- **Sync Down**: Descarga cambios de la nube posteriores al último sync
- **Delta Sync**: Solo sincroniza cambios desde el último timestamp
- **Conflict Resolution**: Last-write-wins basado en `updated_at`

### Triggers de Sincronización
- **Al conectarse**: Cuando se restaura conexión a internet
- **Periódico**: Cada 30 segundos si está online
- **Manual**: Botón de sync forzado
- **Post-operación**: Después de crear/modificar/eliminar

## 🎯 Características Principales

### 1. Gestión de Productos
- **CRUD completo**: Crear, leer, actualizar, eliminar productos
- **Campos**: Nombre, descripción, precio, stock, imagen
- **Validación**: Precios en centavos, stock numérico
- **Búsqueda**: Por nombre y descripción

### 2. Interfaz Dual
- **Dashboard** (`/pos/dashboard`): Interfaz de mantenimiento completa
- **Products** (`/pos/products`): Vista alternativa de gestión

### 3. Estado de Conectividad
- **Indicador visual** de estado online/offline
- **Badge de sincronización** (pendiente/sincronizado)
- **Notificaciones** de cambios de conectividad

### 4. Persistencia Robusta
- **OPFS** para persistencia local real (no se pierde al cerrar)
- **Fallback** a memoria si OPFS no disponible
- **Worker separado** para operaciones SQLite sin bloquear UI

## 🔧 APIs y Componentes Clave

### Local Database API (`local-db.ts`)
```typescript
localDb.getAllProducts()          // Obtener todos los productos
localDb.getProduct(id)            // Obtener producto por ID
localDb.insertProduct(data)       // Crear nuevo producto
localDb.updateProduct(id, data)   // Actualizar producto
localDb.deleteProduct(id)         // Eliminar producto
localDb.getPendingSync()          // Productos pendientes de sync
localDb.markSynced(id)            // Marcar como sincronizado
```

### Cloud Database API (`cloud-db.ts`)
```typescript
cloudDb.getAllProducts()          // Obtener de Turso
cloudDb.upsertProduct(product)    // Insert o update
cloudDb.getUpdatedAfter(date)     // Para sync delta
cloudDb.isAvailable()             // Check conectividad
```

### Sync Engine (`sync.ts`)
```typescript
syncUp()                          // Local → Cloud
syncDown()                        // Cloud → Local  
fullSync()                        // Bidireccional completo
scheduleSyncDebounced()           // Sync con debounce
```

### Offline Sync Hook (`use-offline-sync.ts`)
```typescript
const { 
  isOnline,      // Estado de conectividad
  isSyncing,     // Sincronización en progreso
  isInitialized, // SQLite inicializado
  triggerSync    // Forzar sincronización
} = useOfflineSync();
```

## ⚙️ Configuración

### Variables de Entorno
```bash
NEXT_PUBLIC_TURSO_DATABASE_URL=   # URL de base Turso
NEXT_PUBLIC_TURSO_AUTH_TOKEN=     # Token de autenticación
TURSO_DATABASE_URL=               # Para migraciones
TURSO_AUTH_TOKEN=                 # Para migraciones
```

### Scripts Disponibles
```bash
npm run dev         # Desarrollo
npm run build       # Build producción
npm run start       # Iniciar producción
npm run db:generate # Generar migraciones
npm run db:migrate  # Ejecutar migraciones
npm run db:studio   # Abrir Drizzle Studio
```

## 🔒 Headers de Seguridad

Para SQLite WASM con OPFS se requieren headers CORS específicos:
```typescript
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## 📱 Funcionalidades por Página

### Homepage (`/`)
- Landing simple con título "POS Miniveci"

### Dashboard (`/pos/dashboard`) 
- **Formulario** de creación/edición inline
- **Tabla** con todos los productos
- **Acciones**: Editar, eliminar por producto
- **Estados visuales** de sincronización
- **Manejo de errores** con toasts

### Products (`/pos/products`)
- **Interfaz alternativa** de gestión
- **Misma funcionalidad** que dashboard
- **Diseño ligeramente diferente**

## 🎨 Diseño y UX

### Theme System
- **Tailwind CSS 4** con variables CSS personalizadas
- **Modo claro/oscuro** configurado
- **Componentes shadcn/ui** customizados
- **Fuentes**: Geist Sans + Geist Mono

### Estados de UI
- **Loading states** durante operaciones
- **Error states** con mensajes descriptivos  
- **Success feedback** con toasts
- **Sync indicators** con iconos (Wifi/WifiOff)
- **Badges de estado** para productos

## 🔄 Flujo de Datos

```
Usuario Acción → Local SQLite → UI Update → Background Sync → Cloud Update
     ↓              ↓              ↓              ↓              ↓
   onClick        Worker         setState       sync.ts       Turso
                 Message        Re-render      (debounced)   (cuando online)
```

## ✨ Ventajas de la Arquitectura

1. **Rendimiento**: Respuesta instantánea (local-first)
2. **Disponibilidad**: Funciona 100% offline
3. **Consistencia**: Sincronización bidireccional automática
4. **Escalabilidad**: SQLite local + Turso cloud
5. **Developer Experience**: APIs consistentes entre local/cloud
6. **Tipo Safety**: TypeScript + Drizzle en toda la stack

## 🎯 Casos de Uso Típicos

- **Minimercado rural**: Conexión intermitente, necesita funcionar siempre
- **Pop-up stores**: Sin internet confiable
- **Eventos**: Ventas en ubicaciones temporales  
- **Backup offline**: Continuidad de negocio durante cortes

---

## 🏗️ Arquitectura Técnica Detallada

### Visión General de la Arquitectura

POS MiniVeci implementa una arquitectura **Local-First** con las siguientes características:

- **Frontend**: Next.js 15 con React 19 y TypeScript
- **Base de Datos Local**: SQLite ejecutándose en el navegador via WebAssembly
- **Base de Datos Cloud**: PostgreSQL en Turso
- **Sincronización**: Sistema bidireccional con resolución de conflictos
- **UI**: Tailwind CSS con componentes de shadcn/ui

### Capas de la Aplicación

#### 1. Capa de Presentación (UI)
```
src/app/                 # App Router de Next.js
├── pos/dashboard/       # Dashboard principal del POS
├── pos/products/        # Gestión de productos
└── globals.css         # Estilos globales

src/components/ui/       # Componentes reutilizables
├── button.tsx          # Botones con variantes
├── card.tsx            # Tarjetas de contenido
├── input.tsx           # Inputs de formulario
├── table.tsx           # Tablas de datos
└── badge.tsx           # Badges y etiquetas
```

#### 2. Capa de Lógica de Negocio
```
src/lib/services/        # Servicios de negocio
└── sales-service.ts     # Lógica de ventas

src/lib/utils/           # Utilidades específicas
└── pos-helpers.ts       # Helpers para el POS

src/hooks/               # React hooks personalizados
└── use-offline-sync.ts  # Hook para sincronización offline
```

#### 3. Capa de Datos
```
src/lib/db/
├── schema.ts           # Esquemas de base de datos (Drizzle)
├── local-db.ts         # Cliente SQLite (WebAssembly)
├── cloud-db.ts         # Cliente PostgreSQL (Turso)
└── sync.ts             # Motor de sincronización
```

### Base de Datos Dual

#### SQLite Local (WebAssembly)
- **Ubicación**: Ejecutándose en el navegador
- **Worker**: `public/sqlite-worker.js`
- **Propósito**: 
  - Operaciones offline completas
  - Rendimiento máximo (sin latencia de red)
  - Persistencia local confiable

#### PostgreSQL Cloud (Turso)
- **Ubicación**: Edge database de Turso
- **Propósito**:
  - Respaldo en la nube
  - Sincronización entre dispositivos
  - Análisis y reportes centralizados

### Sistema de Sincronización

#### Estrategia de Sincronización
1. **Timestamps**: Cada registro tiene `created_at`, `updated_at`, `deleted_at`
2. **Detección de Cambios**: Comparación de `updated_at` timestamps
3. **Resolución de Conflictos**: Last-write-wins basado en timestamp
4. **Soft Delete**: Registros marcados como eliminados, no borrados físicamente

#### Flujo de Sincronización
```typescript
// Proceso de sync bidireccional
1. Obtener último timestamp de sync local
2. Descargar cambios desde la nube (timestamp > último_sync)
3. Aplicar cambios remotos a BD local
4. Obtener cambios locales (timestamp > último_sync)
5. Enviar cambios locales a la nube
6. Actualizar timestamp de último sync
```

### Esquema de Base de Datos Expandido

#### Tabla `products`
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,              -- UUID único
  name TEXT NOT NULL,               -- Nombre del producto
  price REAL NOT NULL,              -- Precio unitario
  stock INTEGER NOT NULL,           -- Cantidad en inventario
  category TEXT,                    -- Categoría (opcional)
  barcode TEXT,                     -- Código de barras (único)
  created_at INTEGER NOT NULL,      -- Timestamp de creación
  updated_at INTEGER NOT NULL,      -- Timestamp de última actualización
  deleted_at INTEGER                -- Timestamp de eliminación (soft delete)
);
```

#### Tabla `sales`
```sql
CREATE TABLE sales (
  id TEXT PRIMARY KEY,              -- UUID único
  total REAL NOT NULL,              -- Total de la venta
  payment_method TEXT NOT NULL,     -- Método de pago (efectivo, tarjeta, etc.)
  customer_name TEXT,               -- Nombre del cliente (opcional)
  notes TEXT,                       -- Notas adicionales
  created_at INTEGER NOT NULL,      -- Timestamp de creación
  updated_at INTEGER NOT NULL,      -- Timestamp de última actualización
  deleted_at INTEGER                -- Timestamp de eliminación (soft delete)
);
```

#### Tabla `sale_items`
```sql
CREATE TABLE sale_items (
  id TEXT PRIMARY KEY,              -- UUID único
  sale_id TEXT NOT NULL,            -- Referencia a sales.id
  product_id TEXT NOT NULL,         -- Referencia a products.id
  quantity INTEGER NOT NULL,        -- Cantidad vendida
  unit_price REAL NOT NULL,         -- Precio unitario al momento de la venta
  created_at INTEGER NOT NULL,      -- Timestamp de creación
  updated_at INTEGER NOT NULL,      -- Timestamp de última actualización
  deleted_at INTEGER,               -- Timestamp de eliminación (soft delete)
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Componentes Clave

#### Local Database Client (`local-db.ts`)
- Inicialización de SQLite en WebAssembly
- Operaciones CRUD optimizadas
- Manejo de transacciones locales
- Cache de queries frecuentes

#### Cloud Database Client (`cloud-db.ts`)
- Conexión a PostgreSQL/Turso
- Operaciones batch para sync
- Retry logic para conexiones inestables
- Compresión de datos para transferencia

#### Sync Engine (`sync.ts`)
- Orchestrador de sincronización bidireccional
- Detección inteligente de conflictos
- Queue de operaciones offline
- Resumption de sync interrumpida

#### Sales Service (`sales-service.ts`)
- Lógica de negocio para ventas
- Validaciones de stock
- Cálculo de totales
- Generación de reportes

#### Offline Sync Hook (`use-offline-sync.ts`)
- Estado de conectividad
- Trigger automático de sync
- Indicadores de estado para UI
- Error handling y retry

### Configuraciones Importantes

#### Next.js Configuration (`next.config.ts`)
```typescript
// Configuración para WebAssembly
const nextConfig = {
  webpack: (config) => {
    // Soporte para .wasm files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true
    };
    return config;
  }
};
```

#### Drizzle Configuration (`drizzle.config.ts`)
```typescript
// Configuración dual para local y cloud
export default {
  schema: "./src/lib/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql", // Para cloud
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!
  }
};
```

### Patrones de Diseño Utilizados

#### 1. Repository Pattern
- Abstracción de acceso a datos
- Interfaz consistente para local y cloud
- Facilita testing con mocks

#### 2. Observer Pattern
- Hooks reactivos para cambios de estado
- Notificaciones de sync status
- Updates automáticos de UI

#### 3. Command Pattern
- Queue de operaciones offline
- Undo/Redo de operaciones
- Batch processing de syncs

#### 4. Factory Pattern
- Creación de clientes de BD
- Configuración según ambiente
- Lazy loading de recursos

### Performance y Optimizaciones

#### Local Database
- Índices optimizados para queries frecuentes
- Prepared statements para operaciones repetitivas
- Connection pooling para WebWorkers

#### Sync Engine
- Chunking de datos grandes
- Compresión de payloads
- Debouncing de sync triggers

#### UI/UX
- Optimistic updates
- Loading states informativos
- Error boundaries para recuperación

#### SQLite Worker (`public/sqlite-worker.js`)
**Propósito**: Ejecutar SQLite en un Web Worker para no bloquear el hilo principal

**Características**:
- Carga SQLite WebAssembly
- Maneja todas las operaciones de BD en background
- Comunicación via postMessage
- Transacciones atómicas
- Persistencia automática

**Flujo de Operaciones**:
1. Main thread envía query al worker
2. Worker ejecuta operación en SQLite
3. Worker retorna resultado al main thread
4. UI se actualiza con los datos

### Decisiones Técnicas Clave

#### 1. ¿Por qué Local-First?
- **Confiabilidad**: Funciona sin internet
- **Performance**: Sin latencia de red
- **Experiencia**: Respuesta instantánea
- **Costs**: Reduce calls a APIs externas

#### 2. ¿Por qué SQLite + PostgreSQL?
- **SQLite**: Máximo rendimiento local, zero-latency
- **PostgreSQL**: Robustez para datos críticos, análisis
- **Sync**: Lo mejor de ambos mundos

#### 3. ¿Por qué WebAssembly para SQLite?
- **Rendimiento**: Cerca del rendimiento nativo
- **Portabilidad**: Funciona en cualquier navegador moderno
- **Confiabilidad**: Sin dependencia de IndexedDB quirks

#### 4. ¿Por qué Drizzle ORM?
- **Type Safety**: Tipos generados desde schema
- **Performance**: Queries optimizadas
- **Developer Experience**: Intellisense completo
- **Flexibility**: SQL directo cuando sea necesario

### Workflows y Procesos

#### Desarrollo de Features
1. **Planificación**: TS-Architect-GPT5 para decisiones arquitectónicas
2. **Implementación**: TS-Sonnet-4-COD para código TypeScript strict
3. **Testing**: Jest-Master para cobertura mínima 90%
4. **Documentación**: Docs-PRO para JSDoc técnico
5. **Refactoring**: Refactor-PRO manteniendo tests passing

#### Testing y QA
- Tests unitarios para servicios de negocio
- Tests de integración para sincronización
- Tests E2E para flujos principales
- Cobertura mínima 90%

#### Deployment
- Build de Next.js optimizado
- Headers CORS para SQLite WASM
- Variables de entorno para Turso
- Monitoring de sincronización

### Plan de Deployment a Cloudflare Pages

#### Archivos de Configuración Creados
- **`public/_headers`**: Headers CORS para SQLite WASM y SharedArrayBuffer
- **`functions/_middleware.ts`**: Fallback headers para respuestas HTML dinámicas
- **`.env.cloudflare.example`**: Template de variables de entorno
- **`DEPLOYMENT_CHECKLIST.md`**: Guía completa paso a paso

#### Dependencias Agregadas
```json
{
  "devDependencies": {
    "@cloudflare/next-on-pages": "^1",
    "wrangler": "^3"
  }
}
```

#### Scripts de Deployment
```json
{
  "scripts": {
    "pages:build": "npx @cloudflare/next-on-pages@1",
    "pages:deploy": "npx wrangler pages deploy .vercel/output/static --project-name=pos-miniveci"
  }
}
```

#### Variables de Entorno Requeridas
- `TURSO_DATABASE_URL`: URL de la base de datos Turso
- `TURSO_AUTH_TOKEN`: Token de autenticación (como Secret)
- `NODE_ENV`: production/preview
- `NEXT_PUBLIC_APP_ENV`: production/preview

#### Headers CORS Críticos
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin (para worker/wasm)
```

#### Comandos de Deployment
```bash
# Instalar dependencias
npm install

# Build local
npm run pages:build

# Deploy manual
npm run pages:deploy

# Preview local
npx wrangler pages dev .vercel/output/static --port 3001
```

---

*Este archivo proporciona el contexto completo para entender rápidamente el proyecto POS MiniVeci y facilitar el desarrollo futuro.*
