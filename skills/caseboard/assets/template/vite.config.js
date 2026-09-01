import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 5180, open: false },
  // three.js 本身就有 500KB+，这个警告没有信息量
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
})
