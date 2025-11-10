import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ESBuild options for minification (at top level)
  esbuild: {
    drop: ['console', 'debugger'], // Remove console logs and debugger statements in production
  },

  // Build optimization configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Enable minification with esbuild (faster than terser)
    minify: 'esbuild',
    
    // Target modern browsers for better optimization
    target: 'esnext',
    
    // Generate sourcemaps for production debugging (can be disabled for smaller builds)
    sourcemap: false,
    
    // Chunk size warning limit (500kb)
    chunkSizeWarningLimit: 500,
    
    // Rollup options for advanced optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunk for React and related libraries
          'react-vendor': ['react', 'react-dom', 'react-query'],
          
          // UI components chunk
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-toast',
            'lucide-react',
            'react-icons'
          ],
          
          // Markdown and syntax highlighting
          'markdown-vendor': [
            'react-markdown',
            'react-syntax-highlighter',
            'remark-gfm',
            'react-code-blocks'
          ],
          
          // Utilities
          'utils-vendor': [
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
            'uuid',
            'diff'
          ]
        },
        
        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.')
          let extType = info?.[info.length - 1]
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            extType = 'images'
          } else if (/woff|woff2|eot|ttf|otf/i.test(extType || '')) {
            extType = 'fonts'
          }
          
          return `assets/${extType}/[name]-[hash][extname]`
        },
        
        // Chunk file naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        
        // Entry file naming
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Optimize dependencies
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-query',
      '@radix-ui/react-dialog',
      '@radix-ui/react-toast',
    ],
  },

  // Server configuration for development
  server: {
    port: 5180,
    strictPort: true,
  },
})
