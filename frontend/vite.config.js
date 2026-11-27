import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const qaMode = mode === 'qa';
  const apiUrl = env.VITE_API_URL || (qaMode ? '' : 'http://127.0.0.1:4000/api');
  const expectedApiPort = qaMode ? '4001' : '4000';

  if (qaMode) {
    let parsedApi;
    try { parsedApi = new URL(apiUrl); } catch { parsedApi = null; }
    if (!parsedApi || !['127.0.0.1', 'localhost', '[::1]'].includes(parsedApi.hostname) || parsedApi.port !== expectedApiPort) {
      throw new Error('Modo QA requiere VITE_API_URL loopback con puerto 4001; configura frontend/.env.qa antes de iniciar.');
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: qaMode ? 5174 : 5173,
      strictPort: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
        '@app': path.resolve(process.cwd(), './src/app'),
        '@core': path.resolve(process.cwd(), './src/core'),
        '@shared': path.resolve(process.cwd(), './src/shared'),
        '@modules': path.resolve(process.cwd(), './src/modules'),
      },
      extensions: ['.mjs', '.js', '.mts', '.ts', '.tsx', '.jsx', '.json'],
    },
  };
});
