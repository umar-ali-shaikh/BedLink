import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the API and Socket.IO are proxied through Vite, so the browser talks to one
// origin (cookies "just work" and the app is reachable from a phone on the LAN).
// Production builds point at the deployed server via VITE_API_URL / VITE_SOCKET_URL.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': { target, changeOrigin: false },
        '/socket.io': { target, ws: true, changeOrigin: false },
      },
    },
  };
});
