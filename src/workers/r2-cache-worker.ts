/**
 * Cloudflare Worker para cachear imágenes de R2
 * Basado en: https://developers.cloudflare.com/r2/examples/cache-api/
 * 
 * @description
 * Worker que implementa Cache API para optimizar la entrega de imágenes
 * desde Cloudflare R2, proporcionando:
 * - Cache inteligente en edge locations
 * - Headers optimizados para CDN
 * - Compresión automática
 * - Fallbacks para imágenes faltantes
 * 
 * @deployment
 * Este worker se despliega automáticamente cuando configuras
 * custom domain en R2 (cdn.miniveci.cl)
 */

interface Env {
  // R2 Bucket binding (configurado en wrangler.toml)
  MINIVECI_BUCKET: R2Bucket;
  
  // Variables de entorno
  CACHE_TTL?: string;
  FALLBACK_IMAGE_URL?: string;
}

export default {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // Solo procesar rutas de imágenes de productos
      if (!url.pathname.startsWith('/products/') && !url.pathname.includes('.webp')) {
        return new Response('Not Found', { status: 404 });
      }

      // Construir cache key desde la URL
      const cacheKey = new Request(url.toString(), request);
      const cache = caches.default;

      // Verificar si el objeto ya está en cache
      let response = await cache.match(cacheKey);

      if (response) {
        console.log(`🟢 Cache HIT for: ${request.url}`);
        
        // Agregar header para identificar cache hit
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...response.headers,
            'X-Cache-Status': 'HIT',
            'X-Served-By': 'pos-miniveci-worker',
          },
        });
        
        return newResponse;
      }

      console.log(`🔴 Cache MISS for: ${request.url}. Fetching from R2...`);

      // Extraer object key desde el pathname
      const objectKey = url.pathname.slice(1); // Remover leading /

      // Intentar obtener objeto desde R2
      const object = await env.MINIVECI_BUCKET.get(objectKey);

      if (object === null) {
        console.log(`❌ Object not found in R2: ${objectKey}`);
        
        // Retornar imagen fallback o 404
        if (env.FALLBACK_IMAGE_URL) {
          return Response.redirect(env.FALLBACK_IMAGE_URL, 302);
        }
        
        return new Response('Image Not Found', { 
          status: 404,
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=300', // Cache 404s por 5 minutos
          },
        });
      }

      // Configurar headers optimizados
      const headers = new Headers();
      
      // Headers desde R2
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);

      // Headers de cache optimizados
      const cacheMaxAge = env.CACHE_TTL ? parseInt(env.CACHE_TTL) : 31536000; // 1 año por defecto
      headers.set('Cache-Control', `public, max-age=${cacheMaxAge}, immutable`);
      headers.set('Expires', new Date(Date.now() + cacheMaxAge * 1000).toUTCString());

      // Headers de optimización
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Cache-Status', 'MISS');
      headers.set('X-Served-By', 'pos-miniveci-worker');

      // Verificar si es imagen WebP y agregar headers específicos
      if (objectKey.endsWith('.webp')) {
        headers.set('Content-Type', 'image/webp');
        headers.set('Vary', 'Accept');
        
        // Hints para el navegador
        headers.set('X-Image-Type', 'optimized-webp');
        
        if (objectKey.includes('/thumb/')) {
          headers.set('X-Image-Variant', 'thumbnail');
        } else if (objectKey.includes('/medium/')) {
          headers.set('X-Image-Variant', 'medium');
        } else if (objectKey.includes('/large/')) {
          headers.set('X-Image-Variant', 'large');
        }
      }

      // Crear response desde R2
      response = new Response(object.body, {
        status: 200,
        headers,
      });

      // Cachear response de forma asíncrona (no bloquear la respuesta)
      context.waitUntil(
        cache.put(cacheKey, response.clone()).then(() => {
          console.log(`✅ Cached object: ${objectKey}`);
        }).catch(error => {
          console.error(`❌ Failed to cache object ${objectKey}:`, error);
        })
      );

      return response;

    } catch (error) {
      console.error(`💥 Worker error for ${request.url}:`, error);
      
      return new Response('Internal Server Error', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'X-Error': 'pos-worker-error',
        },
      });
    }
  },
};

/**
 * Configuración adicional para el worker
 */
export const config = {
  // Rutas que debe manejar este worker
  routes: [
    { pattern: "cdn.miniveci.cl/products/*", custom_domain: true },
    { pattern: "*.r2.cloudflarestorage.com/products/*", custom_domain: false },
  ],
  
  // Configuración de cache
  cache: {
    // Cache por 1 año para imágenes optimizadas
    maxAge: 31536000,
    // Revalidar cada 1 hora en caso de updates
    staleWhileRevalidate: 3600,
  },
};