import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/cuaderno-verano/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // We drive the update UX ourselves (see src/lib/swUpdate.ts), so prompt +
      // manual registration rather than autoUpdate silently swapping under the kids.
      registerType: 'prompt',
      injectRegister: null,
      // The whole app is offline-first: all content JSON is imported at build
      // time (src/content/loader.ts) and bundled into JS chunks, so precaching
      // the built dist precaches the content too — nothing is fetched at runtime.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,json,woff,woff2,ttf}'],
        // Bundle can be large (content-heavy); allow generous precache entries.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // SPA with hash routing: unknown navigations fall back to the shell.
        navigateFallback: '/cuaderno-verano/index.html',
        cleanupOutdatedCaches: true,
      },
      includeAssets: ['favicon.svg', 'favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'El Cuaderno de Verano',
        short_name: 'Cuaderno',
        description: 'Cuaderno de verano interactivo para practicar sin conexión.',
        lang: 'es',
        start_url: '/cuaderno-verano/',
        scope: '/cuaderno-verano/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#fdf6f0',
        background_color: '#fdf6f0',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    // CPU-heavy property-test sweeps can starve vitest's worker→main RPC on
    // constrained CI runners; give teardown/hooks generous margin so a slow
    // task update doesn't surface as an "onTaskUpdate" unhandled timeout.
    teardownTimeout: 30000,
    hookTimeout: 30000,
  },
})
