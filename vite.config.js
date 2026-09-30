import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base relativo: funziona su GitHub Pages con qualsiasi nome di repository.
export default defineConfig({
  base: "./",
  plugins: [react()],
})
