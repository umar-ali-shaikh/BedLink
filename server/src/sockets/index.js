import { Server } from 'socket.io';
import { corsOptions } from '../config/cors.js';
import { AUTH_COOKIE_NAME } from '../config/cookie.js';
import { resolveToken } from '../services/auth/index.js';
import { attachIO } from '../services/notification/index.js';
import { parseCookieHeader } from '../utils/cookies.js';
import { errorMeta, logger } from '../utils/logger.js';
import { joinDefaultRooms, registerHandlers } from './handlers.js';

/**
 * Attach Socket.IO to the HTTP server. The handshake must carry a valid `bl_token`
 * cookie; anything else is refused (RULES.md §7).
 */
export function createSocketServer(httpServer) {
  const io = new Server(httpServer, { cors: corsOptions });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookieHeader(socket.handshake.headers.cookie);
      const user = await resolveToken(cookies[AUTH_COOKIE_NAME]);
      if (!user) return next(new Error('UNAUTHORIZED'));
      socket.data.user = user;
      return next();
    } catch (err) {
      logger.error('socket.auth_failed', errorMeta(err));
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    joinDefaultRooms(socket);
    registerHandlers(socket);
    logger.debug('socket.connected', { userId: socket.data.user.id, role: socket.data.user.role });
  });

  attachIO(io);
  return io;
}
