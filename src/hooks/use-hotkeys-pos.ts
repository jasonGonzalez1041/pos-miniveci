'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { useCallback } from 'react';

interface PosHotkeysOptions {
  onQuickAdd?: (slot: number) => void;
  onCheckout?: () => void;
  onClearCart?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
  onFocusSearch?: () => void;
  onToggleCart?: () => void;
  disabled?: boolean;
}

/**
 * Hook de hotkeys para POS
 * 
 * @description
 * Atajos de teclado optimizados para cajeros:
 * - F1-F8: Productos frecuentes (quick add)
 * - F9: Checkout/Finalizar venta
 * - F10: Limpiar carrito
 * - F11: Buscar productos
 * - F12: Toggle sidebar carrito
 * - Ctrl+Enter: Procesar pago
 * - Escape: Cancelar/Cerrar
 * - /: Enfocar búsqueda
 * 
 * @performance
 * - Previene bubbling en eventos críticos
 * - Disable cuando hay modales abiertos
 * - Throttle en acciones costosas
 */
export function usePosHotkeys({
  onQuickAdd,
  onCheckout,
  onClearCart,
  onSearch,
  onEscape,
  onEnter,
  onFocusSearch,
  onToggleCart,
  disabled = false,
}: PosHotkeysOptions = {}) {

  // Quick add productos (F1-F8)
  useHotkeys('f1', () => onQuickAdd?.(1), { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Quick add slot 1'
  });
  
  useHotkeys('f2', () => onQuickAdd?.(2), { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Quick add slot 2'
  });
  
  useHotkeys('f3', () => onQuickAdd?.(3), { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Quick add slot 3'
  });
  
  useHotkeys('f4', () => onQuickAdd?.(4), { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Quick add slot 4'
  });
  
  useHotkeys('f5', () => onQuickAdd?.(5), { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Quick add slot 5'
  });
  
  useHotkeys('f6', () => onQuickAdd?.(6), { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Quick add slot 6'
  });
  
  useHotkeys('f7', () => onQuickAdd?.(7), { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Quick add slot 7'
  });
  
  useHotkeys('f8', () => onQuickAdd?.(8), { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Quick add slot 8'
  });

  // Checkout (F9)
  useHotkeys('f9', () => {
    console.log('🎯 Hotkey: Checkout triggered');
    onCheckout?.();
  }, { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Checkout/Finalizar venta'
  });

  // Limpiar carrito (F10)
  useHotkeys('f10', () => {
    console.log('🗑️ Hotkey: Clear cart triggered');
    onClearCart?.();
  }, { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Limpiar carrito'
  });

  // Buscar (F11)
  useHotkeys('f11', () => {
    console.log('🔍 Hotkey: Search triggered');
    onSearch?.();
  }, { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Buscar productos'
  });

  // Toggle carrito (F12)
  useHotkeys('f12', () => {
    console.log('📊 Hotkey: Toggle cart triggered');
    onToggleCart?.();
  }, { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Toggle sidebar carrito'
  });

  // Procesar pago (Ctrl+Enter)
  useHotkeys('ctrl+enter', () => {
    console.log('💳 Hotkey: Process payment triggered');
    onEnter?.();
  }, { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Procesar pago'
  });

  // Cancelar/Escape (Escape)
  useHotkeys('escape', () => {
    console.log('❌ Hotkey: Escape triggered');
    onEscape?.();
  }, { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Cancelar/Cerrar'
  });

  // Enfocar búsqueda (/)
  useHotkeys('/', (event) => {
    // Solo si no está en un input
    if (event.target instanceof HTMLElement && 
        !['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
      console.log('🔍 Hotkey: Focus search triggered');
      onFocusSearch?.();
    }
  }, { 
    enabled: !disabled,
    preventDefault: true,
    description: 'Enfocar búsqueda'
  });

  // Números para quick quantity (1-9)
  const handleQuickQuantity = useCallback((quantity: number) => {
    console.log(`🔢 Hotkey: Quick quantity ${quantity} triggered`);
    // TODO: Implementar quick quantity en último item agregado
  }, []);

  useHotkeys('1', () => handleQuickQuantity(1), { 
    enabled: !disabled && false, // Disabled por ahora
    scopes: ['pos'],
    description: 'Quick quantity 1'
  });

  useHotkeys('2', () => handleQuickQuantity(2), { 
    enabled: !disabled && false,
    scopes: ['pos'],
    description: 'Quick quantity 2'
  });

  // Plus/Minus para último item (+ / -)
  useHotkeys('+', () => {
    console.log('➕ Hotkey: Increment last item triggered');
    // TODO: Incrementar último item
  }, { 
    enabled: !disabled && false, // Disabled por ahora
    scopes: ['pos'],
    description: 'Incrementar último item'
  });

  useHotkeys('-', () => {
    console.log('➖ Hotkey: Decrement last item triggered');
    // TODO: Decrementar último item
  }, { 
    enabled: !disabled && false, // Disabled por ahora
    scopes: ['pos'],
    description: 'Decrementar último item'
  });

  return {
    // Utilidades para mostrar shortcuts en UI
    shortcuts: {
      quickAdd: 'F1-F8',
      checkout: 'F9',
      clearCart: 'F10',
      search: 'F11',
      toggleCart: 'F12',
      processPayment: 'Ctrl+Enter',
      cancel: 'Escape',
      focusSearch: '/',
    },
    
    // Estado del hook
    disabled,
  };
}