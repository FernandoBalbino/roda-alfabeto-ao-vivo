import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'web',
  base: '/roda-alfabeto-ao-vivo/',
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173 },
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022' },
});
