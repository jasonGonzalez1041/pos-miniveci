#!/usr/bin/env node
/**
 * Servidor de desarrollo con headers COEP/COOP para SQLite WASM
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Configurar Next.js temporalmente sin export para desarrollo
const nextConfig = {
  ...require('../next.config.ts').default,
  output: undefined // Remover export para desarrollo
};

const app = next({ dev, hostname, port, conf: nextConfig });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Aplicar headers COEP/COOP a todas las respuestas
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

      // Headers específicos para archivos SQLite
      if (pathname.includes('sqlite-worker.js') || 
          pathname.includes('sql-wasm.js') || 
          pathname.includes('sql-wasm.wasm')) {
        
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        
        if (pathname.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (pathname.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Server ready at http://${hostname}:${port}`);
      console.log('✅ COEP/COOP headers enabled for SQLite WASM');
    });
});