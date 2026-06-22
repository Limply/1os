import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Server-specific values come from the gitignored root .env so this committed
// file stays identical across servers (SE / Astronic). See .env.template.
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '..'), '')
  const port = parseInt(env.VITE_PORT || '5173', 10)
  const apiTarget = env.VITE_API_TARGET || 'http://127.0.0.1:8000'
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean)

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port,
      allowedHosts,
      proxy: {
        '/api': apiTarget,
        '/admin': apiTarget,
        '/static': apiTarget,
        '/media': apiTarget,
      },
    },
  }
})
