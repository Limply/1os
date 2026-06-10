import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8100,
    allowedHosts: ['ast1.sim-eng.com', 'ast2.sim-eng.com'],
    proxy: {
      '/api': 'http://127.0.0.1:8001',
      '/admin': 'http://127.0.0.1:8001',
      '/static': 'http://127.0.0.1:8001',
      '/media': 'http://127.0.0.1:8001',
    },
  },
})
