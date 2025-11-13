/**
 * Operaciones duales de base de datos (local + cloud)
 * Implementa patrón offline-first con sync automático
 */

import { eq, desc, and } from 'drizzle-orm';
import { localDb } from './local-db';
import { cloudDb } from './cloud-db';
import { products, cartItems, sales, users, syncMetadata } from './schema';
import type { 
  Product, 
  NewProduct, 
  CartItem, 
  NewCartItem,
  Sale,
  NewSale,
  User,
  NewUser,
  SyncMetadata 
} from './schema';

/**
 * Productos
 */
export async function insertProductDual(product: Omit<NewProduct, 'createdAt' | 'updatedAt'>): Promise<Product> {
  const newProduct = {
    ...product,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    // 1. Insertar en local (prioridad)
    await localDb.insert(products).values(newProduct);
    
    // 2. Intentar insertar en cloud (optimistic)
    try {
      await cloudDb.insert(products).values(newProduct);
      
      // Marcar como sincronizado
      await localDb
        .update(products)
        .set({ synced: true, lastSyncedAt: new Date() })
        .where(eq(products.id, newProduct.id));
        
    } catch (cloudError) {
      console.warn('⚠️ Cloud insert failed, will sync later:', cloudError);
      // Local insert succeeded, cloud will sync later
    }
    
    return newProduct as Product;
    
  } catch (error) {
    console.error('❌ Failed to insert product:', error);
    throw error;
  }
}

export async function updateProductDual(
  id: string, 
  updates: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<void> {
  const updateData = {
    ...updates,
    updatedAt: new Date(),
    synced: false, // Marca como pending sync
  };

  try {
    // 1. Update local (prioridad)
    const localDb = await getLocalDb();
    await localDb
      .update(products)
      .set(updateData)
      .where(eq(products.id, id));
    
    // 2. Intentar update en cloud
    try {
      const cloudDb = getCloudDb();
      await cloudDb
        .update(products)
        .set(updateData)
        .where(eq(products.id, id));
      
      // Marcar como sincronizado
      await localDb
        .update(products)
        .set({ synced: true, lastSyncedAt: new Date() })
        .where(eq(products.id, id));
        
    } catch (cloudError) {
      console.warn('⚠️ Cloud update failed, will sync later:', cloudError);
    }
    
  } catch (error) {
    console.error('❌ Failed to update product:', error);
    throw error;
  }
}

export async function deleteProductDual(id: string): Promise<void> {
  try {
    // 1. Delete from local
    const localDb = await getLocalDb();
    await localDb.delete(products).where(eq(products.id, id));
    
    // 2. Intentar delete en cloud
    try {
      const cloudDb = getCloudDb();
      await cloudDb.delete(products).where(eq(products.id, id));
    } catch (cloudError) {
      console.warn('⚠️ Cloud delete failed:', cloudError);
      // TODO: Queue for later sync
    }
    
  } catch (error) {
    console.error('❌ Failed to delete product:', error);
    throw error;
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const localDb = await getLocalDb();
    const result = await localDb
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error('❌ Failed to get product:', error);
    return null;
  }
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    const localDb = await getLocalDb();
    return await localDb
      .select()
      .from(products)
      .orderBy(desc(products.updatedAt));
  } catch (error) {
    console.error('❌ Failed to get products:', error);
    return [];
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const localDb = await getLocalDb();
    return await localDb
      .select()
      .from(products)
      .where(
        // Simple text search - in production would use FTS
        eq(products.name, query) // TODO: Implement LIKE search
      )
      .orderBy(desc(products.updatedAt));
  } catch (error) {
    console.error('❌ Failed to search products:', error);
    return [];
  }
}

/**
 * Carrito (solo local, temporal)
 */
export async function insertCartItemDual(cartItem: Omit<NewCartItem, 'createdAt'>): Promise<CartItem> {
  const newCartItem = {
    ...cartItem,
    createdAt: new Date(),
  };

  try {
    const localDb = await getLocalDb();
    await localDb.insert(cartItems).values(newCartItem);
    return newCartItem as CartItem;
  } catch (error) {
    console.error('❌ Failed to insert cart item:', error);
    throw error;
  }
}

export async function updateCartItemDual(
  id: string,
  updates: Partial<Omit<CartItem, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    const localDb = await getLocalDb();
    await localDb
      .update(cartItems)
      .set(updates)
      .where(eq(cartItems.id, id));
  } catch (error) {
    console.error('❌ Failed to update cart item:', error);
    throw error;
  }
}

export async function deleteCartItemDual(id: string): Promise<void> {
  try {
    const localDb = await getLocalDb();
    await localDb.delete(cartItems).where(eq(cartItems.id, id));
  } catch (error) {
    console.error('❌ Failed to delete cart item:', error);
    throw error;
  }
}

export async function clearCartDual(sessionId: string): Promise<void> {
  try {
    const localDb = await getLocalDb();
    await localDb
      .delete(cartItems)
      .where(eq(cartItems.sessionId, sessionId));
  } catch (error) {
    console.error('❌ Failed to clear cart:', error);
    throw error;
  }
}

export async function getCartItems(sessionId: string): Promise<CartItem[]> {
  try {
    const localDb = await getLocalDb();
    return await localDb
      .select()
      .from(cartItems)
      .where(eq(cartItems.sessionId, sessionId))
      .orderBy(desc(cartItems.createdAt));
  } catch (error) {
    console.error('❌ Failed to get cart items:', error);
    return [];
  }
}

/**
 * Ventas
 */
export async function insertSaleDual(sale: Omit<NewSale, 'createdAt' | 'updatedAt'>): Promise<Sale> {
  const newSale = {
    ...sale,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    // 1. Insert local (prioridad)
    const localDb = await getLocalDb();
    await localDb.insert(sales).values(newSale);
    
    // 2. Intentar insert en cloud
    try {
      const cloudDb = getCloudDb();
      await cloudDb.insert(sales).values(newSale);
    } catch (cloudError) {
      console.warn('⚠️ Cloud sale insert failed, will sync later:', cloudError);
    }
    
    return newSale as Sale;
    
  } catch (error) {
    console.error('❌ Failed to insert sale:', error);
    throw error;
  }
}

export async function getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
  try {
    const localDb = await getLocalDb();
    return await localDb
      .select()
      .from(sales)
      .where(
        and(
          // TODO: Add date range filter using timestamps
          eq(sales.status, 'completed')
        )
      )
      .orderBy(desc(sales.createdAt));
  } catch (error) {
    console.error('❌ Failed to get sales:', error);
    return [];
  }
}

/**
 * Usuarios
 */
export async function insertUserDual(user: Omit<NewUser, 'createdAt' | 'updatedAt'>): Promise<User> {
  const newUser = {
    ...user,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const localDb = await getLocalDb();
    await localDb.insert(users).values(newUser);
    
    // Sync to cloud
    try {
      const cloudDb = getCloudDb();
      await cloudDb.insert(users).values(newUser);
    } catch (cloudError) {
      console.warn('⚠️ Cloud user insert failed:', cloudError);
    }
    
    return newUser as User;
    
  } catch (error) {
    console.error('❌ Failed to insert user:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const localDb = await getLocalDb();
    const result = await localDb
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error('❌ Failed to get user:', error);
    return null;
  }
}

/**
 * Utilidades de sincronización
 */
export async function getUnsyncedProducts(): Promise<Product[]> {
  try {
    const localDb = await getLocalDb();
    return await localDb
      .select()
      .from(products)
      .where(eq(products.synced, false))
      .orderBy(desc(products.updatedAt));
  } catch (error) {
    console.error('❌ Failed to get unsynced products:', error);
    return [];
  }
}

export async function markProductsSynced(productIds: string[]): Promise<void> {
  try {
    const localDb = await getLocalDb();
    
    for (const id of productIds) {
      await localDb
        .update(products)
        .set({ 
          synced: true, 
          lastSyncedAt: new Date() 
        })
        .where(eq(products.id, id));
    }
  } catch (error) {
    console.error('❌ Failed to mark products as synced:', error);
    throw error;
  }
}