import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      '@app': path.resolve(process.cwd(), './src/app'),
      '@core': path.resolve(process.cwd(), './src/core'),
      '@shared': path.resolve(process.cwd(), './src/shared'),
      '@modules': path.resolve(process.cwd(), './src/modules'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.tsx', '.jsx', '.json']
  },
});