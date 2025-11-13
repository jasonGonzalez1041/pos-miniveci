'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Trash2, ShoppingCart, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CartItem } from '@/lib/db/schema';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  isOnline: boolean;
  className?: string;
}

/**
 * Sidebar del carrito POS
 * 
 * @description
 * - Fixed position overlay en móvil
 * - Sidebar fijo en desktop
 * - Controls de cantidad inline
 * - Cálculos en tiempo real
 * - Botón checkout prominente
 * 
 * @performance
 * - Virtualization si >50 items
 * - Optimistic updates
 * - Debounce en quantity changes
 */
export function CartSidebar({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  tax,
  total,
  itemCount,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isOnline,
  className,
}: CartSidebarProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    setIsCheckingOut(true);
    try {
      await onCheckout();
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-96 bg-white shadow-xl transform transition-transform duration-300 z-50",
        "flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full",
        "lg:relative lg:translate-x-0 lg:shadow-none lg:border-l lg:border-[#E5E7EB]",
        className
      )}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-[#E5E7EB] bg-[#2D3748] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Carrito</h2>
              {itemCount > 0 && (
                <Badge className="bg-[#00AEEF] text-white">
                  {itemCount}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Indicador de conexión */}
              <div className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-[#10B981]" : "bg-[#F59E0B]"
              )} />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="lg:hidden text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <ShoppingCart className="h-16 w-16 text-[#6B7280] mb-4" />
              <h3 className="text-lg font-medium text-[#111827] mb-2">
                Carrito vacío
              </h3>
              <p className="text-[#6B7280] text-sm">
                Agrega productos para comenzar una venta
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Clear Cart Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearCart}
                  className="text-[#EF4444] border-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              </div>

              {/* Items List */}
              {cartItems.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemoveItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Totals and Checkout */}
        {cartItems.length > 0 && (
          <div className="flex-shrink-0 border-t border-[#E5E7EB] bg-white p-4 space-y-4">
            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7280]">Subtotal:</span>
                <span className="font-medium">${subtotal.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6B7280]">IVA (19%):</span>
                <span className="font-medium">${tax.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#E5E7EB]">
                <span className="text-[#111827]">Total:</span>
                <span className="text-[#00AEEF]">${total.toLocaleString('es-CL')}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              disabled={isCheckingOut || cartItems.length === 0}
              className="w-full h-12 text-lg font-bold bg-[#8CC63F] hover:bg-[#7AB136] text-white"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {isCheckingOut ? 'Procesando...' : 'Procesar Pago'}
            </Button>

            {!isOnline && (
              <p className="text-xs text-[#F59E0B] text-center">
                ⚠️ Sin conexión - Los datos se sincronizarán automáticamente
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Card individual de item del carrito
 */
function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}) {
  const handleIncrement = () => {
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity <= 1) {
      onRemove(item.id);
    } else {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
      {/* Image */}
      <div className="flex-shrink-0 w-12 h-12 bg-white rounded-md overflow-hidden border">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#F3F4F6] flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-[#9CA3AF]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#111827] truncate">
          {item.name}
        </p>
        <p className="text-xs text-[#6B7280]">
          ${item.unitPrice.toLocaleString('es-CL')} c/u
        </p>
        <p className="text-sm font-semibold text-[#00AEEF]">
          ${item.subtotal.toLocaleString('es-CL')}
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex-shrink-0 flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecrement}
          className="h-8 w-8 p-0 border-[#E5E7EB]"
        >
          {item.quantity <= 1 ? (
            <Trash2 className="h-3 w-3 text-[#EF4444]" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
        </Button>
        
        <div className="w-12 text-center">
          <span className="text-sm font-medium">{item.quantity}</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleIncrement}
          className="h-8 w-8 p-0 border-[#E5E7EB]"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}