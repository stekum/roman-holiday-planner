import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Default base is the main production path. For the Firebase beta build we
// override via VITE_BASE=/roman-holiday-planner/beta/ so the bundle references
// assets under the beta subfolder on GitHub Pages.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE ?? '/roman-holiday-planner/',
})
