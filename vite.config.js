import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base relativo: funziona su GitHub Pages con qualsiasi nome di repository.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    // Target esplicito, più ampio del predefinito (Safari >= 16.4):
    // così il codice viene trasformato anche per Safari 15.x e iOS 15,
    // invece di usare sintassi che nei browser vecchi blocca tutta l'app.
    target: ["chrome107", "edge107", "firefox104", "safari15.6", "ios15.6"],
  },
})
