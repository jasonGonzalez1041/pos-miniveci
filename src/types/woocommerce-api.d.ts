declare module 'woocommerce-api' {
  interface WooCommerceConfig {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    wpAPI?: boolean;
    version?: string;
    verifySsl?: boolean;
    encoding?: string;
    queryStringAuth?: boolean;
    port?: string | number;
    timeout?: number;
  }

  interface WooCommerceProduct {
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
    downloads: any[];
    download_limit: number;
    download_expiry: number;
    external_url: string;
    button_text: string;
    tax_status: string;
    tax_class: string;
    manage_stock: boolean;
    stock_quantity: number | null;
    stock_status: 'instock' | 'outofstock' | 'onbackorder';
    backorders: string;
    backorders_allowed: boolean;
    backordered: boolean;
    sold_individually: boolean;
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
    attributes: any[];
    default_attributes: any[];
    variations: number[];
    grouped_products: number[];
    menu_order: number;
    meta_data: Array<{
      id: number;
      key: string;
      value: any;
    }>;
  }

  interface WooCommerceOrder {
    id: number;
    parent_id: number;
    number: string;
    order_key: string;
    created_via: string;
    version: string;
    status: string;
    currency: string;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    discount_total: string;
    discount_tax: string;
    shipping_total: string;
    shipping_tax: string;
    cart_tax: string;
    total: string;
    total_tax: string;
    prices_include_tax: boolean;
    customer_id: number;
    customer_ip_address: string;
    customer_user_agent: string;
    customer_note: string;
    billing: any;
    shipping: any;
    payment_method: string;
    payment_method_title: string;
    transaction_id: string;
    date_paid: string | null;
    date_paid_gmt: string | null;
    date_completed: string | null;
    date_completed_gmt: string | null;
    cart_hash: string;
    meta_data: any[];
    line_items: Array<{
      id: number;
      name: string;
      product_id: number;
      variation_id: number;
      quantity: number;
      tax_class: string;
      subtotal: string;
      subtotal_tax: string;
      total: string;
      total_tax: string;
      taxes: any[];
      meta_data: any[];
      sku: string;
      price: number;
    }>;
    tax_lines: any[];
    shipping_lines: any[];
    fee_lines: any[];
    coupon_lines: any[];
    refunds: any[];
  }

  interface WooCommerceResponse<T> {
    data: T;
    headers: any;
  }

  interface WooCommerceListResponse<T> extends WooCommerceResponse<T[]> {
    headers: any & {
      'x-wp-total': string;
      'x-wp-totalpages': string;
    };
  }

  interface WooCommerceAPI {
    get(endpoint: string, params?: any): Promise<WooCommerceResponse<any>>;
    post(endpoint: string, data: any, params?: any): Promise<WooCommerceResponse<any>>;
    put(endpoint: string, data: any, params?: any): Promise<WooCommerceResponse<any>>;
    delete(endpoint: string, params?: any): Promise<WooCommerceResponse<any>>;
  }

  class WooCommerce {
    constructor(config: WooCommerceConfig);
    get(endpoint: string, params?: any): Promise<WooCommerceResponse<any>>;
    post(endpoint: string, data: any, params?: any): Promise<WooCommerceResponse<any>>;
    put(endpoint: string, data: any, params?: any): Promise<WooCommerceResponse<any>>;
    delete(endpoint: string, params?: any): Promise<WooCommerceResponse<any>>;
  }

  export = WooCommerce;
}