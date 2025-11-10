// POS utility functions
// Business logic helpers for Point of Sale operations

export const formatPrice = (priceInCents: number): string => {
  return `$${(priceInCents / 100).toFixed(2)}`;
};

export const calculateTotal = (items: Array<{ price: number; quantity: number }>): number => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

export const validateStock = (available: number, requested: number): { valid: boolean; message?: string } => {
  if (requested <= 0) {
    return { valid: false, message: 'La cantidad debe ser mayor a 0' };
  }
  
  if (requested > available) {
    return { valid: false, message: `Stock insuficiente. Disponible: ${available}` };
  }
  
  return { valid: true };
};

export const generateSaleId = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `POS-${timestamp}-${random}`;
};

export const calculateChange = (total: number, payment: number): number => {
  return Math.max(0, payment - total);
};

export const applyDiscount = (subtotal: number, discountPercent: number): number => {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('El descuento debe estar entre 0 y 100%');
  }
  
  const discount = Math.round(subtotal * (discountPercent / 100));
  return subtotal - discount;
};

export const validatePayment = (total: number, payment: number): { valid: boolean; message?: string } => {
  if (payment < 0) {
    return { valid: false, message: 'El pago no puede ser negativo' };
  }
  
  if (payment < total) {
    return { valid: false, message: 'El pago es insuficiente' };
  }
  
  return { valid: true };
};