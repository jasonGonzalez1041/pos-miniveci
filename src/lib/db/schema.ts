import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Shared schema for both local (SQLite WASM + OPFS) and cloud (Turso)
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // Stored in cents (e.g., $10.00 = 1000)
  stock: integer('stock').notNull().default(0),
  imageUrl: text('image_url'),

  // Sync fields for local-first architecture
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  synced: integer('synced').default(0), // 0 = pending sync, 1 = synced to cloud
});

// Sales table
export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  total: integer('total').notNull(), // Total in cents
  paymentMethod: text('payment_method').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  synced: integer('synced').default(0),
});

// Sale items table
export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').notNull(),
  productId: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(), // Price in cents at time of sale
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  synced: integer('synced').default(0),
});

// Inferred types for type safety
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;
