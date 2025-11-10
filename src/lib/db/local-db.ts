// Local-first database using SQLite WASM with OPFS
// Provides Drizzle-style API for consistent queries with cloud

import type { Product, NewProduct, Sale, NewSale, SaleItem, NewSaleItem } from './schema';

type PendingMessage = {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

let worker: Worker | null = null;
let messageId = 0;
let isReady = false;
const pendingMessages = new Map<number, PendingMessage>();

// Initialize the SQLite worker
export function initLocalDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      // SSR - skip initialization
      resolve();
      return;
    }

    if (isReady) {
      resolve();
      return;
    }

    worker = new Worker('/sqlite-worker.js');

    worker.onmessage = (event) => {
      const { id, type, result, error } = event.data;

      if (type === 'ready') {
        isReady = true;
        console.log('[LocalDB] Worker ready');
        resolve();
        return;
      }

      const pending = pendingMessages.get(id);
      if (!pending) return;

      pendingMessages.delete(id);

      if (type === 'error') {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    };

    worker.onerror = (err) => {
      console.error('[LocalDB] Worker error:', err);
      reject(err);
    };
  });
}

// Send a message to the worker and wait for response
function sendMessage<T>(type: string, payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!worker || !isReady) {
      reject(new Error('Worker not initialized. Call initLocalDb() first.'));
      return;
    }

    const id = messageId++;
    pendingMessages.set(id, { resolve: resolve as (value: unknown) => void, reject });

    worker.postMessage({ id, type, payload });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id);
        reject(new Error('Worker message timeout'));
      }
    }, 30000);
  });
}

// Drizzle-style API for local database
export const localDb = {
  // Get all products
  async getAllProducts(): Promise<Product[]> {
    return sendMessage<Product[]>('selectAll', {
      sql: 'SELECT * FROM products ORDER BY id DESC'
    });
  },

  // Get product by ID
  async getProduct(id: number): Promise<Product | null> {
    const results = await sendMessage<Product[]>('selectAll', {
      sql: 'SELECT * FROM products WHERE id = ?',
      params: [id]
    });
    return results[0] || null;
  },

  // Insert new product
  async insertProduct(data: Omit<NewProduct, 'id'>): Promise<Product> {
    const result = await sendMessage<{ lastInsertRowid: number }>('run', {
      sql: `INSERT INTO products (name, description, price, stock, image_url, synced)
            VALUES (?, ?, ?, ?, ?, 0)`,
      params: [
        data.name,
        data.description || null,
        data.price,
        data.stock || 0,
        data.imageUrl || null
      ]
    });

    return this.getProduct(result.lastInsertRowid) as Promise<Product>;
  },

  // Update product
  async updateProduct(id: number, data: Partial<Omit<Product, 'id'>>): Promise<Product> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      params.push(data.price);
    }
    if (data.stock !== undefined) {
      updates.push('stock = ?');
      params.push(data.stock);
    }
    if (data.imageUrl !== undefined) {
      updates.push('image_url = ?');
      params.push(data.imageUrl);
    }

    // Always update timestamp and mark as unsynced
    updates.push('updated_at = unixepoch()');
    updates.push('synced = 0');

    params.push(id);

    await sendMessage('run', {
      sql: `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      params
    });

    return this.getProduct(id) as Promise<Product>;
  },

  // Delete product
  async deleteProduct(id: number): Promise<void> {
    await sendMessage('run', {
      sql: 'DELETE FROM products WHERE id = ?',
      params: [id]
    });
  },

  // Get unsynced products
  async getPendingSync(): Promise<Product[]> {
    return sendMessage<Product[]>('selectAll', {
      sql: 'SELECT * FROM products WHERE synced = 0'
    });
  },

  // Mark product as synced
  async markSynced(id: number): Promise<void> {
    await sendMessage('run', {
      sql: 'UPDATE products SET synced = 1 WHERE id = ?',
      params: [id]
    });
  },

  // Get products updated after a timestamp
  async getUpdatedAfter(timestamp: number): Promise<Product[]> {
    return sendMessage<Product[]>('selectAll', {
      sql: 'SELECT * FROM products WHERE updated_at > ?',
      params: [timestamp]
    });
  },

  // SALES OPERATIONS
  
  // Get all sales
  async getAllSales(): Promise<Sale[]> {
    return sendMessage<Sale[]>('selectAll', {
      sql: 'SELECT * FROM sales WHERE deleted_at IS NULL ORDER BY created_at DESC'
    });
  },

  // Get sale by ID
  async getSale(id: string): Promise<Sale | null> {
    const results = await sendMessage<Sale[]>('selectAll', {
      sql: 'SELECT * FROM sales WHERE id = ? AND deleted_at IS NULL',
      params: [id]
    });
    return results[0] || null;
  },

  // Insert new sale
  async insertSale(data: NewSale): Promise<Sale> {
    await sendMessage('run', {
      sql: `INSERT INTO sales (id, total, payment_method, created_at, updated_at, synced)
            VALUES (?, ?, ?, unixepoch(), unixepoch(), ?)`,
      params: [
        data.id,
        data.total,
        data.paymentMethod,
        data.synced || 0
      ]
    });

    return this.getSale(data.id) as Promise<Sale>;
  },

  // Update sale
  async updateSale(id: string, data: Partial<Omit<Sale, 'id'>>): Promise<Sale> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.total !== undefined) {
      updates.push('total = ?');
      params.push(data.total);
    }
    if (data.paymentMethod !== undefined) {
      updates.push('payment_method = ?');
      params.push(data.paymentMethod);
    }

    // Always update timestamp and mark as unsynced
    updates.push('updated_at = unixepoch()');
    updates.push('synced = 0');

    params.push(id);

    await sendMessage('run', {
      sql: `UPDATE sales SET ${updates.join(', ')} WHERE id = ?`,
      params
    });

    return this.getSale(id) as Promise<Sale>;
  },

  // Soft delete sale
  async deleteSale(id: string): Promise<void> {
    await sendMessage('run', {
      sql: 'UPDATE sales SET deleted_at = unixepoch(), synced = 0 WHERE id = ?',
      params: [id]
    });
  },

  // SALE ITEMS OPERATIONS

  // Get all sale items for a sale
  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    return sendMessage<SaleItem[]>('selectAll', {
      sql: 'SELECT * FROM sale_items WHERE sale_id = ? AND deleted_at IS NULL',
      params: [saleId]
    });
  },

  // Get all sale items
  async getAllSaleItems(): Promise<SaleItem[]> {
    return sendMessage<SaleItem[]>('selectAll', {
      sql: 'SELECT * FROM sale_items WHERE deleted_at IS NULL'
    });
  },

  // Insert sale item
  async insertSaleItem(data: NewSaleItem): Promise<SaleItem> {
    await sendMessage('run', {
      sql: `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, created_at, updated_at, synced)
            VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch(), ?)`,
      params: [
        data.id,
        data.saleId,
        data.productId,
        data.quantity,
        data.unitPrice,
        data.synced || 0
      ]
    });

    const results = await sendMessage<SaleItem[]>('selectAll', {
      sql: 'SELECT * FROM sale_items WHERE id = ?',
      params: [data.id]
    });
    const row = results[0];
    if (!row) {
      throw new Error('Insert sale item failed');
    }
    return row;
  },

  // Get unsynced sales
  async getPendingSalesSync(): Promise<Sale[]> {
    return sendMessage<Sale[]>('selectAll', {
      sql: 'SELECT * FROM sales WHERE synced = 0'
    });
  },

  // Get unsynced sale items
  async getPendingSaleItemsSync(): Promise<SaleItem[]> {
    return sendMessage<SaleItem[]>('selectAll', {
      sql: 'SELECT * FROM sale_items WHERE synced = 0'
    });
  },

  // Mark sale as synced
  async markSaleSynced(id: string): Promise<void> {
    await sendMessage('run', {
      sql: 'UPDATE sales SET synced = 1 WHERE id = ?',
      params: [id]
    });
  },

  // Mark sale item as synced
  async markSaleItemSynced(id: string): Promise<void> {
    await sendMessage('run', {
      sql: 'UPDATE sale_items SET synced = 1 WHERE id = ?',
      params: [id]
    });
  },
};
