import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePosCart } from '@/hooks/use-pos-cart';
import * as dbOperations from '@/lib/db/dual-db-operations';

// Mock dependencies
vi.mock('@/hooks/use-network-state', () => ({
  useNetworkState: () => ({
    isOnline: true,
    pendingChanges: 0,
  }),
}));

vi.mock('@/lib/db/dual-db-operations', () => ({
  insertCartItemDual: vi.fn(),
  updateCartItemDual: vi.fn(),
  deleteCartItemDual: vi.fn(),
  clearCartDual: vi.fn(),
  getCartItems: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-123',
  },
});

/**
 * Tests for usePosCart hook
 * 
 * @description
 * Tests cart management functionality including:
 * - Adding items
 * - Updating quantities  
 * - Removing items
 * - Calculating totals
 * - Session management
 * - Offline behavior
 */
describe('usePosCart', () => {
  const mockProduct = {
    id: 'woo-123',
    name: 'Test Product',
    price: 1000,
    stock: 10,
    stockStatus: 'instock' as const,
    category: 'Test Category',
    imageThumb: 'https://cdn.example.com/thumb.webp',
    imageMedium: 'https://cdn.example.com/medium.webp',
    imageLarge: 'https://cdn.example.com/large.webp',
    imageOriginal: 'https://example.com/original.jpg',
    sku: 'TEST-123',
    description: 'Test product description',
    unit: 'UN',
    synced: true,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('test-session-123');
    (dbOperations.getCartItems as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty cart', async () => {
    const { result } = renderHook(() => usePosCart());

    expect(result.current.cart).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.total).toBe(0);
    expect(result.current.isEmpty).toBe(true);
  });

  it('should generate session ID and store in localStorage', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    renderHook(() => usePosCart());

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'pos-session-id',
      expect.stringMatching(/^session-\d+-[a-z0-9]+$/)
    );
  });

  it('should add item to cart', async () => {
    const { result } = renderHook(() => usePosCart());

    await act(async () => {
      await result.current.addItem(mockProduct);
    });

    expect(dbOperations.insertCartItemDual).toHaveBeenCalledWith({
      id: 'mock-uuid-123',
      sessionId: 'test-session-123',
      productId: mockProduct.id,
      name: mockProduct.name,
      image: mockProduct.imageMedium,
      unitPrice: mockProduct.price,
      quantity: 1,
      subtotal: mockProduct.price,
      createdAt: expect.any(Date),
    });
  });

  it('should increment quantity for existing item', async () => {
    const existingItem = {
      id: 'cart-item-1',
      sessionId: 'test-session-123',
      productId: mockProduct.id,
      name: mockProduct.name,
      image: mockProduct.imageMedium,
      unitPrice: 1000,
      quantity: 1,
      subtotal: 1000,
      createdAt: new Date(),
    };

    (dbOperations.getCartItems as any).mockResolvedValue([existingItem]);
    
    const { result } = renderHook(() => usePosCart());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.addItem(mockProduct);
    });

    expect(dbOperations.updateCartItemDual).toHaveBeenCalledWith(
      'cart-item-1',
      {
        quantity: 2,
        subtotal: 2000,
      }
    );
  });

  it('should update item quantity', async () => {
    const cartItem = {
      id: 'cart-item-1',
      sessionId: 'test-session-123',
      productId: 'woo-123',
      name: 'Test Product',
      image: 'image.webp',
      unitPrice: 1000,
      quantity: 1,
      subtotal: 1000,
      createdAt: new Date(),
    };

    (dbOperations.getCartItems as any).mockResolvedValue([cartItem]);
    
    const { result } = renderHook(() => usePosCart());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.updateQuantity('cart-item-1', 3);
    });

    expect(dbOperations.updateCartItemDual).toHaveBeenCalledWith(
      'cart-item-1',
      {
        quantity: 3,
        subtotal: 3000,
      }
    );
  });

  it('should remove item from cart', async () => {
    const { result } = renderHook(() => usePosCart());

    await act(async () => {
      await result.current.removeItem('cart-item-1');
    });

    expect(dbOperations.deleteCartItemDual).toHaveBeenCalledWith('cart-item-1');
  });

  it('should clear entire cart', async () => {
    const { result } = renderHook(() => usePosCart());

    await act(async () => {
      await result.current.clearCart();
    });

    expect(dbOperations.clearCartDual).toHaveBeenCalledWith('test-session-123');
  });

  it('should calculate totals correctly', async () => {
    const cartItems = [
      {
        id: 'item-1',
        sessionId: 'test-session-123',
        productId: 'prod-1',
        name: 'Product 1',
        image: null,
        unitPrice: 1000,
        quantity: 2,
        subtotal: 2000,
        createdAt: new Date(),
      },
      {
        id: 'item-2',
        sessionId: 'test-session-123',
        productId: 'prod-2',
        name: 'Product 2',
        image: null,
        unitPrice: 500,
        quantity: 3,
        subtotal: 1500,
        createdAt: new Date(),
      },
    ];

    (dbOperations.getCartItems as any).mockResolvedValue(cartItems);
    
    const { result } = renderHook(() => usePosCart());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.subtotal).toBe(3500);
    expect(result.current.tax).toBe(665); // 19% IVA
    expect(result.current.total).toBe(4165);
    expect(result.current.itemCount).toBe(5); // 2 + 3
  });

  it('should handle product quantity checks', async () => {
    const cartItems = [
      {
        id: 'item-1',
        sessionId: 'test-session-123',
        productId: 'woo-123',
        name: 'Test Product',
        image: null,
        unitPrice: 1000,
        quantity: 2,
        subtotal: 2000,
        createdAt: new Date(),
      },
    ];

    (dbOperations.getCartItems as any).mockResolvedValue(cartItems);
    
    const { result } = renderHook(() => usePosCart());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.hasProduct('woo-123')).toBe(true);
    expect(result.current.hasProduct('woo-456')).toBe(false);
    expect(result.current.getProductQuantity('woo-123')).toBe(2);
    expect(result.current.getProductQuantity('woo-456')).toBe(0);
  });

  it('should handle increment and decrement shortcuts', async () => {
    const cartItem = {
      id: 'cart-item-1',
      sessionId: 'test-session-123',
      productId: 'woo-123',
      name: 'Test Product',
      image: null,
      unitPrice: 1000,
      quantity: 2,
      subtotal: 2000,
      createdAt: new Date(),
    };

    (dbOperations.getCartItems as any).mockResolvedValue([cartItem]);
    
    const { result } = renderHook(() => usePosCart());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Test increment
    await act(async () => {
      await result.current.incrementItem('cart-item-1');
    });

    expect(dbOperations.updateCartItemDual).toHaveBeenCalledWith(
      'cart-item-1',
      { quantity: 3, subtotal: 3000 }
    );

    // Test decrement
    await act(async () => {
      await result.current.decrementItem('cart-item-1');
    });

    expect(dbOperations.updateCartItemDual).toHaveBeenCalledWith(
      'cart-item-1',
      { quantity: 1, subtotal: 1000 }
    );
  });

  it('should remove item when decrementing quantity to 0', async () => {
    const cartItem = {
      id: 'cart-item-1',
      sessionId: 'test-session-123',
      productId: 'woo-123',
      name: 'Test Product',
      image: null,
      unitPrice: 1000,
      quantity: 1,
      subtotal: 1000,
      createdAt: new Date(),
    };

    (dbOperations.getCartItems as any).mockResolvedValue([cartItem]);
    
    const { result } = renderHook(() => usePosCart());

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.decrementItem('cart-item-1');
    });

    expect(dbOperations.deleteCartItemDual).toHaveBeenCalledWith('cart-item-1');
  });
});