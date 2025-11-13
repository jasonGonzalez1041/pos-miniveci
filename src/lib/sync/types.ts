/**
 * Tipos para integración WooCommerce y sistema de sincronización
 */

export interface WooWebhookPayload {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }>;
  default_attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: Array<{
    id: number;
    key: string;
    value: string | number | boolean;
  }>;
}

export type WooProduct = WooWebhookPayload;

export interface OptimizedImages {
  thumb: string;
  medium: string;
  large: string;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export interface SyncStats {
  total: number;
  processed: number;
  failed: number;
  skipped: number;
  startTime: Date;
  endTime?: Date;
}

// Branded types para type safety
export type ProductId = string & { readonly brand: unique symbol };
export type UserId = string & { readonly brand: unique symbol };
export type SessionId = string & { readonly brand: unique symbol };
export type SaleId = string & { readonly brand: unique symbol };

export interface InternalProduct {
  id: ProductId;
  name: string;
  price: number;
  stock: number;
  stockStatus: 'instock' | 'outofstock' | 'onbackorder';
  category: string;
  imageThumb: string | null;
  imageMedium: string | null;
  imageLarge: string | null;
  imageOriginal: string | null;
  sku: string | null;
  description: string | null;
  unit: string;
  synced: boolean;
  lastSyncedAt: Date | null;
  updatedAt: Date;
}

export interface CartItemData {
  id: string;
  sessionId: SessionId;
  productId: ProductId;
  name: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  createdAt: Date;
}

export interface SaleData {
  id: SaleId;
  saleNumber: number;
  userId: UserId;
  items: CartItemData[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mixed';
  status: 'completed' | 'pending' | 'cancelled';
  syncedToWoo: boolean;
  wooOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetworkState {
  isOnline: boolean;
  pendingChanges: number;
  lastSync: Date | null;
  isSyncing: boolean;
}