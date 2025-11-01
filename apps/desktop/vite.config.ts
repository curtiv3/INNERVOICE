import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const mobileTarget = process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13';

export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@innervoice/core-crypto': path.resolve(__dirname, '../../packages/core/crypto/src'),
      '@innervoice/core-embeddings': path.resolve(__dirname, '../../packages/core/embeddings/src'),
      '@innervoice/core-sync': path.resolve(__dirname, '../../packages/core/sync/src'),
      '@innervoice/persona-core': path.resolve(__dirname, '../../packages/core/persona/src')
    }
  },
  envPrefix: ['VITE_', 'TAURI_'],
  server: {
    port: 1420,
    strictPort: true,
    host: '127.0.0.1',
    hmr: {
      host: '127.0.0.1',
      port: 1421
    }
  },
  build: {
    target: mobileTarget,
    minify: !process.env.TAURI_DEBUG,
    sourcemap: !!process.env.TAURI_DEBUG
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development')
  }
}));
