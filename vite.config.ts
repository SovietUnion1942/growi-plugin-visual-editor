import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: ['/client-entry.ts'],
    },
  },
});
