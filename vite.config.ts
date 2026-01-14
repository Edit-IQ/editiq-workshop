import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/editiq-workshop/',
  server: {
    port: 3000,
    host: '0.0.0.0',
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
