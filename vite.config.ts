import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // En preview local el SW cacheaba builds viejos y parecía que “no se podía” elegir fechas futuras
      selfDestroying: true,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'RutaDos',
        short_name: 'RutaDos',
        description: 'Planifica viajes en pareja: destino, gustos y rutas editables',
        theme_color: '#0b1f24',
        background_color: '#e8efed',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'es',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
