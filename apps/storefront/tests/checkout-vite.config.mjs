import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  envDir: fileURLToPath(new URL('../node_modules/.cache/checkout-qa-env', import.meta.url)),
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') },
  resolve: { preserveSymlinks: true },
  build: { outDir: 'dist-checkout-qa', emptyOutDir: true },
});
