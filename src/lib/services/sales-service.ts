// Sales service - Business logic for POS sales operations
// Handles complete sale workflows with inventory updates

import { localDb } from '@/lib/db/local-db';
import { generateSaleId } from '@/lib/utils/pos-helpers';
import type { Sale, NewSale, SaleItem, NewSaleItem } from '@/lib/db/schema';

export interface SaleInput {
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
  }>;
  paymentMethod: 'cash' | 'card' | 'digital';
  paymentAmount: number;
}

export interface SaleResult {
  success: boolean;
  sale?: Sale;
  saleItems?: SaleItem[];
  change?: number;
  errors?: string[];
}

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  averageSale: number;
  topProducts: Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
}

class SalesService {
  // Create a complete sale with inventory updates
  async createSale(saleInput: SaleInput): Promise<SaleResult> {
    const errors: string[] = [];

    try {
      // Validate all items and stock
      const validationResult = await this.validateSaleItems(saleInput.items);
      if (!validationResult.success) {
        return {
          success: false,
          ...(validationResult.errors ? { errors: validationResult.errors } : {})
        };
      }

      // Calculate total
      const total = this.calculateTotal(saleInput.items);

      // Validate payment
      const paymentValidation = this.validatePayment(total, saleInput.paymentAmount);
      if (!paymentValidation.valid) {
        return {
          success: false,
          errors: [paymentValidation.message!]
        };
      }

      // Generate sale ID
      const saleId = generateSaleId();

      // Create sale record
      const newSale: NewSale = {
        id: saleId,
        total,
        paymentMethod: saleInput.paymentMethod,
        synced: 0
      };

      // Create sale items
      const saleItems: NewSaleItem[] = saleInput.items.map(item => ({
        id: `${saleId}-${item.productId}`,
        saleId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        synced: 0
      }));

      // Execute transaction (simulate with sequential operations)
      const sale = await this.insertSale(newSale);
      const insertedItems = await this.insertSaleItems(saleItems);
      
      // Update inventory
      await this.updateInventoryAfterSale(saleInput.items);

      const change = saleInput.paymentAmount - total;

      return {
        success: true,
        sale,
        saleItems: insertedItems,
        change: change > 0 ? change : 0
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Error desconocido');
      return {
        success: false,
        errors
      };
    }
  }

  // Validate sale items against stock
  private async validateSaleItems(items: SaleInput['items']): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];

    for (const item of items) {
      const product = await localDb.getProduct(item.productId);
      if (!product) {
        errors.push(`Producto ${item.productId} no encontrado`);
        continue;
      }

      const stockValidation = this.validateStock(product.stock, item.quantity);
      if (!stockValidation.valid) {
        errors.push(`${product.name}: ${stockValidation.message}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }
    return { success: true };
    
  }

  // Insert sale record
  private async insertSale(sale: NewSale): Promise<Sale> {
    // For now, use localDb - in real implementation this would be transaction-safe
    return localDb.insertSale(sale);
  }

  // Insert sale items
  private async insertSaleItems(items: NewSaleItem[]): Promise<SaleItem[]> {
    const insertedItems: SaleItem[] = [];
    for (const item of items) {
      const inserted = await localDb.insertSaleItem(item);
      insertedItems.push(inserted);
    }
    return insertedItems;
  }

  // Update product inventory after sale
  private async updateInventoryAfterSale(items: SaleInput['items']): Promise<void> {
    for (const item of items) {
      const product = await localDb.getProduct(item.productId);
      if (product) {
        await localDb.updateProduct(item.productId, {
          stock: product.stock - item.quantity
        });
      }
    }
  }

  // Get sales statistics
  async getSalesStats(fromDate?: Date, toDate?: Date): Promise<SalesStats> {
    const sales = await localDb.getAllSales();
    const saleItems = await localDb.getAllSaleItems();
    const products = await localDb.getAllProducts();

    // Filter by date if provided
    const filteredSales = sales.filter(sale => {
      if (!fromDate && !toDate) return true;
      const saleDate = new Date(sale.createdAt!);
      if (fromDate && saleDate < fromDate) return false;
      if (toDate && saleDate > toDate) return false;
      return true;
    });

    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Calculate top products
    const productStats = new Map<number, { quantity: number; revenue: number; name: string }>();
    
    saleItems.forEach(item => {
      if (filteredSales.some(sale => sale.id === item.saleId)) {
        const existing = productStats.get(item.productId) || { quantity: 0, revenue: 0, name: '' };
        const product = products.find(p => p.id === item.productId);
        
        productStats.set(item.productId, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + (item.unitPrice * item.quantity),
          name: product?.name || `Producto ${item.productId}`
        });
      }
    });

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => ({
        productId,
        productName: stats.name,
        totalQuantity: stats.quantity,
        totalRevenue: stats.revenue
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return {
      totalSales,
      totalRevenue,
      averageSale,
      topProducts
    } as const as SalesStats;
  }

  // Get sales by date range
  async getSalesByDateRange(fromDate: Date, toDate: Date): Promise<Sale[]> {
    const sales = await localDb.getAllSales();
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt!);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }

  // Get sale with items
  async getSaleWithItems(saleId: string): Promise<{ sale: Sale; items: SaleItem[] } | null> {
    const sale = await localDb.getSale(saleId);
    if (!sale) return null;

    const items = await localDb.getSaleItems(saleId);
    return { sale, items };
  }

  // Internal: compute total from sale items
  private calculateTotal(items: SaleInput['items']): number {
    return items.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  }

  // Internal: validate payment
  private validatePayment(total: number, payment: number): { valid: boolean; message?: string } {
    if (payment < 0) {
      return { valid: false, message: 'El pago no puede ser negativo' };
    }
    if (payment < total) {
      return { valid: false, message: 'El pago es insuficiente' };
    }
    return { valid: true };
  }

  // Internal: validate stock
  private validateStock(available: number, requested: number): { valid: boolean; message?: string } {
    if (requested <= 0) {
      return { valid: false, message: 'La cantidad debe ser mayor a 0' };
    }
    if (requested > available) {
      return { valid: false, message: `Stock insuficiente. Disponible: ${available}` };
    }
    return { valid: true };
  }
}

export const salesService = new SalesService();