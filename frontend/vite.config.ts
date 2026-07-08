import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: process.env.NODE_ENV === 'development' 
      ? {
          host: 'localhost',
          port: 5173
        }
      : undefined,
    proxy: {
      '/api': {
        target: 'http://app:3000',
        changeOrigin: true,
      },
    }
  }
});

