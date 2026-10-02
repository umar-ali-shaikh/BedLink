import { io } from 'socket.io-client';
import { config } from '../config';

/**
 * Socket singleton. The server authenticates the handshake with the `bl_token` cookie and
 * joins rooms from the token, so we only connect after login (ARCHITECTURE.md §9.1).
 * Without VITE_SOCKET_URL it connects to the page origin (Vite proxies /socket.io in dev).
 */
export const socket = io(config.socketUrl, {
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 8000,
});
