import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0', // Listen on all interfaces (IPv4)
    proxy: {
      '/api': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
      '/kong': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
      '/images': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
    },
  },
})