import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite con proxy hacia el backend en Rust (puerto 3000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/claims': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/assertions': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/rebuttals': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
