/**
 * Cloudflare Pages Functions Middleware
 * Fallback para asegurar headers COOP/COEP en respuestas HTML dinámicas
 */

interface RequestContext {
  next: () => Promise<Response>;
}

export const onRequest = async ({ next }: RequestContext) => {
  const response = await next();
  const contentType = response.headers.get('content-type') || '';
  
  // Aplicar solo a documentos HTML
  if (contentType.includes('text/html')) {
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  }
  
  return response;
};