import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: Number(process.env.VITE_ADMIN_PANEL_PORT || 2002),
    strictPort: false, // Allow fallback if port is taken
    allowedHosts: [
      'localhost',
      process.env.VITE_BACKEND_HOST || 'thenefol.com'
    ],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || `http://${process.env.VITE_BACKEND_HOST || 'localhost'}:${process.env.VITE_BACKEND_PORT || '2000'}`,
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  preview: {
    host: '0.0.0.0', // Also allow network access in preview mode
    port: Number(process.env.VITE_ADMIN_PANEL_PORT || 2002),
    strictPort: false
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
