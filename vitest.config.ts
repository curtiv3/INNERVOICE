import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/core/**/src/**/*.spec.ts',
      'packages/core/**/src/**/__tests__/**/*.ts',
      'apps/mobile/src/**/*.{spec,test}.ts'
    ],
    coverage: {
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage'
    }
  },
  resolve: {
    alias: {
      '@innervoice/persona-core': resolve(rootDir, 'packages/core/persona/src'),
      '@innervoice/persona-core/*': resolve(rootDir, 'packages/core/persona/src/*'),
      '@innervoice/core-crypto': resolve(rootDir, 'packages/core/crypto/src'),
      '@innervoice/core-crypto/*': resolve(rootDir, 'packages/core/crypto/src/*'),
      '@innervoice/core-sync': resolve(rootDir, 'packages/core/sync/src'),
      '@innervoice/core-sync/*': resolve(rootDir, 'packages/core/sync/src/*'),
      '@innervoice/core-embeddings': resolve(rootDir, 'packages/core/embeddings/src'),
      '@innervoice/core-embeddings/*': resolve(rootDir, 'packages/core/embeddings/src/*')
    }
  }
});
