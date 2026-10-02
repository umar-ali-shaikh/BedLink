import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { requestLogger } from './middleware/requestLogger.js';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';

/** Build the Express app (no listening, no DB) so tests can use it with Supertest. */
export function createApp() {
  const app = express();

  // Hosts like Render sit behind proxy hops; needed for correct client IPs in rate limits.
  if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Google sign-in opens a popup that must be able to message this window back.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      contentSecurityPolicy: {
        directives: {
          // Map tiles (VITE_MAP_TILE_URL) and Google Fonts load from other HTTPS hosts.
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'connect-src': ["'self'", 'https:', 'wss:'],
          // Google Identity Services button (sign in with Google).
          'script-src': ["'self'", 'https://accounts.google.com'],
          'frame-src': ["'self'", 'https://accounts.google.com'],
          // Only force https in production, so plain-http local runs keep working.
          'upgrade-insecure-requests': env.isProduction ? [] : null,
        },
      },
    })
  );
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use('/api', globalLimiter, routes);
  if (env.SERVE_CLIENT_DIR) serveClient(app, env.SERVE_CLIENT_DIR);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Serve the built SPA: hashed assets cached forever, every other GET falls back to index.html. */
function serveClient(app, dir) {
  const root = path.resolve(serverRoot, dir);
  const indexHtml = path.join(root, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    logger.warn('client.not_found', { dir: root, hint: 'Build the client first (cd client && npm run build)' });
    return;
  }
  app.use('/assets', express.static(path.join(root, 'assets'), { immutable: true, maxAge: '1y', index: false }));
  app.use(express.static(root, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    // Missing files (e.g. an old /assets chunk after a deploy) must 404, never get index.html.
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    if (req.path.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(req.path)) return next();
    res.set('Cache-Control', 'no-cache');
    return res.sendFile(indexHtml);
  });
  logger.info('client.serving', { dir: root });
}
