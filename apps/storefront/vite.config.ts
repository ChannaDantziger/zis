import { defineConfig } from 'vite';

// Configuration is supplied by the process; do not load local secret files.
export default defineConfig({
  envDir: false,
  // Keep module paths intact: native realpath fails in the Windows workspace sandbox.
  resolve: { preserveSymlinks: true },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:3000', rewrite: path => path.replace(/^\/api/, '') } },
  },
  preview: { host: '127.0.0.1', port: 4174, strictPort: true },
});
