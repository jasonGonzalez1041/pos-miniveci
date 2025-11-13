'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/db/schema';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  isInCart?: boolean;
  cartQuantity?: number;
}

/**
 * Card de producto para grid POS
 * 
 * @description
 * - Dimensiones: w-full h-[280px]
 * - Imagen optimizada: usa 'medium' (600x600, ~50KB)
 * - Badge stock dinámico (verde/rojo)
 * - Hover effect: scale + shadow
 * - Memoizado para performance
 * 
 * @performance
 * - React.memo evita re-renders innecesarios
 * - next/image con lazy loading
 * - Transiciones CSS puras (no JS)
 */
export const ProductCard = memo(function ProductCard({ 
  product, 
  onAdd,
  isInCart = false,
  cartQuantity = 0,
}: ProductCardProps) {
  const hasStock = (product.stock ?? 0) > 0;
  const imageUrl = product.imageMedium || product.imageOriginal || '/placeholder-product.png';
  
  return (
    <div className={cn(
      "group relative w-full h-[280px] bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-200 overflow-hidden",
      "hover:shadow-lg hover:scale-[1.02]",
      isInCart && "ring-2 ring-[#00AEEF] ring-opacity-50"
    )}>
      {/* Image Container */}
      <div className="relative h-32 w-full bg-gray-100">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 20vw"
          className="object-cover"
          loading="lazy"
          quality={85}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyOpA4Yn7Af2jQfhfFavsehsjjNJrGOcfnLLxWEgkOyJm5jtNmGgBsKLtqjA="
        />
        
        {/* Stock Badge */}
        <Badge 
          className={cn(
            'absolute top-2 right-2 font-bold text-xs',
            hasStock 
              ? 'bg-[#10B981] hover:bg-[#059669] text-white' 
              : 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
          )}
        >
          {product.stock ?? 0} UN
        </Badge>
        
        {/* Cart Indicator */}
        {isInCart && cartQuantity > 0 && (
          <Badge className="absolute top-2 left-2 bg-[#00AEEF] hover:bg-[#0099D4] text-white font-bold">
            {cartQuantity}x
          </Badge>
        )}
      </div>
      
      {/* Info Container */}
      <div className="p-3 flex flex-col justify-between h-[148px]">
        {/* Name */}
        <div className="min-h-[40px]">
          <p className="text-sm font-medium text-[#111827] line-clamp-2 leading-tight">
            {product.name}
          </p>
          {product.sku && (
            <p className="text-xs text-[#6B7280] mt-1">
              SKU: {product.sku}
            </p>
          )}
        </div>
        
        {/* Price */}
        <p className="text-2xl font-bold text-[#00AEEF] py-1">
          ${product.price.toLocaleString('es-CL')}
        </p>
        
        {/* Add Button */}
        <Button
          onClick={() => onAdd(product)}
          disabled={!hasStock}
          className={cn(
            'w-full font-bold py-3 text-base transition-all duration-200',
            hasStock
              ? 'bg-[#8CC63F] hover:bg-[#7AB136] text-white shadow-sm hover:shadow-md'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          {hasStock ? (
            isInCart ? 'Agregar +1' : 'Agregar'
          ) : (
            'Sin Stock'
          )}
        </Button>
      </div>
      
      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
    </div>
  );
});

ProductCard.displayName = 'ProductCard';