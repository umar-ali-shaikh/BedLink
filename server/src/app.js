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

/** Build the Express app (no listening, no DB) so tests can use it with Supertest. */
export function createApp() {
  const app = express();

  // Render / Vercel sit behind one proxy hop; needed for correct client IPs in rate limits.
  if (env.isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use('/api', globalLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
