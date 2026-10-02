import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// server/.env wins over the repo-root .env; real environment variables win over both.
dotenv.config({ path: [path.join(serverRoot, '.env'), path.join(serverRoot, '..', '.env')], quiet: true });

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const optionalBool = z.preprocess((v) => (v === '' ? undefined : v), bool.optional());
const positiveInt = z.coerce.number().int().positive();
const positiveNumber = z.coerce.number().positive();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: positiveInt.default(5000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  MONGO_URI: z.string({ error: 'MONGO_URI is required' }).min(1, 'MONGO_URI is required'),
  MONGO_TRANSACTIONS: bool.default(true),
  JWT_SECRET: z.string({ error: 'JWT_SECRET is required' }).min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  /** Comma-separated list of allowed browser origins (CORS + Socket.IO). */
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

  // Deployment knobs. Unset = sensible default for NODE_ENV.
  /** Proxy hops in front of the app (Render/Railway/Nginx = 1). Default: 1 in production, 0 otherwise. */
  TRUST_PROXY: z.coerce.number().int().min(0).optional(),
  /** Cookie SameSite. Default: 'none' in production (client and API on different sites), 'lax' otherwise. */
  COOKIE_SAMESITE: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['lax', 'strict', 'none']).optional()),
  /** Cookie Secure flag. Default: true in production. Must be true when COOKIE_SAMESITE=none. */
  COOKIE_SECURE: optionalBool,
  /** Optional cookie domain, e.g. `.example.com` when client and API share a parent domain. */
  COOKIE_DOMAIN: z.string().optional(),
  /** Optional comma-separated DNS servers (e.g. `8.8.8.8,8.8.4.4`) for networks that can't resolve Atlas SRV records. */
  DNS_SERVERS: z.string().optional(),
  /**
   * Optional path to the built client (`client/dist`). When set, this server also serves the
   * SPA, so app + API share one origin (no CORS, first-party cookies, WebSockets work).
   */
  SERVE_CLIENT_DIR: z.string().optional(),
  /** `npm run seed` wipes the database; in production it refuses unless this is true. */
  SEED_ALLOW_PRODUCTION: bool.default(false),

  OFFER_TIMEOUT_SECONDS: positiveNumber.default(120),
  RESERVATION_HOLD_MINUTES: positiveNumber.default(30),
  SWEEPER_INTERVAL_SECONDS: positiveNumber.default(10),
  LOGIN_RATE_LIMIT_PER_MINUTE: positiveInt.default(10),

  FRESHNESS_FRESH_SECONDS: positiveInt.default(120),
  FRESHNESS_RECENT_SECONDS: positiveInt.default(600),
  MATCH_MAX_ETA_MINUTES: positiveInt.default(60),
  MATCH_MAX_RADIUS_KM: positiveNumber.default(50),
  MATCH_CRITICAL_LOAD: z.coerce.number().min(0).max(100).default(95),
  CONFIDENCE_TIMEOUT_WINDOW_MINUTES: positiveInt.default(30),
  AVG_AMBULANCE_SPEED_KMPH: positiveNumber.default(30),
  ROAD_FACTOR: positiveNumber.default(1.3),
});

/** Parse and validate an env source. Throws an Error listing every problem. */
export function loadEnv(source) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  const parsed = result.data;
  const isProduction = parsed.NODE_ENV === 'production';
  const cookieSameSite = parsed.COOKIE_SAMESITE ?? (isProduction ? 'none' : 'lax');
  const cookieSecure = parsed.COOKIE_SECURE ?? isProduction;
  if (cookieSameSite === 'none' && !cookieSecure) {
    throw new Error('Invalid environment configuration:\n  - COOKIE_SECURE: must be true when COOKIE_SAMESITE=none');
  }
  return {
    ...parsed,
    TRUST_PROXY: parsed.TRUST_PROXY ?? (isProduction ? 1 : 0),
    COOKIE_SAMESITE: cookieSameSite,
    COOKIE_SECURE: cookieSecure,
    DNS_SERVER_LIST: (parsed.DNS_SERVERS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    CLIENT_ORIGINS: parsed.CLIENT_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    isProduction,
    isTest: parsed.NODE_ENV === 'test',
  };
}

let loaded;
try {
  loaded = loadEnv(process.env);
} catch (err) {
  console.error(`\n[BedLink] ${err.message}\n\nCopy .env.example to .env and fill in the values.\n`);
  process.exit(1);
}

/**
 * Validated configuration. Intentionally not frozen so tests can shorten timers
 * (e.g. `env.OFFER_TIMEOUT_SECONDS = 1`); application code must never mutate it.
 */
export const env = loaded;
