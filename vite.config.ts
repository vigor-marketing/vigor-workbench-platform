import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const productEncoderProxy = {
  target: 'http://127.0.0.1:18080',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/apps\/product-encoder/, ''),
}

const salesCommissionProxy = {
  target: 'http://127.0.0.1:18081',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/apps\/sales-commission/, ''),
}

export default defineConfig({
  plugins: [react()],
  preview: {
    host: '127.0.0.1',
    port: 8088,
    proxy: {
      '/api': 'http://127.0.0.1:4000',
      '/apps/product-encoder': productEncoderProxy,
      '/apps/sales-commission': salesCommissionProxy,
    },
  },
  server: {
    port: 4173,
    proxy: {
      '/api': 'http://127.0.0.1:4000',
      '/apps/product-encoder': productEncoderProxy,
      '/apps/sales-commission': salesCommissionProxy,
    },
  },
})
