import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: false,
    hmr: {
      overlay: true
    }
  },
  optimizeDeps: {
    force: true
  },
  build: {
    sourcemap: true
  }
})
