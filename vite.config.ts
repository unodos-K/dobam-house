import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// @ts-ignore
import crypto from 'node:crypto';

// Node.js v18 이하에서 PWA 빌드(serialize-javascript) 시 발생하는 crypto is not defined 에러 해결
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = crypto.webcrypto;
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      manifest: {
        name: '도밤가계부',
        short_name: '도밤가계부',
        description: '우리 부부와 고양이의 보금자리를 위한 가계부',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
