import { env } from './env.js';

/** Exact-origin CORS with credentials, shared by Express and Socket.IO. */
export const corsOptions = {
  origin: env.CLIENT_ORIGINS.length === 1 ? env.CLIENT_ORIGINS[0] : env.CLIENT_ORIGINS,
  credentials: true,
};
