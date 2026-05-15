import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_USER_PANEL_PORT || 2001),
    strictPort: false,
    proxy: {
      '/api': {
        target:
          process.env.VITE_API_URL ||
          `http://${process.env.VITE_BACKEND_HOST || 'localhost'}:${process.env.VITE_BACKEND_PORT || '2000'}`,
        changeOrigin: true,
        secure: false,
      },
    },
    allowedHosts: ['localhost', process.env.VITE_BACKEND_HOST || 'thenefol.com'],
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_USER_PANEL_PORT || 2001),
    strictPort: false,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2015',
    },
  },
  build: {
    target: ['es2015', 'safari13'],
    cssTarget: ['safari13'],
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react'],
          'socket-vendor': ['socket.io-client'],
          'geo-vendor': ['country-state-city'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        passes: 1,
      },
      mangle: {
        safari10: true,
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    copyPublicDir: true,
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
