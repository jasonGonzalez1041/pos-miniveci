'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Filter, Grid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from './product-card';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/db/schema';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  cartItems?: Array<{ productId: string; quantity: number }>;
  isLoading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

/**
 * Grid virtualizado de productos con búsqueda y filtros
 * 
 * @description
 * - Virtualización para 3000+ productos sin lag
 * - Búsqueda en tiempo real (debounced)
 * - Filtros por categoría y stock
 * - Vista grid/lista responsive
 * - Keyboard navigation
 * 
 * @performance
 * - @tanstack/react-virtual para rendimiento
 * - useMemo para filtros pesados
 * - Debounce en búsqueda (300ms)
 * - Lazy loading de imágenes
 */
export function ProductGrid({
  products,
  onAddToCart,
  cartItems = [],
  isLoading = false,
  searchQuery = '',
  onSearchChange,
}: ProductGridProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Sync external search query
  useEffect(() => {
    setInternalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearchChange?.(internalSearchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [internalSearchQuery, onSearchChange]);

  // Memoized filtered products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Búsqueda por texto
    if (internalSearchQuery.trim()) {
      const query = internalSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      );
    }

    // Filtro por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.category === selectedCategory
      );
    }

    // Filtro por stock
    if (showOnlyInStock) {
      filtered = filtered.filter(product => 
        product.stock > 0 && product.stockStatus === 'instock'
      );
    }

    return filtered;
  }, [products, internalSearchQuery, selectedCategory, showOnlyInStock]);

  // Categorías disponibles
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  // Cart lookup para performance
  const cartLookup = useMemo(() => {
    const lookup = new Map<string, number>();
    cartItems.forEach(item => {
      lookup.set(item.productId, item.quantity);
    });
    return lookup;
  }, [cartItems]);

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredProducts.length / (viewMode === 'grid' ? 4 : 1)),
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === 'grid' ? 300 : 120),
    overscan: 5,
  });

  // Focus search shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClearSearch = () => {
    setInternalSearchQuery('');
    searchInputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* Search and Filters Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-[#E5E7EB] space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] h-4 w-4" />
          <Input
            ref={searchInputRef}
            placeholder="Buscar productos... (presiona '/' para enfocar)"
            value={internalSearchQuery}
            onChange={(e) => setInternalSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-12 text-base border-[#E5E7EB] focus:border-[#00AEEF] focus:ring-[#00AEEF]"
          />
          {internalSearchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
            >
              ✕
            </Button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-[#E5E7EB] rounded-md bg-white text-sm focus:border-[#00AEEF] focus:ring-[#00AEEF]"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <Button
            variant={showOnlyInStock ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyInStock(!showOnlyInStock)}
            className={cn(
              showOnlyInStock && "bg-[#10B981] hover:bg-[#059669] text-white"
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            Solo con stock
          </Button>

          {/* View Mode Toggle */}
          <div className="ml-auto flex border border-[#E5E7EB] rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                "rounded-none border-0",
                viewMode === 'grid' && "bg-[#00AEEF] hover:bg-[#0099D4]"
              )}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn(
                "rounded-none border-0",
                viewMode === 'list' && "bg-[#00AEEF] hover:bg-[#0099D4]"
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex justify-between items-center text-sm text-[#6B7280]">
          <span>
            {filteredProducts.length} productos
            {internalSearchQuery && ` (filtrados de ${products.length})`}
          </span>
          {isLoading && <span>Cargando...</span>}
        </div>
      </div>

      {/* Products Grid */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ height: '100%' }}
      >
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Search className="h-12 w-12 text-[#6B7280] mb-4" />
            <h3 className="text-lg font-semibold text-[#111827] mb-2">
              No se encontraron productos
            </h3>
            <p className="text-[#6B7280] max-w-md">
              {internalSearchQuery 
                ? `No hay productos que coincidan con "${internalSearchQuery}"`
                : "No hay productos disponibles en este momento"
              }
            </p>
            {internalSearchQuery && (
              <Button
                variant="outline"
                onClick={handleClearSearch}
                className="mt-4"
              >
                Limpiar búsqueda
              </Button>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * (viewMode === 'grid' ? 4 : 1);
              const endIndex = Math.min(
                startIndex + (viewMode === 'grid' ? 4 : 1),
                filteredProducts.length
              );
              const rowProducts = filteredProducts.slice(startIndex, endIndex);

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className={cn(
                    "p-4",
                    viewMode === 'grid' 
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "space-y-2"
                  )}>
                    {rowProducts.map((product) => {
                      const cartQuantity = cartLookup.get(product.id) || 0;
                      const isInCart = cartQuantity > 0;

                      return (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAdd={onAddToCart}
                          isInCart={isInCart}
                          cartQuantity={cartQuantity}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}