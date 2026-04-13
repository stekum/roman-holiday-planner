import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Roman Holiday Planner',
        short_name: 'RHP',
        description: 'Kollaborativer Reiseplaner für Familien mit Karte, Tagestouren und AI-Unterstützung.',
        theme_color: '#FBF7F0',
        background_color: '#FBF7F0',
        display: 'standalone',
        orientation: 'portrait',
        scope: '.',
        start_url: '.',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Take over pages as soon as the new SW is installed — no waiting
        // for all tabs to close. Combined with registerType 'autoUpdate'
        // this ensures updates propagate within one reload cycle.
        skipWaiting: true,
        clientsClaim: true,
        // Cleanup outdated caches from older SW versions
        cleanupOutdatedCaches: true,
        // Cache strategy: network-first for API calls, cache-first for static assets
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-maps',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }, // 1 hour
            },
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 5 }, // 5 min
            },
          },
        ],
        // Don't precache everything — let Vite handle the main bundle
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  base: process.env.VITE_BASE ?? '/roman-holiday-planner/',
})
