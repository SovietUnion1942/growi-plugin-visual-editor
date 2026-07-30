import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './index.js',
      name: 'GrowiPluginVisualEditor',
      fileName: 'index',
      formats: ['umd']
    },
    rollupOptions: {
      // GROWI側で用意されているライブラリ等があればここで除外できますが、まずはこのままでOKです
      external: [],
      output: {
        globals: {}
      }
    }
  }
});