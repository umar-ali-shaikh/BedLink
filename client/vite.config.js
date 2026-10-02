import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev: the browser talks only to Vite, which proxies /api and /socket.io to
 * VITE_PROXY_TARGET (cookies work without CORS, and phones on the LAN can connect).
 * Production: set VITE_API_URL / VITE_SOCKET_URL to the deployed server before `npm run build`
 * (or leave them unset when a reverse proxy serves the API on the same origin).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  const port = Number(env.VITE_DEV_PORT) || 5173;
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    server: {
      port,
      host: true,
      proxy: {
        '/api': { target, changeOrigin: false },
        '/socket.io': { target, ws: true, changeOrigin: false },
      },
    },
    preview: {
      port: Number(env.VITE_PREVIEW_PORT) || 4173,
      host: true,
      proxy: {
        '/api': { target, changeOrigin: false },
        '/socket.io': { target, ws: true, changeOrigin: false },
      },
    },
    build: {
      sourcemap: env.VITE_SOURCEMAP === 'true',
    },
  };
});
