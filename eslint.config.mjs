import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Relaxed rules for test files
  {
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in test mocks
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in test setup
      '@typescript-eslint/no-require-imports': 'off', // Allow require in test mocks
      '@next/next/no-img-element': 'off', // Allow img tags in tests
    },
  },
  // Stricter rules for source code (non-test files)
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['**/__tests__/**', '**/*.test.*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
]);

export default eslintConfig;
