import { resolve } from 'node:path';

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, resolve(__dirname, '..'), 'VITE_');
  const localEnv = loadEnv(mode, __dirname, 'VITE_');

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        localEnv.VITE_API_BASE_URL ?? rootEnv.VITE_API_BASE_URL ?? '/api',
      ),
    },
    server: {
      port: 4021,
      proxy: {
        '/api': {
          target: 'http://localhost:9173',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
