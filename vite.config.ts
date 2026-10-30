/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the app works under GitHub Pages' /pokemon-team-builder/ path.
  base: './',
  // The whole Soulgold snapshot is bundled so the app works offline (~0.5 MB gzipped); sprites are in public/soulgold/.
  build: { chunkSizeWarningLimit: 4000 },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
