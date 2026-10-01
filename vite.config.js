import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-big-calendar')) return 'calendar-vendor';
          if (id.includes('recharts')) return 'charts-vendor';
          if (id.includes('framer-motion')) return 'motion-vendor';
          if (id.includes('date-fns')) return 'date-vendor';
          if (id.includes('/firebase/')) return 'firebase-vendor';
          if (id.includes('lucide-react')) return 'icons-vendor';
          if (id.includes('react-router')) return 'router-vendor';
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor';
          return undefined;
        }
      }
    }
  },
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      workbox: {
        importScripts: ['https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'],
        maximumFileSizeToCacheInBytes: 5000000
      },
      manifest: {
        name: 'SudoDo - Task Manager',
        short_name: 'SudoDo',
        description: 'SudoDo Task Manager App',
        theme_color: '#e8d5f5',
        background_color: '#e8d5f5',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
