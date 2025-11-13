import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignorar archivos que NO deben ser analizados
  {
    ignores: [
      // Build outputs y archivos generados
      ".next/**",
      "out/**", 
      "build/**",
      "dist/**",
      "node_modules/**",
      "next-env.d.ts",
      
      // Archivos JS específicos que no deben ser analizados
      "public/sql-wasm.js",
      "public/sqlite-worker.js",
      "scripts/**/*.js",
      
      // Scripts temporales durante implementación R2
      "scripts/test-r2-connection.ts",
      "src/lib/sync/woo-sync-worker.ts",
      "src/workers/r2-cache-worker.ts"
    ]
  },
  
  // Configuración base Next.js
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  
  // Reglas más relajadas durante implementación R2
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@next/next/no-img-element': 'off',
      'prefer-const': 'warn',
    }
  }
];

export default eslintConfig;