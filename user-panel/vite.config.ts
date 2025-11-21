  import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: Number(process.env.VITE_USER_PANEL_PORT || 2001),
    strictPort: false, // Allow fallback if port is taken
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || `http://${process.env.VITE_BACKEND_HOST || 'localhost'}:${process.env.VITE_BACKEND_PORT || '2000'}`,
        changeOrigin: true,
        secure: false
      },
      // '/IMAGES': {
      //   target: process.env.VITE_API_URL || `http://${process.env.VITE_BACKEND_HOST || 'localhost'}:${process.env.VITE_BACKEND_PORT || '2000'}`,
      //   changeOrigin: true,
      //   secure: false
      // }
    },
    allowedHosts: [
      'localhost',
      process.env.VITE_BACKEND_HOST || '192.168.1.36',
      '.ngrok.io',
      '.ngrok-free.dev',
      'subcontained-clelia-scorchingly.ngrok-free.dev'
    ]
  },
  preview: {
    host: '0.0.0.0', // Also allow network access in preview mode
    port: Number(process.env.VITE_USER_PANEL_PORT || 2001),
    strictPort: false
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom'],
          // Large libraries in their own chunks
          'socket-vendor': ['socket.io-client'],
          'ui-vendor': ['lucide-react'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // PWA optimization: ensure service worker and manifest are copied
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
