import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 6100,
    allowedHosts: ['se-1os.sim-eng.com', 'dev.sim-eng.com'],
    proxy: {
      '/api': 'http://127.0.0.1:6001',
      '/admin': 'http://127.0.0.1:6001',
      '/static': 'http://127.0.0.1:6001',
      '/media': 'http://127.0.0.1:6001',
    },
  },
})
