import { defineConfig } from 'vite';

/**
 * En desarrollo se sirve desde la raíz.
 * En GitHub Actions, VITE_BASE_PATH se calcula a partir de GITHUB_REPOSITORY
 * (por ejemplo, "/eco-runner-3d/") para que los assets carguen desde la
 * subruta real de GitHub Pages sin escribir a mano el usuario ni el repo.
 */
export default defineConfig({
  base: process.env.VITE_BASE_PATH || './',
  build: {
    // Three.js completo pesa ~600 kB; es el único chunk grande del proyecto.
    chunkSizeWarningLimit: 700,
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
