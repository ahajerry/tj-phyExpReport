import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  ...(command === 'serve' ? {
    server: {
      host: '127.0.0.1',
      // Windows Hyper-V/WSL may reserve the default 5173 port range.
      port: 15173,
      watch: {
        // Report jobs create, lock and delete files here while Vite is running.
        ignored: /[/\\](?:\.report-data|output|tmp[^/\\]*)(?:[/\\]|$)/,
      },
      proxy: {
        '/api': 'http://127.0.0.1:8000',
      },
    },
  } : {}),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
