import { SalesService } from '@/lib/services/sales-service';
import type { CartItem } from '@/hooks/use-pos-cart';
import type { Sale, Product } from '@/lib/db/schema';

// Mock dependencies
jest.mock('@/lib/db/dual-db-operations', () => ({
  dbOperations: {
    createSale: jest.fn(),
    updateProductStock: jest.fn(),
    getProductById: jest.fn(),
    createSaleItems: jest.fn(),
  },
}));

const mockDbOperations = jest.mocked(require('@/lib/db/dual-db-operations').dbOperations);

describe('SalesService', () => {
  let salesService: SalesService;

  const mockCartItems: CartItem[] = [
    {
      id: 'cart-1',
      productId: 'prod-1',
      name: 'Product 1',
      price: 1000,
      quantity: 2,
      subtotal: 2000,
      sku: 'PROD-001',
      unit: 'UN',
      stock: 10,
    },
    {
      id: 'cart-2',
      productId: 'prod-2',
      name: 'Product 2',
      price: 1500,
      quantity: 1,
      subtotal: 1500,
      sku: 'PROD-002',
      unit: 'UN',
      stock: 5,
    },
  ];

  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Product 1',
    sku: 'PROD-001',
    price: 1000,
    stock: 10,
    unit: 'UN',
    imageOriginal: null,
    imageMedium: null,
    imageThumb: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    salesService = new SalesService();
    jest.clearAllMocks();
  });

  describe('Sale creation', () => {
    it('should create a sale successfully', async () => {
      const mockSale: Sale = {
        id: 'sale-123',
        sessionId: 'session-123',
        total: 3500,
        itemCount: 3,
        status: 'completed',
        paymentMethod: 'cash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbOperations.createSale.mockResolvedValue(mockSale);
      mockDbOperations.createSaleItems.mockResolvedValue([]);
      mockDbOperations.updateProductStock.mockResolvedValue(undefined);

      const result = await salesService.processSale({
        sessionId: 'session-123',
        items: mockCartItems,
        paymentMethod: 'cash',
      });

      expect(result.success).toBe(true);
      expect(result.sale).toEqual(mockSale);
      expect(mockDbOperations.createSale).toHaveBeenCalledWith({
        sessionId: 'session-123',
        total: 3500,
        itemCount: 3,
        status: 'completed',
        paymentMethod: 'cash',
      });
    });

    it('should calculate totals correctly', async () => {
      const mockSale: Sale = {
        id: 'sale-123',
        sessionId: 'session-123',
        total: 3500,
        itemCount: 3,
        status: 'completed',
        paymentMethod: 'cash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbOperations.createSale.mockResolvedValue(mockSale);
      mockDbOperations.createSaleItems.mockResolvedValue([]);
      mockDbOperations.updateProductStock.mockResolvedValue(undefined);

      await salesService.processSale({
        sessionId: 'session-123',
        items: mockCartItems,
        paymentMethod: 'cash',
      });

      expect(mockDbOperations.createSale).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 3500, // 2000 + 1500
          itemCount: 3, // 2 + 1
        })
      );
    });

    it('should create sale items', async () => {
      const mockSale: Sale = {
        id: 'sale-123',
        sessionId: 'session-123',
        total: 3500,
        itemCount: 3,
        status: 'completed',
        paymentMethod: 'cash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbOperations.createSale.mockResolvedValue(mockSale);
      mockDbOperations.createSaleItems.mockResolvedValue([]);
      mockDbOperations.updateProductStock.mockResolvedValue(undefined);

      await salesService.processSale({
        sessionId: 'session-123',
        items: mockCartItems,
        paymentMethod: 'cash',
      });

      expect(mockDbOperations.createSaleItems).toHaveBeenCalledWith(
        'sale-123',
        [
          {
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 1000,
            subtotal: 2000,
          },
          {
            productId: 'prod-2',
            quantity: 1,
            unitPrice: 1500,
            subtotal: 1500,
          },
        ]
      );
    });

    it('should update product stock', async () => {
      const mockSale: Sale = {
        id: 'sale-123',
        sessionId: 'session-123',
        total: 3500,
        itemCount: 3,
        status: 'completed',
        paymentMethod: 'cash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbOperations.createSale.mockResolvedValue(mockSale);
      mockDbOperations.createSaleItems.mockResolvedValue([]);
      mockDbOperations.updateProductStock.mockResolvedValue(undefined);

      await salesService.processSale({
        sessionId: 'session-123',
        items: mockCartItems,
        paymentMethod: 'cash',
      });

      expect(mockDbOperations.updateProductStock).toHaveBeenCalledWith('prod-1', 8); // 10 - 2
      expect(mockDbOperations.updateProductStock).toHaveBeenCalledWith('prod-2', 4); // 5 - 1
    });
  });

  describe('Stock validation', () => {
    it('should validate stock availability', async () => {
      mockDbOperations.getProductById.mockResolvedValue(mockProduct);

      const result = await salesService.validateStock(mockCartItems);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect insufficient stock', async () => {
      const lowStockProduct = { ...mockProduct, stock: 1 };
      mockDbOperations.getProductById.mockResolvedValue(lowStockProduct);

      const result = await salesService.validateStock(mockCartItems);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Insufficient stock for Product 1. Available: 1, Requested: 2'
      );
    });

    it('should handle missing products', async () => {
      mockDbOperations.getProductById.mockResolvedValue(null);

      const result = await salesService.validateStock(mockCartItems);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Product not found: prod-1');
    });

    it('should validate all items in cart', async () => {
      mockDbOperations.getProductById
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(null); // Second product not found

      const result = await salesService.validateStock(mockCartItems);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Product not found: prod-2');
      expect(mockDbOperations.getProductById).toHaveBeenCalledTimes(2);
    });
  });

  describe('Payment processing', () => {
    it('should handle cash payments', async () => {
      const mockSale: Sale = {
        id: 'sale-123',
        sessionId: 'session-123',
        total: 3500,
        itemCount: 3,
        status: 'completed',
        paymentMethod: 'cash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbOperations.createSale.mockResolvedValue(mockSale);
      mockDbOperations.createSaleItems.mockResolvedValue([]);
      mockDbOperations.updateProductStock.mockResolvedValue(undefined);

      const result = await salesService.processSale({
        sessionId: 'session-123',
        items: mockCartItems,
        paymentMethod: 'cash',
        cashReceived: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.change).toBe(1500); // 5000 - 3500
    });

    it('should validate cash amount', async () => {
      const result = await salesService.processSale({
        sessionId: 'session-123',
        items: mockCartItems,
        paymentMethod: 'cash',
        cashReceived: 2000, // Less than total
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient cash');
    });

    it('should handle card payments', async () => {
      const mockSale: Sale = {
        id: 'sale-123',
        sessionId: 'session-123',
        total: 3500,
        itemCount: 3,
        status: 'completed',
        paymentMethod: 'card',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbOperations.createSale.mockResolvedValue(mockSale);
      mockDbOperations.createSaleItems.mockResolvedValue([]);
      mockDbOperations.updateProductStock.mockResolvedValue(undefined);

      const result = await salesService.processSale({
        sessionId: 'session-123',
        items: mockCartItems,
        paymentMethod: 'card',
      });

      expect(result.success).toBe(true);
      expect(result.change).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors during sale creation', async () => {
      const dbError = new Error('Database connection failed');
      mockDbOperations.createSale.mockRejectedValue(dbError);

      const result = await salesService.processSale({
        sessionId: 'session-123',
        items: mockCartItems,
        paymentMethod: 'cash',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should rollback on stock update failure', async () => {
      const mockSale: Sale = {
        id: 'sale-123',
        sessionId: 'session-123',
        total: 3500,
        itemCount: 3,
        status: 'completed',
        paymentMethod: 'cash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDbOperations.createSale.mockResolvedValue(mockSale);
      mockDbOperations.createSaleItems.mockResolvedValue([]);
      mockDbOperations.updateProductStock.mockRejectedValue(new Error('Stock update failed'));

      const result = await salesService.processSale({
        sessionId: 'session-123',
        items: mockCartItems,
        paymentMethod: 'cash',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Stock update failed');
    });

    it('should validate empty cart', async () => {
      const result = await salesService.processSale({
        sessionId: 'session-123',
        items: [],
        paymentMethod: 'cash',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cart is empty');
    });

    it('should validate session ID', async () => {
      const result = await salesService.processSale({
        sessionId: '',
        items: mockCartItems,
        paymentMethod: 'cash',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid session');
    });
  });

  describe('Sale history', () => {
    it('should retrieve sales by session', async () => {
      const mockSales = [
        {
          id: 'sale-1',
          sessionId: 'session-123',
          total: 1000,
          itemCount: 1,
          status: 'completed',
          paymentMethod: 'cash',
          createdAt: new Date(),
        },
      ];

      mockDbOperations.getSalesBySession = jest.fn().mockResolvedValue(mockSales);

      const result = await salesService.getSaleHistory('session-123');

      expect(result).toEqual(mockSales);
      expect(mockDbOperations.getSalesBySession).toHaveBeenCalledWith('session-123');
    });

    it('should get daily sales summary', async () => {
      const mockSummary = {
        totalSales: 5,
        totalAmount: 15000,
        averageTicket: 3000,
      };

      mockDbOperations.getDailySalesSummary = jest.fn().mockResolvedValue(mockSummary);

      const today = new Date();
      const result = await salesService.getDailySummary(today);

      expect(result).toEqual(mockSummary);
      expect(mockDbOperations.getDailySalesSummary).toHaveBeenCalledWith(today);
    });
  });

  describe('Receipt generation', () => {
    it('should generate receipt data', () => {
      const mockSale: Sale = {
        id: 'sale-123',
        sessionId: 'session-123',
        total: 3500,
        itemCount: 3,
        status: 'completed',
        paymentMethod: 'cash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const receipt = salesService.generateReceipt(mockSale, mockCartItems);

      expect(receipt.saleId).toBe('sale-123');
      expect(receipt.total).toBe(3500);
      expect(receipt.items).toHaveLength(2);
      expect(receipt.paymentMethod).toBe('cash');
      expect(receipt.timestamp).toBeInstanceOf(Date);
    });

    it('should format receipt for printing', () => {
      const mockSale: Sale = {
        id: 'sale-123',
        sessionId: 'session-123',
        total: 3500,
        itemCount: 3,
        status: 'completed',
        paymentMethod: 'cash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const receipt = salesService.generateReceipt(mockSale, mockCartItems);
      const formatted = salesService.formatReceiptForPrint(receipt);

      expect(formatted).toContain('RECIBO DE VENTA');
      expect(formatted).toContain('sale-123');
      expect(formatted).toContain('Product 1');
      expect(formatted).toContain('$3.500');
    });
  });
});