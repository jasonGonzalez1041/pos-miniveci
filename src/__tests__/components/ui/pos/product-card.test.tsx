import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '@/components/ui/pos/product-card';
import type { Product } from '@/lib/db/schema';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  sku: 'TEST-001',
  price: 1000,
  stock: 5,
  unit: 'UN',
  imageOriginal: 'https://example.com/image.jpg',
  imageMedium: 'https://example.com/image-medium.jpg',
  imageThumb: 'https://example.com/image-thumb.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProductNoStock: Product = {
  ...mockProduct,
  id: '2',
  stock: 0,
};

const mockProductNoImage: Product = {
  ...mockProduct,
  id: '3',
  imageOriginal: null,
  imageMedium: null,
  imageThumb: null,
};

describe('ProductCard', () => {
  const mockOnAdd = jest.fn();

  beforeEach(() => {
    mockOnAdd.mockClear();
  });

  describe('Basic rendering', () => {
    it('should render product information correctly', () => {
      render(<ProductCard product={mockProduct} onAdd={mockOnAdd} />);

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('SKU: TEST-001')).toBeInTheDocument();
      expect(screen.getByText('$1.000')).toBeInTheDocument();
      expect(screen.getByText('5 UN')).toBeInTheDocument();
      expect(screen.getByText('Agregar')).toBeInTheDocument();
    });

    it('should render product without SKU', () => {
      const productNoSku = { ...mockProduct, sku: null };
      render(<ProductCard product={productNoSku} onAdd={mockOnAdd} />);

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.queryByText(/SKU:/)).not.toBeInTheDocument();
    });

    it('should use fallback image when no images available', () => {
      render(<ProductCard product={mockProductNoImage} onAdd={mockOnAdd} />);

      const image = screen.getByAltText('Test Product');
      expect(image).toHaveAttribute('src', '/placeholder-product.png');
    });

    it('should prioritize medium image over original', () => {
      render(<ProductCard product={mockProduct} onAdd={mockOnAdd} />);

      const image = screen.getByAltText('Test Product');
      expect(image).toHaveAttribute('src', 'https://example.com/image-medium.jpg');
    });
  });

  describe('Stock management', () => {
    it('should show green badge for in-stock products', () => {
      render(<ProductCard product={mockProduct} onAdd={mockOnAdd} />);

      const stockBadge = screen.getByText('5 UN');
      expect(stockBadge).toHaveClass('bg-[#10B981]');
    });

    it('should show red badge for out-of-stock products', () => {
      render(<ProductCard product={mockProductNoStock} onAdd={mockOnAdd} />);

      const stockBadge = screen.getByText('0 UN');
      expect(stockBadge).toHaveClass('bg-[#EF4444]');
    });

    it('should disable add button for out-of-stock products', () => {
      render(<ProductCard product={mockProductNoStock} onAdd={mockOnAdd} />);

      const addButton = screen.getByText('Sin Stock');
      expect(addButton).toBeDisabled();
      expect(addButton).toHaveClass('bg-gray-300');
    });

    it('should enable add button for in-stock products', () => {
      render(<ProductCard product={mockProduct} onAdd={mockOnAdd} />);

      const addButton = screen.getByText('Agregar');
      expect(addButton).not.toBeDisabled();
      expect(addButton).toHaveClass('bg-[#8CC63F]');
    });
  });

  describe('Cart integration', () => {
    it('should show cart indicator when product is in cart', () => {
      render(
        <ProductCard
          product={mockProduct}
          onAdd={mockOnAdd}
          isInCart={true}
          cartQuantity={3}
        />
      );

      expect(screen.getByText('3x')).toBeInTheDocument();
      expect(screen.getByText('Agregar +1')).toBeInTheDocument();
    });

    it('should apply cart styling when product is in cart', () => {
      const { container } = render(
        <ProductCard
          product={mockProduct}
          onAdd={mockOnAdd}
          isInCart={true}
          cartQuantity={1}
        />
      );

      const productCard = container.firstChild;
      expect(productCard).toHaveClass('ring-2', 'ring-[#00AEEF]');
    });

    it('should not show cart indicator when not in cart', () => {
      render(<ProductCard product={mockProduct} onAdd={mockOnAdd} />);

      expect(screen.queryByText(/x$/)).not.toBeInTheDocument();
      expect(screen.getByText('Agregar')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    it('should call onAdd when add button is clicked', () => {
      render(<ProductCard product={mockProduct} onAdd={mockOnAdd} />);

      const addButton = screen.getByText('Agregar');
      fireEvent.click(addButton);

      expect(mockOnAdd).toHaveBeenCalledWith(mockProduct);
      expect(mockOnAdd).toHaveBeenCalledTimes(1);
    });

    it('should not call onAdd when product is out of stock', () => {
      render(<ProductCard product={mockProductNoStock} onAdd={mockOnAdd} />);

      const addButton = screen.getByText('Sin Stock');
      fireEvent.click(addButton);

      expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it('should have hover effects', () => {
      const { container } = render(
        <ProductCard product={mockProduct} onAdd={mockOnAdd} />
      );

      const productCard = container.firstChild;
      expect(productCard).toHaveClass('hover:shadow-lg', 'hover:scale-[1.02]');
    });
  });

  describe('Price formatting', () => {
    it('should format Chilean peso prices correctly', () => {
      const expensiveProduct = { ...mockProduct, price: 1500000 };
      render(<ProductCard product={expensiveProduct} onAdd={mockOnAdd} />);

      expect(screen.getByText('$1.500.000')).toBeInTheDocument();
    });

    it('should handle decimal prices', () => {
      const decimalProduct = { ...mockProduct, price: 999.99 };
      render(<ProductCard product={decimalProduct} onAdd={mockOnAdd} />);

      expect(screen.getByText('$1.000')).toBeInTheDocument(); // Should round to nearest
    });
  });

  describe('Accessibility', () => {
    it('should have proper image alt text', () => {
      render(<ProductCard product={mockProduct} onAdd={mockOnAdd} />);

      const image = screen.getByAltText('Test Product');
      expect(image).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<ProductCard product={mockProduct} onAdd={mockOnAdd} />);

      const addButton = screen.getByText('Agregar');
      addButton.focus();
      
      fireEvent.keyDown(addButton, { key: 'Enter' });
      expect(mockOnAdd).toHaveBeenCalledWith(mockProduct);
    });
  });
});