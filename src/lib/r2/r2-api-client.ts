/**
 * Cliente Cloudflare R2 usando API Token (NO S3-compatible)
 * Para cuando solo tienes acceso al API Token de Cloudflare
 */

interface R2Object {
  key: string;
  size: number;
  etag: string;
  last_modified: string;
  content_type?: string;
}

interface R2ListResponse {
  success: boolean;
  result: {
    objects: R2Object[];
    truncated: boolean;
    cursor?: string;
  };
}

interface R2UploadResponse {
  success: boolean;
  result: {
    key: string;
    size: number;
    etag: string;
  };
}

/**
 * Cliente R2 usando Cloudflare API Token
 * Alternativa cuando no tienes credenciales S3-compatible
 */
export class R2ApiClient {
  private accountId: string;
  private apiToken: string;
  private bucketName: string;
  private baseUrl: string;
  private publicUrl: string;

  constructor() {
    // Validar variables de entorno requeridas
    if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
      throw new Error('CLOUDFLARE_ACCOUNT_ID environment variable is required');
    }
    if (!process.env.CLOUDFLARE_API_TOKEN) {
      throw new Error('CLOUDFLARE_API_TOKEN environment variable is required');
    }
    if (!process.env.R2_BUCKET_NAME) {
      throw new Error('R2_BUCKET_NAME environment variable is required');
    }

    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.bucketName = process.env.R2_BUCKET_NAME;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/r2/buckets/${this.bucketName}`;
    this.publicUrl = process.env.R2_PUBLIC_URL || `https://${this.bucketName}.${this.accountId}.r2.cloudflarestorage.com`;
  }

  /**
   * Headers comunes para todas las requests
   */
  private getHeaders(contentType?: string): HeadersInit {
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': contentType || 'application/json',
    };
    return headers;
  }

  /**
   * Subir archivo a R2 usando API Token
   */
  async putObject(
    key: string,
    body: Buffer | Uint8Array | string,
    options: {
      contentType?: string;
      metadata?: Record<string, string>;
    } = {}
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/objects/${encodeURIComponent(key)}`;
      
      const headers = {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': options.contentType || 'application/octet-stream',
      };

      // Agregar metadata como headers personalizados
      if (options.metadata) {
        Object.entries(options.metadata).forEach(([key, value]) => {
          (headers as any)[`x-amz-meta-${key}`] = value;
        });
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`R2 API Error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ Successfully uploaded: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${key}:`, error);
      throw error;
    }
  }

  /**
   * Obtener archivo desde R2
   */
  async getObject(key: string): Promise<{
    body: ReadableStream<Uint8Array> | null;
    contentType?: string;
    contentLength?: number;
    metadata?: Record<string, string>;
  }> {
    try {
      const url = `${this.baseUrl}/objects/${encodeURIComponent(key)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { body: null };
        }
        const errorText = await response.text();
        throw new Error(`R2 API Error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ Successfully fetched: ${key}`);

      return {
        body: response.body,
        contentType: response.headers.get('content-type') || undefined,
        contentLength: parseInt(response.headers.get('content-length') || '0'),
        metadata: this.extractMetadata(response.headers),
      };
    } catch (error) {
      console.error(`❌ Failed to fetch ${key}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar archivo de R2
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/objects/${encodeURIComponent(key)}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        throw new Error(`R2 API Error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ Successfully deleted: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${key}:`, error);
      throw error;
    }
  }

  /**
   * Listar objetos en R2
   */
  async listObjects(prefix?: string, maxKeys: number = 1000): Promise<{
    objects: R2Object[];
    totalCount: number;
    isTruncated: boolean;
  }> {
    try {
      // Usar el endpoint correcto para listar objetos
      const params = new URLSearchParams();
      if (prefix) params.set('prefix', prefix);
      params.set('limit', maxKeys.toString());

      const url = `${this.baseUrl}/objects?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`R2 API Error: ${response.status} - ${errorText}`);
      }

      const data: R2ListResponse = await response.json();

      if (!data.success) {
        throw new Error(`R2 API returned success: false - ${JSON.stringify(data)}`);
      }

      // Manejar caso donde result puede ser undefined
      const objects = data.result?.objects || [];
      console.log(`✅ Listed ${objects.length} objects with prefix: ${prefix || 'none'}`);

      return {
        objects,
        totalCount: objects.length,
        isTruncated: data.result?.truncated || false,
      };
    } catch (error) {
      console.error(`❌ Failed to list objects with prefix ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * Obtener URL pública de un objeto
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Verificar conexión con R2
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test simple: verificar que podemos hacer una request básica
      const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/tokens/verify`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ R2 API connection test successful');
        return true;
      } else {
        console.error(`❌ API Token verification failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ R2 API connection test failed:', error);
      return false;
    }
  }

  /**
   * Obtener información del bucket
   */
  getBucketInfo() {
    return {
      bucketName: this.bucketName,
      accountId: this.accountId,
      apiEndpoint: this.baseUrl,
      publicUrl: this.publicUrl,
      authMethod: 'api-token',
    };
  }

  /**
   * Extraer metadata de headers de response
   */
  private extractMetadata(headers: Headers): Record<string, string> {
    const metadata: Record<string, string> = {};
    
    headers.forEach((value, key) => {
      if (key.startsWith('x-amz-meta-')) {
        const metaKey = key.replace('x-amz-meta-', '');
        metadata[metaKey] = value;
      }
    });

    return metadata;
  }

  /**
   * Verificar si el bucket es accesible
   */
  async verifyAccess(): Promise<{ hasRead: boolean; hasWrite: boolean; hasDelete: boolean }> {
    const testKey = 'test/connection-verification.txt';
    const testContent = `Test ${Date.now()}`;

    let hasRead = false;
    let hasWrite = false;
    let hasDelete = false;

    try {
      // Test write
      await this.putObject(testKey, testContent, { contentType: 'text/plain' });
      hasWrite = true;
      console.log('✅ Write access confirmed');

      // Test read
      const result = await this.getObject(testKey);
      if (result.body) {
        hasRead = true;
        console.log('✅ Read access confirmed');
      }

      // Test delete
      await this.deleteObject(testKey);
      hasDelete = true;
      console.log('✅ Delete access confirmed');

    } catch (error) {
      console.error('Access verification failed:', error);
    }

    return { hasRead, hasWrite, hasDelete };
  }
}

/**
 * Utilidades para trabajar con R2 API
 */
export class R2ApiUtils {
  /**
   * Sanitizar key para R2
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
}

// Nota: No exportamos singleton para evitar errores de inicialización
// Usar: const r2Client = new R2ApiClient() cuando se necesite