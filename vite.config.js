// vite.config.js - Updated version
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  
  // Fixed worker plugins configuration
  worker: {
    format: 'es',
    plugins: () => [] // Now a function that returns an array
  },
  
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          d3: ['d3', 'd3-hierarchy', 'd3-scale-chromatic'],
          vendor: ['react', 'react-dom', 'zustand']
        }
      }
    }
  },
  
  optimizeDeps: {
    include: ['d3', 'cytoscape', 'zustand']
  }
});