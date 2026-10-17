import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  // Public base path. '/' for a root/custom domain; '/<repo>/' for GitHub Pages project sites.
  base: process.env.VITE_BASE_PATH || '/',
  build: { target: 'esnext', sourcemap: false, reportCompressedSize: false },
  server: { host: '::', port: 8080, cors: true, hmr: { overlay: false } },
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
