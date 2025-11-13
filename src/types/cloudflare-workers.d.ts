// Tipos para Cloudflare Workers API

declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }

  interface R2Object {
    readonly key: string;
    readonly version: string;
    readonly size: number;
    readonly etag: string;
    readonly httpEtag: string;
    readonly uploaded: Date;
    readonly checksums: R2Checksums;
    readonly httpMetadata?: R2HTTPMetadata;
    readonly customMetadata?: Record<string, string>;
    readonly range?: R2Range;
    readonly body?: ReadableStream<Uint8Array>;
    readonly bodyUsed?: boolean;

    writeHttpMetadata(headers: Headers): void;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
    json<T>(): Promise<T>;
    blob(): Promise<Blob>;
  }

  interface R2ObjectBody extends R2Object {
    readonly body: ReadableStream<Uint8Array>;
    readonly bodyUsed: boolean;
  }

  interface R2Checksums {
    readonly md5?: ArrayBuffer;
    readonly sha1?: ArrayBuffer;
    readonly sha256?: ArrayBuffer;
    readonly sha384?: ArrayBuffer;
    readonly sha512?: ArrayBuffer;
  }

  interface R2HTTPMetadata {
    contentType?: string;
    contentLanguage?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    cacheControl?: string;
    cacheExpiry?: Date;
  }

  interface R2Range {
    offset?: number;
    length?: number;
    suffix?: number;
  }

  interface R2ListOptions {
    limit?: number;
    prefix?: string;
    cursor?: string;
    delimiter?: string;
    startAfter?: string;
    include?: ('httpMetadata' | 'customMetadata')[];
  }

  interface R2Objects {
    objects: R2Object[];
    truncated: boolean;
    cursor?: string;
    delimitedPrefixes: string[];
  }

  interface R2PutOptions {
    httpMetadata?: R2HTTPMetadata | Headers;
    customMetadata?: Record<string, string>;
    md5?: ArrayBuffer | string;
    sha1?: ArrayBuffer | string;
    sha256?: ArrayBuffer | string;
    sha384?: ArrayBuffer | string;
    sha512?: ArrayBuffer | string;
  }

  interface R2MultipartUpload {
    readonly key: string;
    readonly uploadId: string;
    
    uploadPart(partNumber: number, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob): Promise<R2UploadedPart>;
    complete(uploadedParts: R2UploadedPart[]): Promise<R2Object>;
    abort(): Promise<void>;
  }

  interface R2UploadedPart {
    partNumber: number;
    etag: string;
  }

  interface R2Bucket {
    head(key: string): Promise<R2Object | null>;
    get(key: string, options?: {
      onlyIf?: R2Conditional;
      range?: R2Range;
    }): Promise<R2ObjectBody | null>;
    
    put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob, options?: R2PutOptions): Promise<R2Object>;
    
    delete(keys: string | string[]): Promise<void>;
    
    list(options?: R2ListOptions): Promise<R2Objects>;
    
    createMultipartUpload(key: string, options?: R2PutOptions): Promise<R2MultipartUpload>;
    
    resumeMultipartUpload(key: string, uploadId: string): R2MultipartUpload;
  }

  interface R2Conditional {
    etagMatches?: string;
    etagDoesNotMatch?: string;
    uploadedBefore?: Date;
    uploadedAfter?: Date;
  }

  // Cloudflare Cache API
  interface CacheStorage {
    default: Cache;
    open(name: string): Promise<Cache>;
  }

  // Environment bindings
  interface Env {
    [key: string]: any;
    // R2 Bucket binding
    R2_BUCKET?: R2Bucket;
    
    // KV bindings
    [kvNamespace: string]: KVNamespace;
    
    // Durable Object bindings
    [durableObjectName: string]: DurableObjectNamespace;
    
    // Environment variables
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
    R2_BUCKET_NAME?: string;
  }

  // KV Namespace
  interface KVNamespace {
    get(key: string, options?: {
      type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
      cacheTtl?: number;
    }): Promise<any>;
    
    get(key: string, type: 'text'): Promise<string | null>;
    get(key: string, type: 'json'): Promise<any>;
    get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
    get(key: string, type: 'stream'): Promise<ReadableStream | null>;
    
    put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: {
      expiration?: number;
      expirationTtl?: number;
      metadata?: any;
    }): Promise<void>;
    
    delete(key: string): Promise<void>;
    
    list(options?: {
      prefix?: string;
      limit?: number;
      cursor?: string;
    }): Promise<{
      keys: Array<{
        name: string;
        expiration?: number;
        metadata?: any;
      }>;
      list_complete: boolean;
      cursor?: string;
    }>;
  }

  // Durable Object
  interface DurableObjectNamespace {
    idFromName(name: string): DurableObjectId;
    idFromString(id: string): DurableObjectId;
    newUniqueId(options?: { jurisdiction?: string }): DurableObjectId;
    get(id: DurableObjectId): DurableObjectStub;
  }

  interface DurableObjectId {
    toString(): string;
    equals(other: DurableObjectId): boolean;
  }

  interface DurableObjectStub {
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
  }

  // Worker Global
  interface WorkerGlobalScope {
    caches: CacheStorage;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
    dispatchEvent(event: Event): boolean;
  }

  // Fetch Event (for Service Workers style)
  interface FetchEvent extends Event {
    request: Request;
    respondWith(response: Promise<Response> | Response): void;
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }

  // Scheduled Event (for Cron Triggers)
  interface ScheduledEvent extends Event {
    scheduledTime: number;
    cron: string;
    waitUntil(promise: Promise<any>): void;
  }

  // Request init options for Cloudflare specific features
  interface CloudflareRequestInit extends RequestInit {
    cf?: {
      cacheEverything?: boolean;
      cacheTtl?: number;
      cacheTtlByStatus?: Record<string, number>;
      scrapeShield?: boolean;
      apps?: boolean;
      minify?: {
        javascript?: boolean;
        css?: boolean;
        html?: boolean;
      };
      mirage?: boolean;
      polish?: 'lossy' | 'lossless' | 'off';
      webp?: boolean;
      resolveOverride?: string;
    };
  }
}

// Export para que TypeScript reconozca este archivo como módulo
export {};