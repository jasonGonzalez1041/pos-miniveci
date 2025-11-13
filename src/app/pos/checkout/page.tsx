'use client';

import { useState, useEffect } from 'react';
import { CheckoutHeader } from '@/components/ui/pos/checkout-header';
import { ProductGrid } from '@/components/ui/pos/product-grid';
import { CartSidebar } from '@/components/ui/pos/cart-sidebar';
import { usePosCart } from '@/hooks/use-pos-cart';
import { useNetworkState } from '@/hooks/use-network-state';
import { usePosHotkeys } from '@/hooks/use-hotkeys-pos';
import { getAllProducts } from '@/lib/db/dual-db-operations';
import { insertSaleDual } from '@/lib/db/dual-db-operations';
import { toast } from 'sonner';
import type { Product } from '@/lib/db/schema';

/**
 * Página principal del POS - Checkout
 * 
 * @description
 * - Interface completa de punto de venta
 * - Grid de productos con búsqueda
 * - Carrito lateral con cálculos
 * - Header con estado del sistema
 * - Hotkeys para operación rápida
 * - Offline-first con sync automático
 * 
 * @features
 * - ✅ Productos con imágenes optimizadas
 * - ✅ Carrito persistente por sesión
 * - ✅ Checkout con generación de venta
 * - ✅ Hotkeys (F9 checkout, F10 clear, etc)
 * - ✅ Estado de red y sync
 * - ✅ Responsive design
 * 
 * @colors
 * - Primary: #00AEEF (azul MiniVeci)
 * - Accent: #8CC63F (verde botones)
 * - Background: #F9FAFB
 * - Sidebar: #2D3748
 * - Success: #10B981
 * - Error: #EF4444
 */
export default function CheckoutPage() {
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Hooks
  const {
    cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    tax,
    total,
    itemCount,
    isLoading: isCartLoading,
    isOnline,
    sessionId,
  } = usePosCart();

  const {
    triggerSync,
    triggerFullSync,
    lastSync,
    isSyncing,
    pendingChanges,
  } = useNetworkState();

  // Cargar productos
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const productData = await getAllProducts();
      setProducts(productData);
      
      if (productData.length === 0) {
        toast.info('No hay productos disponibles. Ejecuta una sincronización para cargar productos desde WooCommerce.');
      }
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Handlers
  const handleAddToCart = async (product: Product) => {
    try {
      await addItem(product);
      toast.success(`${product.name} agregado al carrito`);
    } catch (error) {
      console.error('❌ Failed to add to cart:', error);
      toast.error('Error al agregar producto');
    }
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      await updateQuantity(itemId, quantity);
    } catch (error) {
      console.error('❌ Failed to update quantity:', error);
      toast.error('Error al actualizar cantidad');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast.success('Producto eliminado del carrito');
    } catch (error) {
      console.error('❌ Failed to remove item:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const handleClearCart = async () => {
    if (cart.length === 0) return;

    try {
      await clearCart();
      toast.success('Carrito limpiado');
    } catch (error) {
      console.error('❌ Failed to clear cart:', error);
      toast.error('Error al limpiar carrito');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    try {
      setIsCheckingOut(true);

      // Generar número de venta (en producción sería más robusto)
      const saleNumber = Date.now();

      // Crear venta
      const sale = {
        id: crypto.randomUUID(),
        saleNumber,
        userId: 'current-user-id', // TODO: Get from auth context
        items: JSON.stringify(cart),
        subtotal,
        tax,
        total,
        paymentMethod: 'cash' as const, // TODO: Payment method selection
        status: 'completed' as const,
        syncedToWoo: false,
        wooOrderId: null,
      };

      await insertSaleDual(sale);

      // Limpiar carrito
      await clearCart();

      // Cerrar sidebar en móvil
      setIsCartOpen(false);

      toast.success(`Venta #${saleNumber} procesada exitosamente`, {
        description: `Total: $${total.toLocaleString('es-CL')}`,
        duration: 5000,
      });

      console.log('✅ Sale processed:', sale);

    } catch (error) {
      console.error('❌ Failed to process sale:', error);
      toast.error('Error al procesar la venta');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleManualSync = async () => {
    try {
      toast.loading('Sincronizando con WooCommerce...');
      const success = await triggerSync();
      
      if (success) {
        toast.success('Sincronización completada');
        await loadProducts(); // Recargar productos
      } else {
        toast.error('Error en la sincronización');
      }
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      toast.error('Error en la sincronización');
    }
  };

  // Hotkeys
  usePosHotkeys({
    onCheckout: handleCheckout,
    onClearCart: handleClearCart,
    onToggleCart: () => setIsCartOpen(!isCartOpen),
    onFocusSearch: () => {
      // Focus search input
      const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
      searchInput?.focus();
    },
    disabled: isCheckingOut,
  });

  // Auto-open cart en desktop cuando hay items
  useEffect(() => {
    if (itemCount > 0 && window.innerWidth >= 1024) {
      setIsCartOpen(true);
    }
  }, [itemCount]);

  return (
    <div className="h-screen flex flex-col bg-[#F9FAFB]">
      {/* Header */}
      <CheckoutHeader
        userName="Cajero Principal"
        userRole="cashier"
        isOnline={isOnline}
        isSyncing={isSyncing}
        lastSync={lastSync}
        cartItemCount={itemCount}
        cartTotal={total}
        onToggleCart={() => setIsCartOpen(!isCartOpen)}
        onManualSync={handleManualSync}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products Grid */}
        <div className="flex-1 flex flex-col min-w-0">
          <ProductGrid
            products={products}
            onAddToCart={handleAddToCart}
            cartItems={cart.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
            }))}
            isLoading={isLoadingProducts}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Cart Sidebar */}
        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          itemCount={itemCount}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onCheckout={handleCheckout}
          isOnline={isOnline}
          className="lg:w-96"
        />
      </div>

      {/* Loading Overlay */}
      {(isCartLoading || isCheckingOut) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#00AEEF]"></div>
            <span className="font-medium">
              {isCartLoading ? 'Cargando carrito...' : 'Procesando venta...'}
            </span>
          </div>
        </div>
      )}

      {/* Hotkeys Help (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs space-y-1">
          <p className="font-semibold">Hotkeys:</p>
          <p>F9 - Checkout</p>
          <p>F10 - Limpiar carrito</p>
          <p>F11 - Buscar</p>
          <p>F12 - Toggle carrito</p>
          <p>/ - Enfocar búsqueda</p>
          <p>Esc - Cancelar</p>
        </div>
      )}
    </div>
  );
}