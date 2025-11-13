# AGENTS.md - POS MiniVeci Development Guide

## Project Overview

**POS MiniVeci** is a local-first Point of Sale system for small businesses built with Next.js 15, TypeScript, and SQLite. The system works completely offline with automatic synchronization when online.

### Key Technologies
- **Frontend**: Next.js 15 + React 19 + TypeScript 5+ (strict mode)
- **UI Framework**: Tailwind CSS + shadcn/ui components (New York style)
- **Database**: Dual database architecture (SQLite local + Turso PostgreSQL cloud)
- **ORM**: Drizzle ORM with type-safe operations
- **Image Storage**: Cloudflare R2 with multi-size optimization
- **Testing**: Vitest + Testing Library + MSW for mocking
- **Deployment**: Cloudflare Pages with static export
- **Build**: Static export (`output: 'export'`) for edge deployment
- **Authentication**: bcryptjs with role-based access control
- **Offline Support**: IndexedDB + Web Workers + SQLite WASM

## Architecture Patterns

### Database Strategy
- **Local-First**: SQLite via WebAssembly for offline operations
- **Cloud Sync**: PostgreSQL (Turso) for backup and multi-device sync
- **Dual Operations**: All database operations use `dual-db-operations.ts` for automatic local + cloud persistence
- **Conflict Resolution**: Last-write-wins with timestamp-based resolution
- **Soft Deletes**: Use `deletedAt` timestamp instead of hard deletes

### File Structure Conventions
```
src/
├── app/                    # Next.js App Router
│   ├── pos/               # POS-specific routes
│   └── api/webhooks/      # WooCommerce webhook handlers
├── components/            # Reusable components
│   └── ui/               # shadcn/ui components (all 'use client')
│       └── pos/          # POS-specific UI components
├── lib/                  # Core utilities
│   ├── db/               # Database layer
│   ├── r2/               # Cloudflare R2 image handling
│   └── services/         # Business logic services
├── hooks/                # Custom React hooks
├── workers/              # Web Workers for heavy operations
└── __tests__/            # Test files (mirrors src structure)
```

### TypeScript Guidelines

### Strict Configuration
- Always use TypeScript strict mode (`strict: true`)
- Enable additional strict checks:
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
  - `noImplicitOverride: true`
  - `verbatimModuleSyntax: true`
  - `moduleDetection: "force"`
- Use type inference over explicit typing when possible
- Import types with `import type { }` for type-only imports
- Target ES2022 with bundler module resolution
- Never use `allowJs: false` - keep strict TypeScript only

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
  return await localDb.select().from(products);
}
```

## Component Development

### React Component Patterns
- **Client Components**: Mark with `'use client'` at top of file
- **Server Components**: Default - no client directive needed
- **Memoization**: Use `React.memo` for expensive components
- **Hooks**: Extract complex logic to custom hooks

### UI Component Guidelines
- All shadcn/ui components are client components
- Use compound component pattern for complex UI
- Implement proper accessibility (ARIA labels, keyboard navigation)
- Use consistent spacing with Tailwind classes

```tsx
// ✅ Good - Memoized component with proper types
'use client';

import { memo } from 'react';
import type { Product } from '@/lib/db/schema';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export const ProductCard = memo(function ProductCard({ 
  product, 
  onAdd 
}: ProductCardProps) {
  // Component implementation
});

ProductCard.displayName = 'ProductCard';
```

## Database Operations

### Dual Database Pattern
- Always use functions from `dual-db-operations.ts`
- Never directly call `localDb` or `cloudDb` from components
- Operations automatically handle local + cloud persistence
- Include proper error handling for offline scenarios

```typescript
// ✅ Good - Use dual operations
import { insertProductDual } from '@/lib/db/dual-db-operations';

const product = await insertProductDual({
  name: 'Test Product',
  price: 100,
  stock: 10
});

// ❌ Bad - Direct database access
const product = await localDb.insert(products).values({...});
```

### Schema Conventions
- Use `text` primary keys with UUID generation
- Include `createdAt`, `updatedAt`, `deletedAt` timestamps
- Use enums for status fields: `{ enum: ['value1', 'value2'] }`
- Add sync metadata: `synced`, `lastSyncedAt`

## Testing Standards

### Test Structure
- Mirror `src/` structure in `__tests__/`
- Use descriptive test names: `should handle click with loading state`
- Test all component states: default, loading, error, success
- Include accessibility tests

### Testing Patterns
- Mirror `src/` structure in `__tests__/` directory
- Use descriptive test names: `should handle click with loading state`
- Test all component states: default, loading, error, success
- Include accessibility tests with proper ARIA roles
- Test user interactions with `@testing-library/user-event`
- Mock Web Workers, IndexedDB, and external APIs in `setup.ts`
- Target >90% code coverage with `npm run test:coverage`

```typescript
// ✅ Good - Complete component test
describe('ProductCard', () => {
  it('should render product information correctly', () => {
    const mockProduct: Product = {
      id: 'woo-123',
      name: 'Test Product', 
      price: 100,
      stock: 5,
      imageThumb: 'https://example.com/thumb.webp',
      imageMedium: 'https://example.com/medium.webp'
    };
    
    render(<ProductCard product={mockProduct} onAdd={vi.fn()} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockProduct.imageMedium);
  });

  it('should handle add to cart interaction', async () => {
    const mockOnAdd = vi.fn();
    const user = userEvent.setup();
    
    render(<ProductCard product={mockProduct} onAdd={mockOnAdd} />);
    
    const addButton = screen.getByRole('button', { name: /agregar al carrito/i });
    await user.click(addButton);
    
    expect(mockOnAdd).toHaveBeenCalledWith(mockProduct);
    expect(mockOnAdd).toHaveBeenCalledTimes(1);
  });

  it('should show out of stock state', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0, stockStatus: 'outofstock' };
    
    render(<ProductCard product={outOfStockProduct} onAdd={vi.fn()} />);
    
    expect(screen.getByText(/agotado/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should handle image loading errors', async () => {
    const productWithBrokenImage = { ...mockProduct, imageMedium: 'broken-url' };
    
    render(<ProductCard product={productWithBrokenImage} onAdd={vi.fn()} />);
    
    const image = screen.getByRole('img');
    fireEvent.error(image);
    
    // Should fallback to imageOriginal or placeholder
    expect(image).toHaveAttribute('src', expect.not.stringMatching('broken-url'));
  });
});

// ✅ Good - Hook testing
describe('usePosCart', () => {
  it('should add product to cart', () => {
    const { result } = renderHook(() => usePosCart());
    
    act(() => {
      result.current.addToCart(mockProduct);
    });
    
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(100);
  });
});

// ✅ Good - Database operation testing  
describe('dual-db-operations', () => {
  it('should handle offline scenario gracefully', async () => {
    // Mock cloud DB failure
    vi.mocked(cloudDb.insert).mockRejectedValue(new Error('Network error'));
    
    const product = await insertProductDual(mockProductData);
    
    expect(product).toBeDefined();
    expect(product.synced).toBe(false); // Not synced due to cloud failure
  });
});
```

### Mock Setup
- Use comprehensive mocks in `setup.ts`
- Mock IndexedDB, Workers, and external APIs
- Export reusable mock objects for test files

## Performance Guidelines

### Optimization Strategies
- Use `React.memo` for components that receive stable props
- Implement `useCallback` for event handlers passed to child components
- Use `useMemo` for expensive calculations
- Implement proper image optimization with Next.js Image component

### Bundle Optimization
- Use dynamic imports for heavy components
- Implement code splitting at route level
- Use Web Workers for CPU-intensive operations
- Optimize images with Cloudflare R2 transformations

## Cloudflare Integration

### R2 Image Storage
- Store multiple image sizes: thumb (150x150), medium (600x600), large (1200x1200)
- Use WebP format for better compression
- Implement lazy loading with Next.js Image
- Include fallback URLs for offline scenarios

### Pages Deployment
- Static export configuration in `next.config.ts`
- Custom headers in `public/_headers`
- Environment variables via Cloudflare dashboard
- Automatic deployment via GitHub Actions

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
npm run dev              # Start with worker compilation
npm run dev:next         # Next.js only (faster for UI work)
npm run build:worker     # Compile SQLite worker only

# Database Management
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Apply migrations to Turso
npm run db:studio        # Open Drizzle Studio
npm run db:seed          # Seed database with test data

# Testing & Quality
npm test                 # Run Vitest tests
npm run test:ci          # Run tests in CI mode
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report (>90% target)
npm run lint             # ESLint analysis
npm run type-check       # TypeScript validation

# Build & Deploy
npm run build            # Production build with static export
npm run build:cf         # Cloudflare-specific build
npm run pages:deploy     # Deploy to Cloudflare Pages
npm run preview          # Preview deployment locally
npm run verify:cf        # Verify Cloudflare deployment

# Data Management
npm run migrate:images   # Migrate images to R2
npm run sync:woo         # Manual WooCommerce sync
npm run test:r2          # Test R2 connection
```

### Development Workflow
```bash
# 1. Start development
npm run dev              # Compiles worker + starts Next.js

# 2. Make changes to components
npm run dev:next         # Faster reload for UI work

# 3. Test changes
npm run test:watch       # Auto-run tests
npm run lint             # Check code quality

# 4. Database changes
npm run db:generate      # Create migration
npm run db:migrate       # Apply to Turso
npm run db:studio        # Visual DB browser

# 5. Deploy
npm run build            # Static export
npm run pages:deploy     # To Cloudflare Pages
```

### Git Workflow
- Use conventional commits: `feat:`, `fix:`, `test:`, `docs:`
- Create feature branches: `feature/new-feature-name`
- Include tests with all PRs
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
# Turso Database (Primary Cloud DB)
TURSO_DATABASE_URL=          # Turso database URL
TURSO_AUTH_TOKEN=           # Turso auth token

# Cloudflare R2 (Image Storage)
R2_ACCESS_KEY_ID=           # R2 access key
R2_SECRET_ACCESS_KEY=       # R2 secret key
R2_BUCKET_NAME=             # R2 bucket name (e.g., pos-miniveci-images)
R2_ENDPOINT=                # R2 endpoint URL

# WooCommerce Integration (Optional)
WOO_URL=                    # WooCommerce site URL
WOO_KEY=                    # WooCommerce API key
WOO_SECRET=                 # WooCommerce API secret
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

*Keep this guide updated as the project evolves. Document new patterns and architectural decisions.*