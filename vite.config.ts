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
      registerType: 'autoUpdate',
      manifest: {
        name: 'Cuaderno de Verano',
        short_name: 'Cuaderno',
        start_url: '/cuaderno-verano/',
        scope: '/cuaderno-verano/',
        display: 'standalone',
        background_color: '#fdf6f0',
        theme_color: '#f4a988',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
})
