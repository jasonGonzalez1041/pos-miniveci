/**
 * Cloudflare R2 Client usando S3 API con autenticación por tokens
 * Basado en: https://developers.cloudflare.com/r2/examples/authenticate-r2-auth-tokens/
 */

import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * Cliente R2 configurado con autenticación por tokens
 * Compatible con S3 API usando credenciales de Cloudflare R2
 */
export class R2Client {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    // Validar variables de entorno requeridas
    if (!process.env.R2_ENDPOINT) {
      throw new Error('R2_ENDPOINT environment variable is required');
    }
    if (!process.env.R2_ACCESS_KEY_ID) {
      throw new Error('R2_ACCESS_KEY_ID environment variable is required');
    }
    if (!process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2_SECRET_ACCESS_KEY environment variable is required');
    }
    if (!process.env.R2_BUCKET_NAME) {
      throw new Error('R2_BUCKET_NAME environment variable is required');
    }

    this.bucketName = process.env.R2_BUCKET_NAME;
    this.publicUrl = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;

    // Configurar cliente S3 para Cloudflare R2
    this.client = new S3Client({
      region: 'auto', // R2 usa 'auto' como región
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      // Configuración específica para R2
      forcePathStyle: true, // R2 requiere path-style URLs
    });
  }

  /**
   * Subir archivo a R2
   * @param key - Ruta del archivo en el bucket (ej: "products/sku-123/medium.webp")
   * @param body - Contenido del archivo (Buffer, string, stream)
   * @param options - Opciones adicionales (Content-Type, metadata, etc.)
   */
  async putObject(
    key: string, 
    body: Buffer | Uint8Array | string | ReadableStream,
    options: {
      contentType?: string;
      cacheControl?: string;
      metadata?: Record<string, string>;
    } = {}
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: options.contentType || 'application/octet-stream',
        CacheControl: options.cacheControl || 'public, max-age=31536000, immutable', // 1 año por defecto
        Metadata: options.metadata || {},
      });

      await this.client.send(command);
      console.log(`✅ Successfully uploaded: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${key}:`, error);
      throw error;
    }
  }

  /**
   * Obtener archivo desde R2
   * @param key - Ruta del archivo en el bucket
   * @returns Objeto con el contenido y metadata
   */
  async getObject(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);
      console.log(`✅ Successfully fetched: ${key}`);
      
      return {
        body: response.Body,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata || {},
      };
    } catch (error) {
      console.error(`❌ Failed to fetch ${key}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar archivo de R2
   * @param key - Ruta del archivo en el bucket
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      console.log(`✅ Successfully deleted: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${key}:`, error);
      throw error;
    }
  }

  /**
   * Listar objetos en R2
   * @param prefix - Prefijo para filtrar objetos (ej: "products/")
   * @param maxKeys - Número máximo de objetos a retornar
   */
  async listObjects(prefix?: string, maxKeys: number = 1000) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.client.send(command);
      console.log(`✅ Listed ${response.KeyCount} objects with prefix: ${prefix || 'none'}`);
      
      return {
        objects: response.Contents || [],
        totalCount: response.KeyCount || 0,
        isTruncated: response.IsTruncated || false,
        nextContinuationToken: response.NextContinuationToken,
      };
    } catch (error) {
      console.error(`❌ Failed to list objects with prefix ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * Obtener URL pública de un objeto
   * @param key - Ruta del archivo en el bucket
   * @returns URL pública del archivo
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Verificar conexión con R2
   * @returns true si la conexión es exitosa
   */
  async testConnection(): Promise<boolean> {
    try {
      // Intentar listar objetos con límite mínimo
      await this.listObjects(undefined, 1);
      console.log('✅ R2 connection test successful');
      return true;
    } catch (error) {
      console.error('❌ R2 connection test failed:', error);
      return false;
    }
  }

  /**
   * Obtener información del bucket
   */
  getBucketInfo() {
    return {
      bucketName: this.bucketName,
      endpoint: process.env.R2_ENDPOINT,
      publicUrl: this.publicUrl,
      region: 'auto',
    };
  }
}

// Exportar instancia singleton
export const r2Client = new R2Client();

/**
 * Utilidades para trabajar con R2
 */
export class R2Utils {
  /**
   * Sanitizar key para R2 (remover caracteres especiales)
   */
  static sanitizeKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9\-_.\/]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generar key para imagen de producto
   */
  static generateImageKey(sku: string, variant: 'thumb' | 'medium' | 'large'): string {
    const sanitizedSku = this.sanitizeKey(sku);
    return `products/${sanitizedSku}/${variant}.webp`;
  }

  /**
   * Generar metadata para imagen de producto
   */
  static generateImageMetadata(sku: string, variant: string) {
    return {
      'product-sku': sku,
      'image-variant': variant,
      'processed-at': new Date().toISOString(),
      'content-type': 'image/webp',
      'source': 'pos-miniveci-image-processor',
    };
  }

  /**
   * Validar que el archivo sea una imagen válida
   */
  static isValidImageType(contentType: string): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return validTypes.includes(contentType.toLowerCase());
  }
}