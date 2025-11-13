import { render, screen, fireEvent } from '@testing-library/react';
import { CartSidebar } from '@/components/ui/pos/cart-sidebar';
import type { CartItem } from '@/hooks/use-pos-cart';

// Mock the hooks
jest.mock('@/hooks/use-pos-cart', () => ({
  usePosCart: () => mockCartHook,
}));

jest.mock('@/hooks/use-hotkeys-pos', () => ({
  useHotkeysPos: jest.fn(),
}));

const mockCartItem: CartItem = {
  id: 'cart-1',
  productId: 'prod-1',
  name: 'Test Product',
  price: 1000,
  quantity: 2,
  subtotal: 2000,
  sku: 'TEST-001',
  unit: 'UN',
  stock: 10,
};

const mockCartHook = {
  items: [mockCartItem],
  total: 2000,
  itemCount: 2,
  updateQuantity: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn(),
  isLoading: false,
  sessionId: 'test-session-123',
  addToCart: jest.fn(),
  incrementItem: jest.fn(),
  decrementItem: jest.fn(),
};

describe('CartSidebar', () => {
  const mockOnCheckout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cart display', () => {
    it('should render cart items correctly', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('SKU: TEST-001')).toBeInTheDocument();
      expect(screen.getByText('$1.000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      expect(screen.getByText('$2.000')).toBeInTheDocument();
    });

    it('should display cart totals correctly', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      expect(screen.getByText('Subtotal')).toBeInTheDocument();
      expect(screen.getByText('$2.000')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('should show empty cart message when no items', () => {
      const emptyCartHook = { ...mockCartHook, items: [], total: 0, itemCount: 0 };
      jest.mocked(require('@/hooks/use-pos-cart').usePosCart).mockReturnValue(emptyCartHook);

      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      expect(screen.getByText(/carrito está vacío/i)).toBeInTheDocument();
    });
  });

  describe('Quantity management', () => {
    it('should allow quantity changes via input', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      const quantityInput = screen.getByDisplayValue('2');
      fireEvent.change(quantityInput, { target: { value: '5' } });
      fireEvent.blur(quantityInput);

      expect(mockCartHook.updateQuantity).toHaveBeenCalledWith('cart-1', 5);
    });

    it('should increment quantity with plus button', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      const incrementButton = screen.getByRole('button', { name: /incrementar/i });
      fireEvent.click(incrementButton);

      expect(mockCartHook.incrementItem).toHaveBeenCalledWith('cart-1');
    });

    it('should decrement quantity with minus button', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      const decrementButton = screen.getByRole('button', { name: /decrementar/i });
      fireEvent.click(decrementButton);

      expect(mockCartHook.decrementItem).toHaveBeenCalledWith('cart-1');
    });

    it('should disable decrement when quantity is 1', () => {
      const singleItemCart = {
        ...mockCartHook,
        items: [{ ...mockCartItem, quantity: 1, subtotal: 1000 }],
      };
      jest.mocked(require('@/hooks/use-pos-cart').usePosCart).mockReturnValue(singleItemCart);

      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      const decrementButton = screen.getByRole('button', { name: /decrementar/i });
      expect(decrementButton).toBeDisabled();
    });

    it('should validate quantity against stock', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      const quantityInput = screen.getByDisplayValue('2');
      fireEvent.change(quantityInput, { target: { value: '15' } }); // More than stock
      fireEvent.blur(quantityInput);

      // Should cap at available stock
      expect(mockCartHook.updateQuantity).toHaveBeenCalledWith('cart-1', 10);
    });
  });

  describe('Item removal', () => {
    it('should remove item when remove button clicked', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      const removeButton = screen.getByRole('button', { name: /eliminar/i });
      fireEvent.click(removeButton);

      expect(mockCartHook.removeItem).toHaveBeenCalledWith('cart-1');
    });

    it('should clear all items when clear cart clicked', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      const clearButton = screen.getByRole('button', { name: /vaciar carrito/i });
      fireEvent.click(clearButton);

      expect(mockCartHook.clearCart).toHaveBeenCalled();
    });
  });

  describe('Checkout process', () => {
    it('should enable checkout when items present', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      const checkoutButton = screen.getByRole('button', { name: /procesar venta/i });
      expect(checkoutButton).not.toBeDisabled();
    });

    it('should disable checkout when cart empty', () => {
      const emptyCartHook = { ...mockCartHook, items: [], total: 0, itemCount: 0 };
      jest.mocked(require('@/hooks/use-pos-cart').usePosCart).mockReturnValue(emptyCartHook);

      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      const checkoutButton = screen.getByRole('button', { name: /procesar venta/i });
      expect(checkoutButton).toBeDisabled();
    });

    it('should call onCheckout when checkout clicked', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      const checkoutButton = screen.getByRole('button', { name: /procesar venta/i });
      fireEvent.click(checkoutButton);

      expect(mockOnCheckout).toHaveBeenCalled();
    });
  });

  describe('Session management', () => {
    it('should display session ID', () => {
      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      expect(screen.getByText(/test-session-123/)).toBeInTheDocument();
    });
  });

  describe('Loading states', () => {
    it('should show loading state', () => {
      const loadingCartHook = { ...mockCartHook, isLoading: true };
      jest.mocked(require('@/hooks/use-pos-cart').usePosCart).mockReturnValue(loadingCartHook);

      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      expect(screen.getByText(/cargando/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard shortcuts', () => {
    it('should close on Escape key', () => {
      const mockOnClose = jest.fn();

      render(
        <CartSidebar
          isOpen={true}
          onClose={mockOnClose}
          onCheckout={mockOnCheckout}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Responsive behavior', () => {
    it('should handle mobile view', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <CartSidebar
          isOpen={true}
          onClose={jest.fn()}
          onCheckout={mockOnCheckout}
        />
      );

      // Check mobile-specific styling is applied
      const sidebar = screen.getByRole('dialog');
      expect(sidebar).toBeInTheDocument();
    });
  });
});