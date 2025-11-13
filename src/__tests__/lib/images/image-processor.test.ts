import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { processProductImage, deleteProductImages } from '@/lib/images/image-processor';
import type { WooWebhookPayload } from '@/lib/sync/types';

// Mock Sharp
const mockSharp = {
  resize: vi.fn().mockReturnThis(),
  webp: vi.fn().mockReturnThis(),
  toBuffer: vi.fn(),
};

vi.mock('sharp', () => {
  return {
    default: vi.fn(() => mockSharp),
  };
});

// Mock AWS S3 Client
const mockS3Send = vi.fn();
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

/**
 * Tests for image processing pipeline
 * 
 * @description
 * Tests image optimization with Sharp and Cloudflare R2:
 * - Image download from WordPress
 * - Sharp processing (3 variants)
 * - R2 upload with proper metadata
 * - Error handling and fallbacks
 * - SKU sanitization
 */
describe('image-processor', () => {
  const mockProduct: WooWebhookPayload = {
    id: 123,
    name: 'Test Product',
    sku: 'TEST-123',
    images: [
      {
        id: 1,
        src: 'https://wordpress.example.com/image.jpg',
        name: 'test-image.jpg',
        alt: 'Test Image',
        date_created: '2024-01-01T00:00:00',
        date_created_gmt: '2024-01-01T00:00:00',
        date_modified: '2024-01-01T00:00:00',
        date_modified_gmt: '2024-01-01T00:00:00',
      }
    ],
    // Required fields for WooWebhookPayload
    slug: 'test-product',
    permalink: 'https://example.com/product/test-product',
    date_created: '2024-01-01T00:00:00',
    date_created_gmt: '2024-01-01T00:00:00',
    date_modified: '2024-01-01T00:00:00',
    date_modified_gmt: '2024-01-01T00:00:00',
    type: 'simple',
    status: 'publish',
    featured: false,
    catalog_visibility: 'visible',
    description: 'Test description',
    short_description: 'Short description',
    price: '100.00',
    regular_price: '100.00',
    sale_price: '',
    date_on_sale_from: null,
    date_on_sale_from_gmt: null,
    date_on_sale_to: null,
    date_on_sale_to_gmt: null,
    price_html: '$100.00',
    on_sale: false,
    purchasable: true,
    total_sales: 0,
    virtual: false,
    downloadable: false,
    download_limit: -1,
    download_expiry: -1,
    external_url: '',
    button_text: '',
    tax_status: 'taxable',
    tax_class: '',
    manage_stock: false,
    stock_quantity: null,
    stock_status: 'instock',
    backorders: 'no',
    backorders_allowed: false,
    backordered: false,
    weight: '',
    dimensions: { length: '', width: '', height: '' },
    shipping_required: true,
    shipping_taxable: true,
    shipping_class: '',
    shipping_class_id: 0,
    reviews_allowed: true,
    average_rating: '0.00',
    rating_count: 0,
    related_ids: [],
    upsell_ids: [],
    cross_sell_ids: [],
    parent_id: 0,
    purchase_note: '',
    categories: [],
    tags: [],
    attributes: [],
    default_attributes: [],
    variations: [],
    grouped_products: [],
    menu_order: 0,
    meta_data: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup environment variables
    process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
    process.env.R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.R2_PUBLIC_URL = 'https://cdn.test.com';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process product image successfully', async () => {
    // Mock successful fetch
    const mockImageBuffer = Buffer.from('fake-image-data');
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageBuffer.buffer),
    });

    // Mock Sharp processing
    const mockBuffers = {
      thumb: Buffer.from('thumb-data'),
      medium: Buffer.from('medium-data'),
      large: Buffer.from('large-data'),
    };
    
    mockSharp.toBuffer
      .mockResolvedValueOnce(mockBuffers.thumb)
      .mockResolvedValueOnce(mockBuffers.medium)
      .mockResolvedValueOnce(mockBuffers.large);

    // Mock S3 upload success
    mockS3Send.mockResolvedValue({});

    const result = await processProductImage(mockProduct);

    expect(result).toEqual({
      thumb: 'https://cdn.test.com/products/test-123/thumb.webp',
      medium: 'https://cdn.test.com/products/test-123/medium.webp',
      large: 'https://cdn.test.com/products/test-123/large.webp',
    });

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalledWith(
      'https://wordpress.example.com/image.jpg',
      {
        headers: {
          'User-Agent': 'MiniVeci-POS/1.0'
        }
      }
    );

    // Verify Sharp was called for each variant
    expect(mockSharp.resize).toHaveBeenCalledWith(150, 150, {
      fit: 'cover',
      position: 'center'
    });
    expect(mockSharp.resize).toHaveBeenCalledWith(600, 600, {
      fit: 'inside',
      withoutEnlargement: true
    });
    expect(mockSharp.resize).toHaveBeenCalledWith(1200, 1200, {
      fit: 'inside',
      withoutEnlargement: true
    });

    // Verify WebP conversion
    expect(mockSharp.webp).toHaveBeenCalledWith({
      quality: 85,
      effort: 6
    });

    // Verify S3 uploads (3 variants)
    expect(mockS3Send).toHaveBeenCalledTimes(3);
  });

  it('should return null when product has no images', async () => {
    const productWithoutImages = {
      ...mockProduct,
      images: [],
    };

    const result = await processProductImage(productWithoutImages);

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fallback to original URL on fetch error', async () => {
    // Mock fetch failure
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    const result = await processProductImage(mockProduct);

    expect(result).toEqual({
      thumb: 'https://wordpress.example.com/image.jpg',
      medium: 'https://wordpress.example.com/image.jpg',
      large: 'https://wordpress.example.com/image.jpg',
    });
  });

  it('should fallback to original URL on Sharp processing error', async () => {
    // Mock successful fetch
    const mockImageBuffer = Buffer.from('fake-image-data');
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageBuffer.buffer),
    });

    // Mock Sharp failure
    mockSharp.toBuffer.mockRejectedValue(new Error('Sharp processing failed'));

    const result = await processProductImage(mockProduct);

    expect(result).toEqual({
      thumb: 'https://wordpress.example.com/image.jpg',
      medium: 'https://wordpress.example.com/image.jpg',
      large: 'https://wordpress.example.com/image.jpg',
    });
  });

  it('should sanitize SKU for R2 path', async () => {
    const productWithSpecialSku = {
      ...mockProduct,
      sku: 'TEST@123#$%^&*()_+',
    };

    // Mock successful processing
    const mockImageBuffer = Buffer.from('fake-image-data');
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageBuffer.buffer),
    });

    mockSharp.toBuffer.mockResolvedValue(Buffer.from('processed-data'));
    mockS3Send.mockResolvedValue({});

    const result = await processProductImage(productWithSpecialSku);

    expect(result).toEqual({
      thumb: 'https://cdn.test.com/products/test-123/thumb.webp',
      medium: 'https://cdn.test.com/products/test-123/medium.webp',
      large: 'https://cdn.test.com/products/test-123/large.webp',
    });
  });

  it('should handle products without SKU', async () => {
    const productWithoutSku = {
      ...mockProduct,
      sku: '',
    };

    // Mock successful processing
    const mockImageBuffer = Buffer.from('fake-image-data');
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageBuffer.buffer),
    });

    mockSharp.toBuffer.mockResolvedValue(Buffer.from('processed-data'));
    mockS3Send.mockResolvedValue({});

    const result = await processProductImage(productWithoutSku);

    expect(result).toEqual({
      thumb: 'https://cdn.test.com/products/product-123/thumb.webp',
      medium: 'https://cdn.test.com/products/product-123/medium.webp',
      large: 'https://cdn.test.com/products/product-123/large.webp',
    });
  });

  it('should delete product images from R2', async () => {
    mockS3Send.mockResolvedValue({});

    await deleteProductImages('test-sku');

    // Should delete all 3 variants
    expect(mockS3Send).toHaveBeenCalledTimes(3);
  });

  it('should handle R2 delete errors gracefully', async () => {
    mockS3Send
      .mockRejectedValueOnce(new Error('Delete failed'))
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Another delete failed'));

    // Should not throw error
    await expect(deleteProductImages('test-sku')).resolves.toBeUndefined();

    expect(mockS3Send).toHaveBeenCalledTimes(3);
  });

  it('should set proper metadata on R2 objects', async () => {
    // Mock successful processing
    const mockImageBuffer = Buffer.from('fake-image-data');
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageBuffer.buffer),
    });

    mockSharp.toBuffer.mockResolvedValue(Buffer.from('processed-data'));
    mockS3Send.mockResolvedValue({});

    await processProductImage(mockProduct);

    // Check that PutObjectCommand was called with proper metadata
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: expect.objectContaining({
          'product-sku': 'test-123',
          'processed-at': expect.any(String),
        }),
      })
    );
  });
});