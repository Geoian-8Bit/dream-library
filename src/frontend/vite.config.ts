import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Dream Library',
        short_name: 'Dream Library',
        description: 'Biblioteca virtual personal inmersiva',
        theme_color: '#0f0f10',
        background_color: '#0f0f10',
        display: 'standalone',
        // Forzar portrait cuando esté instalada como PWA. En navegador
        // normal el SO ignora esto; ahí mostramos un overlay de "rota".
        orientation: 'portrait',
        start_url: '/',
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,webp,woff2}'],
        // Texturas/modelos pesados (libros, HDRI) no se precachean —
        // se cargan a demanda. Si los precacheamos pasan del límite
        // de 2MB de Workbox y rompen el build.
        globIgnores: ['**/models/books/**', '**/hdri/**'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../../shared/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Aceptar cualquier host (Tailscale `100.x.x.x`, hostnames MagicDNS,
    // etc.) además de localhost. Solo afecta al servidor de desarrollo.
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: { sourcemap: true, target: 'es2022' },
});
