import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// https://vite.dev/config/
const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT || '5173', 10),
      proxy: env.VITE_API_URL
        ? {}
        : {
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true,
            },
          },
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
    },
  }
})
