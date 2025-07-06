/**
 * ⚡ Vite Configuration
 * 
 * Frontend build configuration with:
 * - React and TypeScript support
 * - NovaSanctum integration
 * - Development server setup
 * - Build optimization
 * 
 * @author LuxCore Team
 * @version 1.0.0
 * @since 2024-07-05
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 🔧 Server configuration
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // 📦 Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          novaSanctum: ['axios', 'jwt-decode'],
          ui: ['framer-motion', 'lucide-react'],
        },
      },
    },
  },

  // 🔍 Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/shared': path.resolve(__dirname, '../shared'),
    },
  },

  // 🔧 Environment variables
  define: {
    __NOVA_SANCTUM_VERSION__: JSON.stringify('1.0.0'),
    __APP_VERSION__: JSON.stringify('1.0.0'),
  },

  // 📋 CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },

  // 🔍 Optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'zustand',
      'framer-motion',
      'lucide-react',
    ],
  },
}); 