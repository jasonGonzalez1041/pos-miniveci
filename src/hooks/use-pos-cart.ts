'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNetworkState } from './use-network-state';
import { 
  insertCartItemDual, 
  updateCartItemDual, 
  deleteCartItemDual,
  clearCartDual,
  getCartItems
} from '@/lib/db/dual-db-operations';
import type { Product, CartItem } from '@/lib/db/schema';

/**
 * Hook de gestión del carrito POS
 * 
 * @description
 * - Persistencia dual (IndexedDB + Turso)
 * - Offline-first con sync automático
 * - Optimistic updates
 * - Session ID para múltiples cajas
 * 
 * @performance
 * - useCallback para handlers (evita re-renders)
 * - useMemo para total (cálculo pesado)
 * - Debounce en sync a cloud (no cada keystroke)
 * 
 * @example
 * ```tsx
 * const { cart, addItem, total, isOnline } = usePosCart();
 * 
 * <Button onClick={() => addItem(product)}>
 *   Agregar
 * </Button>
 * ```
 */
export function usePosCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline, pendingChanges } = useNetworkState();
  
  // Session ID único por caja (persiste en localStorage)
  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') return 'server';
    
    let id = localStorage.getItem('pos-session-id');
    if (!id) {
      id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('pos-session-id', id);
    }
    return id;
  }, []);
  
  // Cargar carrito desde IndexedDB al montar
  useEffect(() => {
    loadCart();
  }, [sessionId]);

  const loadCart = async () => {
    try {
      const items = await getCartItems(sessionId);
      setCart(items);
    } catch (error) {
      console.error('❌ Failed to load cart:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Agrega producto al carrito
   * Si ya existe, incrementa cantidad
   */
  const addItem = useCallback(async (product: Product) => {
    try {
      const existingItem = cart.find(item => item.productId === product.id);
      
      if (existingItem) {
        // Incrementar cantidad
        await updateQuantity(existingItem.id, existingItem.quantity + 1);
      } else {
        // Nuevo item
        const imageUrl = product.imageMedium || product.imageOriginal || null;
        
        const newItem = {
          id: crypto.randomUUID(),
          sessionId,
          productId: product.id,
          name: product.name,
          image: imageUrl,
          unitPrice: product.price,
          quantity: 1,
          subtotal: product.price,
          createdAt: new Date(),
        };
        
        // Optimistic update
        setCart(prev => [...prev, newItem]);
        
        // Persistencia dual (local + cloud)
        await insertCartItemDual(newItem);
      }
    } catch (error) {
      console.error('❌ Failed to add item to cart:', error);
      // Revertir optimistic update
      await loadCart();
    }
  }, [cart, sessionId]);
  
  /**
   * Actualiza cantidad de item
   */
  const updateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    const newSubtotal = item.unitPrice * newQuantity;
    
    // Optimistic update
    setCart(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      return {
        ...i,
        quantity: newQuantity,
        subtotal: newSubtotal,
      };
    }));
    
    try {
      // Persistencia dual
      await updateCartItemDual(itemId, {
        quantity: newQuantity,
        subtotal: newSubtotal,
      });
    } catch (error) {
      console.error('❌ Failed to update cart item:', error);
      // Revertir optimistic update
      await loadCart();
    }
  }, [cart]);
  
  /**
   * Elimina item del carrito
   */
  const removeItem = useCallback(async (itemId: string) => {
    // Optimistic update
    setCart(prev => prev.filter(item => item.id !== itemId));
    
    try {
      // Persistencia dual
      await deleteCartItemDual(itemId);
    } catch (error) {
      console.error('❌ Failed to remove cart item:', error);
      // Revertir optimistic update
      await loadCart();
    }
  }, []);
  
  /**
   * Incrementa cantidad (shortcut)
   */
  const incrementItem = useCallback(async (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    if (item) {
      await updateQuantity(itemId, item.quantity + 1);
    }
  }, [cart, updateQuantity]);
  
  /**
   * Decrementa cantidad (shortcut)
   */
  const decrementItem = useCallback(async (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    if (item) {
      if (item.quantity <= 1) {
        await removeItem(itemId);
      } else {
        await updateQuantity(itemId, item.quantity - 1);
      }
    }
  }, [cart, updateQuantity, removeItem]);
  
  /**
   * Limpia carrito completo
   */
  const clearCart = useCallback(async () => {
    // Optimistic update
    setCart([]);
    
    try {
      // Persistencia dual
      await clearCartDual(sessionId);
    } catch (error) {
      console.error('❌ Failed to clear cart:', error);
      // Revertir optimistic update
      await loadCart();
    }
  }, [sessionId]);
  
  /**
   * Calcula subtotal del carrito (memoizado)
   */
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);
  
  /**
   * Calcula IVA (19% en Chile)
   */
  const tax = useMemo(() => {
    return subtotal * 0.19;
  }, [subtotal]);
  
  /**
   * Calcula total del carrito (memoizado)
   */
  const total = useMemo(() => {
    return subtotal + tax;
  }, [subtotal, tax]);
  
  /**
   * Contador de items
   */
  const itemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);
  
  /**
   * Verifica si carrito está vacío
   */
  const isEmpty = useMemo(() => {
    return cart.length === 0;
  }, [cart]);
  
  /**
   * Obtiene item por ID
   */
  const getItem = useCallback((itemId: string) => {
    return cart.find(item => item.id === itemId);
  }, [cart]);
  
  /**
   * Verifica si producto está en carrito
   */
  const hasProduct = useCallback((productId: string) => {
    return cart.some(item => item.productId === productId);
  }, [cart]);
  
  /**
   * Obtiene cantidad de un producto específico
   */
  const getProductQuantity = useCallback((productId: string) => {
    const item = cart.find(item => item.productId === productId);
    return item?.quantity || 0;
  }, [cart]);

  return {
    // State
    cart,
    isLoading,
    isEmpty,
    
    // Calculations
    subtotal,
    tax,
    total,
    itemCount,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    incrementItem,
    decrementItem,
    clearCart,
    
    // Utils
    getItem,
    hasProduct,
    getProductQuantity,
    
    // Network state
    isOnline,
    pendingChanges,
    sessionId,
  };
}