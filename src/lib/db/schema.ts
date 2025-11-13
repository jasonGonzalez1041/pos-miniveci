import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Tabla de productos sincronizada desde WooCommerce
 */
export const products = sqliteTable('products', {
  id: text('id').primaryKey(), // woo-123 format for WooCommerce products
  name: text('name').notNull(),
  price: real('price').notNull(),
  stock: integer('stock').default(0),
  stockStatus: text('stock_status', { 
    enum: ['instock', 'outofstock', 'onbackorder'] 
  }).default('instock'),
  category: text('category'),
  
  // 🔥 IMÁGENES OPTIMIZADAS (Cloudflare R2)
  imageThumb: text('image_thumb'),       // 150x150, ~10KB
  imageMedium: text('image_medium'),     // 600x600, ~50KB
  imageLarge: text('image_large'),       // 1200x1200, ~150KB
  imageOriginal: text('image_original'), // URL WordPress (fallback)
  
  sku: text('sku').unique(),
  description: text('description'),
  unit: text('unit').default('UN'),
  
  // Control de sincronización
  synced: integer('synced', { mode: 'boolean' }).default(false),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

/**
 * Tabla de usuarios (autenticación)
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(), // bcrypt
  name: text('name'),
  role: text('role', { 
    enum: ['admin', 'cashier', 'viewer'] 
  }).default('cashier'),
  active: integer('active', { mode: 'boolean' }).default(true),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

/**
 * Tabla de carrito (temporal, se limpia después de facturar)
 */
export const cartItems = sqliteTable('cart_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull(), // Por si hay múltiples cajas
  productId: text('product_id').notNull(),
  name: text('name').notNull(),
  image: text('image'), // URL de imageMedium
  unitPrice: real('unit_price').notNull(),
  quantity: integer('quantity').notNull().default(1),
  subtotal: real('subtotal').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

/**
 * Tabla de ventas/facturas (registro permanente)
 */
export const sales = sqliteTable('sales', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  saleNumber: integer('sale_number').notNull().unique(), // Auto-incrementa
  userId: text('user_id').notNull(), // Cajero que hizo la venta
  
  items: text('items', { mode: 'json' }).notNull(), // Array de CartItem
  subtotal: real('subtotal').notNull(),
  tax: real('tax').notNull(),
  total: real('total').notNull(),
  
  paymentMethod: text('payment_method', {
    enum: ['cash', 'card', 'transfer', 'mixed']
  }).notNull(),
  
  status: text('status', {
    enum: ['completed', 'pending', 'cancelled']
  }).default('completed'),
  
  // Sincronización con WooCommerce (opcional)
  syncedToWoo: integer('synced_to_woo', { mode: 'boolean' }).default(false),
  wooOrderId: text('woo_order_id'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

/**
 * Sale items table (legacy compatibility)
 */
export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').notNull(),
  productId: text('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  synced: integer('synced').default(0),
});

/**
 * Metadata de sincronización
 */
export const syncMetadata = sqliteTable('sync_metadata', {
  id: text('id').primaryKey().$defaultFn(() => 'singleton'),
  lastSyncTimestamp: integer('last_sync_timestamp', { mode: 'timestamp' }),
  lastFullSyncTimestamp: integer('last_full_sync_timestamp', { mode: 'timestamp' }),
  pendingChanges: integer('pending_changes').default(0),
  
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Inferred types for type safety
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;
export type SyncMetadata = typeof syncMetadata.$inferSelect;
