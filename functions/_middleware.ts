/**
 * Cloudflare Pages Functions Middleware
 * Fallback para asegurar headers COOP/COEP en respuestas HTML dinámicas
 */

interface RequestContext {
  next: () => Promise<Response>;
}

export const onRequest = async (context: any) => {
  const { request } = context;
  const url = new URL(request.url);
  const response = await context.next();
  
  // Crear nueva respuesta para poder modificar headers
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });
  
  const contentType = response.headers.get('content-type') || '';
  
  // Aplicar headers COEP/COOP a todos los recursos
  newResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  newResponse.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // Headers específicos para archivos SQLite y Workers
  if (url.pathname.includes('sqlite-worker.js') || 
      url.pathname.includes('sql-wasm.js') || 
      url.pathname.includes('sql-wasm.wasm')) {
    
    newResponse.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    
    if (url.pathname.endsWith('.js')) {
      newResponse.headers.set('Content-Type', 'application/javascript; charset=utf-8');
    } else if (url.pathname.endsWith('.wasm')) {
      newResponse.headers.set('Content-Type', 'application/wasm');
    }
  }
  
  return newResponse;
};