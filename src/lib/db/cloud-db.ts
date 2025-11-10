// Cloud database using Turso with Drizzle
// Mirrors local-db API for consistent queries

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, gt } from 'drizzle-orm';
import { products, sales, saleItems } from './schema';
import type { Product, NewProduct, Sale, NewSale, SaleItem, NewSaleItem } from './schema';

// Initialize Turso client
const tursoUrl = process.env.NEXT_PUBLIC_TURSO_DATABASE_URL;
const tursoToken = process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.warn('[CloudDB] Missing Turso credentials - cloud sync disabled');
}

const client = tursoUrl && tursoToken ? createClient({
  url: tursoUrl,
  authToken: tursoToken,
}) : null;

const db = client ? drizzle(client, { schema: { products, sales, saleItems } }) : null;

// Drizzle-style API for cloud database (mirrors localDb)
export const cloudDb = {
  // Get all products
  async getAllProducts(): Promise<Product[]> {
    if (!db) throw new Error('Cloud database not initialized');
    return db.select().from(products).orderBy(products.id);
  },

  // Get product by ID
  async getProduct(id: number): Promise<Product | null> {
    if (!db) throw new Error('Cloud database not initialized');
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0] || null;
  },

  // Insert new product
  async insertProduct(data: Omit<NewProduct, 'id' | 'synced'>): Promise<Product> {
    if (!db) throw new Error('Cloud database not initialized');
    const result = await db.insert(products).values({
      ...data,
      synced: 1, // Cloud records are always synced
    }).returning();
    const row = result[0];
    if (!row) throw new Error('Insert product failed');
    return row;
  },

  // Update product
  async updateProduct(id: number, data: Partial<Omit<Product, 'id'>>): Promise<Product> {
    if (!db) throw new Error('Cloud database not initialized');
    const result = await db.update(products)
      .set({
        ...data,
        updatedAt: new Date(),
        synced: 1,
      })
      .where(eq(products.id, id))
      .returning();
    const row = result[0];
    if (!row) throw new Error('Update product failed');
    return row;
  },

  // Upsert product (insert or update based on existence)
  async upsertProduct(product: Product): Promise<Product> {
    if (!db) throw new Error('Cloud database not initialized');

    const existing = await this.getProduct(product.id!);

    if (existing) {
      return this.updateProduct(product.id!, product);
    } else {
      // For upsert, we want to keep the original ID
      const result = await db.insert(products).values({
        ...product,
        synced: 1,
      }).returning();
      const row = result[0];
      if (!row) throw new Error('Upsert product insert failed');
      return row;
    }
  },

  // Delete product
  async deleteProduct(id: number): Promise<void> {
    if (!db) throw new Error('Cloud database not initialized');
    await db.delete(products).where(eq(products.id, id));
  },

  // Get products updated after a timestamp
  async getUpdatedAfter(timestamp: Date): Promise<Product[]> {
    if (!db) throw new Error('Cloud database not initialized');
    return db.select()
      .from(products)
      .where(gt(products.updatedAt, timestamp));
  },

  // Check if cloud is available
  isAvailable(): boolean {
    return db !== null;
  },

  // SALES OPERATIONS
  
  // Insert new sale
  async insertSale(data: NewSale): Promise<Sale> {
    if (!db) throw new Error('Cloud database not initialized');
    const result = await db.insert(sales).values({
      ...data,
      synced: 1, // Cloud records are always synced
    }).returning();
    const row = result[0];
    if (!row) throw new Error('Insert sale failed');
    return row;
  },

  // Get sale by ID
  async getSale(id: string): Promise<Sale | null> {
    if (!db) throw new Error('Cloud database not initialized');
    const result = await db.select().from(sales).where(eq(sales.id, id));
    return result[0] || null;
  },

  // Get all sales
  async getAllSales(): Promise<Sale[]> {
    if (!db) throw new Error('Cloud database not initialized');
    return db.select().from(sales).orderBy(sales.createdAt);
  },

  // Get sales updated after a timestamp
  async getSalesUpdatedAfter(timestamp: Date): Promise<Sale[]> {
    if (!db) throw new Error('Cloud database not initialized');
    return db.select()
      .from(sales)
      .where(gt(sales.updatedAt, timestamp));
  },

  // Update sale
  async updateSale(id: string, data: Partial<Omit<Sale, 'id'>>): Promise<Sale> {
    if (!db) throw new Error('Cloud database not initialized');
    const result = await db.update(sales)
      .set({
        ...data,
        updatedAt: new Date(),
        synced: 1,
      })
      .where(eq(sales.id, id))
      .returning();
    const row = result[0];
    if (!row) throw new Error('Update sale failed');
    return row;
  },

  // Delete sale (soft delete)
  async deleteSale(id: string): Promise<void> {
    if (!db) throw new Error('Cloud database not initialized');
    await db.update(sales)
      .set({ deletedAt: new Date() })
      .where(eq(sales.id, id));
  },

  // SALE ITEMS OPERATIONS

  // Insert sale item
  async insertSaleItem(data: NewSaleItem): Promise<SaleItem> {
    if (!db) throw new Error('Cloud database not initialized');
    const result = await db.insert(saleItems).values({
      ...data,
      synced: 1, // Cloud records are always synced
    }).returning();
    const row = result[0];
    if (!row) throw new Error('Insert sale item failed');
    return row;
  },

  // Get sale items for a sale
  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    if (!db) throw new Error('Cloud database not initialized');
    return db.select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));
  },

  // Get all sale items
  async getAllSaleItems(): Promise<SaleItem[]> {
    if (!db) throw new Error('Cloud database not initialized');
    return db.select().from(saleItems);
  },

  // Get sale items updated after a timestamp
  async getSaleItemsUpdatedAfter(timestamp: Date): Promise<SaleItem[]> {
    if (!db) throw new Error('Cloud database not initialized');
    return db.select()
      .from(saleItems)
      .where(gt(saleItems.updatedAt, timestamp));
  },
};
