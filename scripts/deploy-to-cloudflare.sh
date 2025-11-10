#!/bin/bash

# 🚀 Script automático de deployment a Cloudflare Pages
# Para POS MiniVeci

set -e

echo "🚀 POS MiniVeci - Cloudflare Pages Deployment"
echo "============================================="

# 1. Verificar configuración
echo "📋 Step 1: Verificando configuración..."
npm run verify:cf

# 2. Limpiar build anterior
echo "🧹 Step 2: Limpiando build anterior..."
rm -rf out .next

# 3. Build estático
echo "⚡ Step 3: Generando build estático..."
npm run build:cf

# 4. Verificar output
echo "🔍 Step 4: Verificando output generado..."
if [ ! -d "out" ]; then
    echo "❌ Error: Directorio 'out' no fue generado"
    exit 1
fi

if [ ! -f "out/index.html" ]; then
    echo "❌ Error: index.html no fue generado"
    exit 1
fi

echo "✅ Build generado correctamente en /out"

# 5. Mostrar estructura
echo "📁 Step 5: Estructura del build:"
ls -la out/ | head -10

# 6. Deploy (opcional)
if [ "$1" = "--deploy" ]; then
    echo "🚀 Step 6: Desplegando a Cloudflare Pages..."
    npm run pages:deploy
    echo "✅ Deployment completado!"
    echo "🌐 URL: https://pos-miniveci.pages.dev/"
else
    echo "📝 Step 6: Para desplegar ejecuta:"
    echo "   ./scripts/deploy-to-cloudflare.sh --deploy"
    echo "   O configura GitHub integration en Cloudflare Pages"
fi

echo ""
echo "🎉 ¡Proceso completado exitosamente!"
echo ""
echo "📋 Configuración requerida en Cloudflare Pages:"
echo "   • Build command: npm run build:cf"
echo "   • Output directory: out"
echo "   • Node.js version: 20"
echo ""