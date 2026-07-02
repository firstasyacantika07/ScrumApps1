import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'countably-astute-malachi.ngrok-free.dev',
      '.ngrok-free.dev', // jaga-jaga kalau domain ngrok berubah di masa depan
    ],
  },
})