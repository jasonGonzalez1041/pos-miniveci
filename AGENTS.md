# CONTEXTO DEL PROYECTO

Estoy desarrollando **VeciPOS**, un sistema POS (Point of Sale) local-first para pequeños negocios en Latinoamérica. Este es un proyecto CRÍTICO donde la **VELOCIDAD es MÁXIMA PRIORIDAD**.

## PRIORIDADES DEL NEGOCIO (en orden):
1. **POS (VeciPOS)** - PRIORIDAD #1 - Debe estar listo lo más rápido posible
2. **APP Móvil** - En desarrollo paralelo (Cristian)
3. **Tienda Online** - Se desarrollará después del POS

**IMPORTANTE**: El cliente (Kevin) enfatiza que necesita el POS funcionando PRIMERO porque:
- Sin POS no hay inventario que sincronizar
- La tienda online depende del inventario del POS
- Los clientes necesitan facturar RÁPIDO (competencia "Desing" es muy lenta)

## ECOSISTEMA DE PRODUCTOS

### VeciPOS (POS System)
- **Dominio**: posveci.com (producción) / pos-veci.vercel.app (desarrollo)
- **Propósito**: Sistema de punto de venta para negocios físicos
- **Características clave**:
  - Offline-first (funciona sin internet)
  - Facturación instantánea (sin tiempos de carga)
  - Gestión de inventario en tiempo real
  - Sincronización automática con la nube

### Tienda Online
- **Dominio**: shop.posveci.com o posveci.com/tienda (TBD)
- **Propósito**: E-commerce que consume inventario del POS
- **Estado**: Pendiente, se desarrollará después del POS

### APP Móvil
- **Responsable**: Cristian
- **Integración**: Comparte BD con POS

## MERCADO OBJETIVO
- **Región**: Toda Latinoamérica
- **Rubros**:
  - Minimarkets
  - Botillerías (licorerías)
  - Carnicerías
  - Panaderías
- **Nombre "Veci"**: Viene de "Vecino" - palabra universal en Latinoamérica

---

# AGENTS.md - VeciPOS Development Guide

## Project Overview

**VeciPOS** is a local-first Point of Sale system for small businesses in Latin America, built with Next.js 15, TypeScript, and libSQL. The system works completely offline with automatic synchronization when online.

### Key Technologies
- **Frontend**: Next.js 15 + React 19 + TypeScript 5+ (strict mode)
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Database**: Dual database architecture
  - **Client**: libSQL (WebAssembly-based SQLite for browser)
  - **Backend**: Turso (managed libSQL cloud database)
- **ORM**: Drizzle ORM with type-safe operations
- **Testing**: Vitest + Testing Library + MSW for mocking
- **Deployment**: Vercel (optimal Next.js integration) + Cloudflare R2 storage
- **Build**: Hybrid - Static where possible, dynamic for real-time features

## Architecture Patterns

### Database Strategy
- **Local-First**: libSQL via WebAssembly for offline operations in browser
- **Cloud Sync**: Turso (managed libSQL) for backup and multi-device sync
- **Dual Operations**: All database operations use `dual-db-operations.ts` for automatic local + cloud persistence
- **Conflict Resolution**: Last-write-wins with timestamp-based resolution
- **Soft Deletes**: Use `deletedAt` timestamp instead of hard deletes
- **Performance**: Optimized for **instant reads** - no loading delays on critical operations (checkout, inventory lookup)

### Performance Requirements (CRITICAL)
**Speed is the #1 differentiator** - Our competitor "Desing" is slow; we must be instant.

#### Critical Performance Targets:
- **Checkout flow**: < 100ms from scan to display
- **Product search**: < 50ms response time
- **Invoice generation**: Instant (< 200ms)
- **UI interactions**: 60fps minimum, no jank
- **Initial load**: < 2s on average hardware
- **Offli/**: 0ms network delay (local-first)

#### Optimization Strategies:
- Aggressive memoization with React.memo
- Virtual scrolling for large product lists
- Indexed product search (Fuse.js or similar)
- Preload common operations
- Web Workers for heavy calculations
- Optimistic UI updates (show before sync)
- Keep hot data in memory cache

### File Structure Conventions
```
src/
app/                    # Next.js App Router
  (pos)/                # POS routes (grouped)
    checkout/           # Checkout/billing flow
    inventory/          # Inventory management
    sales/              # Sales history
  (shop)/               # Future: Online store routes
  api/
    sync/               # Turso sync endpoints
    webhooks/           # External integrations
components/
  ui/
    pos/                # POS-specific components
    shared/             # Shared with future shop
lib/
  db/
    libsql/             # Client-side libSQL setup
    turso/              # Backend Turso connection
    dual-ops.ts         # Dual database operations
  r2/                   # Cloudflare R2 image handling
  services/
    pos/                # POS business logic
    sync/               # Sync service
hooks/
  use-pos-cart.ts       # Shopping cart hook
  use-inventory.ts      # Inventory operations
workers/
  sync.worker.ts        # Background sync
  invoice.worker.ts     # Invoice generation
__tests__/              # Test files (mirrors src structure)
```

## TypeScript Guidelines

### Strict Configuration
- Always use TypeScript strict mode (`strict: true`)
- Enable additional strict checks:
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
  - `noImplicitOverride: true`
- Use type inference over explicit typing when possible
- Import types with `import type { }` for type-only imports

### Database Types
- Use Drizzle's inferred types from schema definitions
- Export types from `schema.ts`: `Product`, `NewProduct`, etc.
- Always type database operations with proper return types

```typescript
// ✅ Good - Use inferred types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// ✅ Good - Properly typed operation
async function getProducts(): Promise<Product[]> {
  return await libsqlClient.select().from(products);
}
```

## Component Development

### React Component Patterns
- **Client Components**: Mark with `'use client'` at top of file
- **Server Components**: Default - no client directive needed
- **Memoization**: Use `React.memo` for ALL POS components (performance critical)
- **Hooks**: Extract complex logic to custom hooks

### UI Component Guidelines
- All shadcn/ui components are client components
- Use compound component pattern for complex UI
- Implement proper accessibility (ARIA labels, keyboard navigation)
- Use consistent spacing with Tailwind classes
- **Keyboard shortcuts**: Essential for fast POS operation (F keys, number pad)

```tsx
// ✅ Good - Memoized POS component with keyboard support
'use client';

import { memo, useCallback } from 'react';
import type { Product } from '@/lib/db/schema';
import { useHotkeys } from '@/hooks/use-hotkeys';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({ 
  product, 
  onAdd 
}: ProductCardProps) {
  const handleAdd = useCallback(() => {
    onAdd(product);
  }, [product, onAdd]);

  // F1 para agregar rápido
  useHotkeys('F1', handleAdd);

  return (
    <div className="product-card">
      {/* UI implementation */}
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
```

## Database Operations

### Dual Database Pattern (libSQL + Turso)
- **Client**: libSQL running in browser via WebAssembly
- **Backend**: Turso (managed libSQL in the cloud)
- Always use functions from `dual-db-operations.ts`
- Never directly call `libsqlClient` or `tursoClient` from components
- Operations automatically handle local + cloud persistence
- Include proper error handling for offline scenarios

```typescript
// ✅ Good - Use dual operations
import { insertProductDual } from '@/lib/db/dual-ops';

const product = await insertProductDual({
  name: 'Coca Cola 2L',
  price: 2500, // CLP
  stock: 10,
  barcode: '7891234567890'
});

// ❌ Bad - Direct database access
const product = await libsqlClient.insert(products).values({...});
```

### Implementación de Operaciones Duales - MISMO CÓDIGO Drizzle
**PRINCIPIO FUNDAMENTAL**: Usar el MISMO código de Drizzle ORM para ejecutar consultas en local (libSQL) y cloud (Turso). **NO duplicar sentencias SQL**.

#### Ejemplo de Implementación Correcta:
```typescript
// lib/db/dual-ops.ts
import { libsqlClient } from './libsql/client';
import { tursoClient } from './turso/client';
import { products } from './schema';
import type { NewProduct, Product } from './schema';

/**
 * Ejecuta la MISMA operación Drizzle en ambas bases de datos
 * @param operation - Función que recibe un cliente Drizzle y retorna una promesa
 */
async function executeDual<T>(
  operation: (db: typeof libsqlClient) => Promise<T>
): Promise<T> {
  // Ejecutar en local PRIMERO (sincrónico para el usuario)
  const localResult = await operation(libsqlClient);
  
  // Ejecutar en cloud en BACKGROUND (no bloquear UI)
  operation(tursoClient).catch(err => {
    console.error('Cloud sync failed, will retry:', err);
    // Aquí va la lógica de retry queue
  });
  
  return localResult;
}

/**
 * CORRECTO: Una sola función, MISMO código Drizzle para ambas BDs
 */
export async function insertProductDual(data: NewProduct): Promise<Product> {
  return executeDual(async (db) => {
    const [product] = await db
      .insert(products)
      .values(data)
      .returning();
    return product;
  });
}

export async function updateProductDual(
  id: string, 
  data: Partial<NewProduct>
): Promise<Product> {
  return executeDual(async (db) => {
    const [product] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  });
}

export async function getProductByBarcode(barcode: string): Promise<Product | undefined> {
  // Operaciones de lectura SOLO en local (más rápido)
  return await libsqlClient
    .select()
    .from(products)
    .where(eq(products.barcode, barcode))
    .limit(1)
    .then(rows => rows[0]);
}
```

#### Ventajas de este Patrón:
1. **DRY (Don't Repeat Yourself)**: Una sola definición de la operación
2. **Consistencia Garantizada**: Misma lógica en ambas BDs
3. **Fácil Mantenimiento**: Cambios en un solo lugar
4. **Type Safety**: TypeScript valida la operación una sola vez
5. **Performance**: Operación local no espera a la cloud

#### Reglas de Oro:
- **ESCRITURAS**: Siempre usar `executeDual()` (local + cloud)
- **LECTURAS**: Solo local (libsqlClient directo) - más rápido
- Una función `executeDual()` genérica que recibe operaciones Drizzle
- NUNCA duplicar código de consultas Drizzle
- NUNCA escribir SQL raw diferente para cada BD

#### Ejemplo de Uso en Componentes:
```typescript
// components/pos/add-product-form.tsx
'use client';

import { insertProductDual } from '@/lib/db/dual-ops';

export function AddProductForm() {
  const handleSubmit = async (data: NewProduct) => {
    // Una sola función, escribe en ambas BDs
    const product = await insertProductDual(data);
    // UI se actualiza instantáneamente con resultado local
    toast.success('Producto agregado');
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Schema Conventions
- Use `text` primary keys with ULID generation (better than UUID for sorting)
- Include `createdAt`, `updatedAt`, `deletedAt` timestamps
- Use enums for status fields: `{ enum: ['active', 'inactive'] }`
- Add sync metadata: `synced`, `lastSyncedAt`, `deviceId`
- Add indexes for barcode, SKU, and frequently searched fields

## Testing Standards

### Test Structure
- Mirror `src/` structure in `__tests__/`
- Use descriptive test names: `should process checkout in under 100ms`
- Test all component states: default, loading, error, success
- Include accessibility tests
- **Performance tests**: Critical for POS operations

### Testing Patterns
```typescript
// ✅ Good - Performance test for critical operation
describe('CheckoutFlow', () => {
  it('should complete checkout in under 200ms', async () => {
    const startTime = performance.now();
    
    const { result } = renderHook(() => useCheckout());
    
    await act(async () => {
      await result.current.processCheckout(mockCart);
    });
    
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(200);
  });

  it('should work offline', async () => {
    // Simulate offline
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    
    const { result } = renderHook(() => useCheckout());
    
    await act(async () => {
      await result.current.processCheckout(mockCart);
    });
    
    expect(result.current.invoice).toBeDefined();
    expect(result.current.syncStatus).toBe('queued');
  });
});
```

## Performance Guidelines

### Critical Optimizations for POS
1. **Product Search**:
   - Use Fuse.js or similar for fuzzy search
   - Index by: name, barcode, SKU, category
   - Keep index in memory
   - Update index on background thread

2. **Cart Operations**:
   - Keep cart in memory (not IndexedDB for every update)
   - Use Zustand or similar for cart state
   - Persist to libSQL only on checkout

3. **Invoice Generation**:
   - Use Web Worker to avoid blocking UI
   - Pre-render common invoice templates
   - Generate PDF in background

4. **Image Loading**:
   - Tiny thumbnails (< 5KB) for product list
   - Lazy load product detail images
   - Use Cloudflare R2 transforms for optimization

### Bundle Optimization
- Dynamic imports for admin/settings (not critical path)
- Code split by route
- Preload checkout flow components
- Use Web Workers for CPU-intensive operations

## Cloudflare Integration

### R2 Image Storage
- Store multiple image sizes: thumb (150x150), medium (600x600), large (1200x1200)
- Use WebP format for better compression
- Implement lazy loading with Next.js Image
- Include fallback URLs for offline scenarios
- **Optimization**: Serve optimized images from R2 CDN

## Vercel Deployment

### Why Vercel?
- Built by Next.js creators (optimal integration)
- Edge network for low latency across Latinoamérica
- Automatic preview deployments
- Superior developer experience

### Configuration
```typescript
// next.config.ts
export default {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['r2.posveci.com'],
    formats: ['image/webp', 'image/avif'],
  },
  // Hybrid rendering for optimal performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@/components/ui'],
  },
};
```

## Security Best Practices

### Authentication
- Use bcrypt for password hashing
- Implement proper session management
- Validate all inputs with Zod schemas
- Use HTTPS only in production

### Data Protection
- Sanitize all user inputs
- Implement proper CORS policies
- Use environment variables for sensitive data
- Regular security audits with automated tools

## Development Workflow

### Scripts Usage
```bash
# Development
npm run dev          # Start Next.js + compile workers
npm run dev:fast     # Next.js only (UI work)

# Database
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate:local # Apply migrations to libSQL
npm run db:migrate:turso # Apply migrations to Turso
npm run db:studio    # Open Drizzle Studio

# Testing
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:perf    # Performance benchmarks
npm run test:coverage # Coverage report (target: >90%)

# Build & Deploy
npm run build        # Production build
npm run deploy       # Deploy to Vercel
```

### Git Workflow
- Use conventional commits: `feat:`, `fix:`, `perf:`, `test:`
- Create feature branches: `feature/fast-checkout`
- **Always include performance impact** in PR description
- Update documentation for significant changes

## Cloudflare Integration

### R2 Image Storage
- Store multiple image sizes automatically:
  - `imageThumb`: 150x150px (~10KB) for cart/lists
  - `imageMedium`: 600x600px (~50KB) for product cards
  - `imageLarge`: 1200x1200px (~150KB) for detail views
  - `imageOriginal`: WordPress fallback URL
- Use WebP format for optimal compression
- Implement lazy loading with Next.js Image component
- Include fallback URLs for offline scenarios
- Images sync from WooCommerce products automatically

### Pages Deployment
- Static export configuration in `next.config.ts`
- Custom headers in `public/_headers` for security
- Environment variables via Cloudflare dashboard
- Automatic deployment via `npm run pages:deploy`
- Preview deployments with `npm run preview`

## Environment Setup

### Required Environment Variables
```bash
# Turso Database (Backend)
TURSO_DATABASE_URL=    # Turso database URL
TURSO_AUTH_TOKEN=      # Turso auth token

# Cloudflare R2 (Images)
R2_ACCESS_KEY_ID=      # R2 access key
R2_SECRET_ACCESS_KEY=  # R2 secret key
R2_BUCKET_NAME=        # R2 bucket name
R2_ENDPOINT=           # R2 endpoint URL
R2_PUBLIC_URL=         # Public CDN URL

# App Config
NEXT_PUBLIC_APP_URL=   # https://posveci.com
NEXT_PUBLIC_API_URL=   # API endpoint
```

### Database Schema
Key tables with sync metadata:

```sql
-- Products (synced from WooCommerce)
CREATE TABLE products (
  id TEXT PRIMARY KEY,           -- woo-123 format
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER DEFAULT 0,
  stock_status TEXT DEFAULT 'instock',
  
  -- Multi-size images (Cloudflare R2)
  image_thumb TEXT,              -- 150x150
  image_medium TEXT,             -- 600x600
  image_large TEXT,              -- 1200x1200
  image_original TEXT,           -- WordPress fallback
  
  -- Sync control
  synced INTEGER DEFAULT 0,
  last_synced_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);

-- Sales with embedded items (JSON)
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  sale_number INTEGER UNIQUE,
  user_id TEXT NOT NULL,
  items TEXT NOT NULL,           -- JSON array
  subtotal REAL NOT NULL,
  tax REAL NOT NULL,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  
  -- WooCommerce sync
  synced_to_woo INTEGER DEFAULT 0,
  woo_order_id TEXT,
  
  created_at INTEGER,
  updated_at INTEGER
);

-- Cart items (temporary)
CREATE TABLE cart_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,                    -- imageMedium URL
  unit_price REAL NOT NULL,
  quantity INTEGER DEFAULT 1,
  subtotal REAL NOT NULL,
  created_at INTEGER
);

-- Users with role-based access
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,   -- bcrypt
  name TEXT,
  role TEXT DEFAULT 'cashier',   -- admin, cashier, viewer
  active INTEGER DEFAULT 1,
  created_at INTEGER,
  updated_at INTEGER
);
```

## Offline-First Architecture

### Local Storage Strategy
- **SQLite WASM**: Primary storage via `sql-wasm.js` and `sqlite-worker.js`
- **IndexedDB**: Fallback for large data and file caching
- **Web Workers**: Background sync and heavy operations
- **Memory Cache**: React state for active UI data

### Sync Mechanisms
- **Dual DB Operations**: All writes go to local + cloud simultaneously
- **Optimistic Updates**: UI updates immediately, sync in background
- **Conflict Resolution**: Last-write-wins with timestamp comparison
- **Incremental Sync**: Only changed records since `lastSyncTimestamp`
- **Retry Logic**: Failed operations queued for retry when online

### Network State Management
```typescript
// ✅ Use useNetworkState hook
const { isOnline, isSlowConnection } = useNetworkState();

// ✅ Queue operations when offline
if (!isOnline) {
  await queueForSync(operation);
  showOfflineNotification();
} else {
  await performOperation();
}
```

## Essential Hooks

### Core POS Hooks
- **`usePosCart`**: Cart state management with persistence
- **`useOfflineSync`**: Background sync coordination
- **`useNetworkState`**: Online/offline detection
- **`useHotkeysPos`**: Keyboard shortcuts for POS operations
- **`useMobile`**: Mobile/tablet responsive behavior

### Hook Patterns
```typescript
// ✅ Good - Custom hook with loading states
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const refreshProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProductsDual();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);
  
  return { products, loading, error, refreshProducts };
}

// ✅ Good - Memoized callback for performance
const handleAddToCart = useCallback((product: Product) => {
  addToCart(product);
  showNotification(`${product.name} agregado al carrito`);
}, [addToCart, showNotification]);
```

## Common Patterns

### Error Handling
- Use try/catch blocks for all async operations
- Provide fallback UI for error states with retry options
- Log errors for debugging but show user-friendly messages
- Implement error boundaries for component tree protection
- Use toast notifications for operation feedback

### Component Architecture
- **Server Components**: Default for static content and layouts
- **Client Components**: Mark with `'use client'` for interactivity
- **Compound Components**: Complex UI like modals, dropdowns
- **Render Props**: For flexible, reusable logic sharing
- **Memoization**: Use `React.memo` for expensive re-renders

### Performance Optimization
```typescript
// ✅ Good - Memoized expensive component
const ProductGrid = memo(function ProductGrid({ 
  products, 
  onProductSelect 
}: ProductGridProps) {
  const virtualizer = useVirtual({
    size: products.length,
    estimateSize: useCallback(() => 200, [])
  });
  
  return (
    <div className="grid">
      {virtualizer.virtualItems.map(virtualRow => (
        <ProductCard 
          key={products[virtualRow.index]?.id}
          product={products[virtualRow.index]}
          onAdd={onProductSelect}
        />
      ))}
    </div>
  );
});

// ✅ Good - Optimized image loading
function ProductImage({ product }: { product: Product }) {
  return (
    <Image
      src={product.imageMedium || '/placeholder.webp'}
      alt={product.name}
      width={600}
      height={600}
      loading="lazy"
      unoptimized // Required for static export
      onError={(e) => {
        e.currentTarget.src = product.imageOriginal || '/placeholder.webp';
      }}
    />
  );
}
```

## Important Files Reference

### Core Configuration
- **`next.config.ts`**: Static export config for Cloudflare Pages
- **`drizzle.config.ts`**: Turso database connection and migrations
- **`vitest.config.ts`**: Testing framework setup with jsdom
- **`components.json`**: shadcn/ui configuration (New York style)
- **`tsconfig.json`**: Strict TypeScript with additional safety checks

### Database Layer
- **`src/lib/db/schema.ts`**: All table definitions with types
- **`src/lib/db/dual-db-operations.ts`**: Offline-first CRUD operations
- **`src/lib/db/local-db.ts`**: SQLite WASM client setup
- **`src/lib/db/cloud-db.ts`**: Turso cloud database client
- **`src/lib/db/sync.ts`**: Bidirectional sync logic

### Key Workers
- **`public/sqlite-worker.js`**: Compiled SQLite WebAssembly worker
- **`scripts/compile-worker-simple.js`**: Worker compilation script
- **`src/workers/sqlite-worker.ts`**: TypeScript worker source

### Essential Components
- **`src/components/ui/pos/`**: POS-specific UI components
- **`src/hooks/use-pos-cart.ts`**: Cart state management
- **`src/hooks/use-offline-sync.ts`**: Background synchronization
- **`src/__tests__/setup.ts`**: Global test configuration and mocks

### Build & Deploy
- **`public/_headers`**: Cloudflare security headers
- **`scripts/deploy-to-cloudflare.sh`**: Deployment automation
- **`wrangler.toml`**: Cloudflare Pages configuration

## Security Guidelines

### Authentication
- Use bcryptjs for password hashing with salt rounds ≥12
- Implement role-based access: admin, cashier, viewer
- Store JWTs securely, never in localStorage
- Validate all inputs with Zod schemas
- Use HTTPS only in production

### Data Protection
- Sanitize all user inputs to prevent XSS
- Use parameterized queries to prevent SQL injection
- Implement CORS policies in `public/_headers`
- Environment variables for sensitive data only
- Regular security audits with `npm audit`

### Cloudflare Security Headers
```
# public/_headers
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

## Best Practices Summary

### Code Quality
- Use TypeScript strict mode with additional safety checks
- Write comprehensive tests targeting >90% coverage
- Document complex functions with JSDoc comments
- Use ESLint and Prettier for code consistency
- Follow conventional commits: `feat:`, `fix:`, `test:`, `docs:`

### Performance
- Optimize images with Cloudflare R2 multi-size storage
- Use React.memo for expensive component re-renders
- Implement virtual scrolling for large product lists
- Lazy load components with dynamic imports
- Monitor bundle size and Core Web Vitals

### User Experience
- Design offline-first with immediate UI feedback
- Use skeleton screens for loading states
- Implement proper error boundaries with retry actions
- Provide clear offline indicators and sync status
- Support keyboard shortcuts for power users

### Database Operations
- Always use dual operations from `dual-db-operations.ts`
- Never call `localDb` or `cloudDb` directly from components
- Use soft deletes with `deletedAt` timestamps
- Include sync metadata in all tables
- Handle offline scenarios gracefully with queuing

---

**🚀 Quick Start Checklist:**
1. `npm install` - Install dependencies
2. `npm run db:migrate` - Setup database schema
3. `npm run dev` - Start development server
4. `npm run test` - Verify everything works
5. Check `http://localhost:3000` - POS interface should load

## Common Patterns

### Custom Hooks for POS Operations
```typescript
// hooks/use-pos-cart.ts
export function usePOSCart() {
  const addItem = useCallback((product: Product, quantity = 1) => {
    // Optimistic update - instant UI feedback
    setCart(prev => [...prev, { product, quantity }]);
    
    // Background persistence (no await - don't block UI)
    persistCartToLibSQL(cart).catch(console.error);
  }, []);

  return { cart, addItem, removeItem, clear };
}
```

### Error Handling
- Use try/catch blocks for async operations
- Provide fallback UI for error states
- Log errors for debugging
- Show user-friendly error messages in Spanish

### Offline Support
- Check network state with `useNetworkState` hook
- Queue operations when offline
- Sync automatically when online
- Provide offline indicators to users
- **Critical**: POS must work 100% offline

## Localization (Spanish for Latin America)
- All UI text in Spanish
- Currency: Support CLP (Chile), USD, and other LATAM currencies
- Date format: DD/MM/YYYY
- Number format: Use dot for thousands, comma for decimals (Chilean standard)

## Best Practices Summary

### Code Quality
- TypeScript strict mode always
- Comprehensive tests (>90% coverage)
- Document complex functions with JSDoc
- ESLint + Prettier for consistency

### Performance (CRITICAL)
- **Every millisecond counts in checkout flow**
- Optimize images and lazy load content
- Use memoization aggressively
- Implement proper caching strategies
- Monitor bundle size and Core Web Vitals
- **Benchmark against competitor "Desing"** - we must be faster

### User Experience
- Design offline-first interactions
- Provide **instant** feedback for actions
- Use skeleton screens for loading states
- Implement proper error boundaries
- Keyboard shortcuts for power users
- **Zero tolerance for lag** in critical operations

---

## INSTRUCCIONES PARA ROVO/CLINE

Al trabajar en este proyecto:

1. **PRIORIZA VELOCIDAD**: Si tienes que elegir entre una feature linda y una rápida, elige rápida.
2. **PIENSA LOCAL-FIRST**: Toda operación crítica debe funcionar offline.
3. **MIDE PERFORMANCE**: Usa `performance.now()` para medir operaciones críticas.
4. **OPTIMIZA AGRESIVAMENTE**:
   - Memoiza todo en componentes POS
   - Usa Web Workers para operaciones pesadas
   - Mantén datos calientes en memoria
5. **TESTING EXHAUSTIVO**:
   - Tests unitarios para lógica de negocio
   - Tests de integración para flujos completos
   - Tests de performance para operaciones críticas
   - Tests offline para sincronización
6. **DOCUMENTA DECISIONES**: Especialmente decisiones de performance y arquitectura.
7. **ESPAÑOL**: Toda la UI y mensajes deben estar en español (es para Latinoamérica).

*Keep this guide updated as the project evolves. Document new patterns and architectural decisions.*