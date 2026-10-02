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
  /** Public self-registration for ambulances and hospitals. */
  REGISTRATION_ENABLED: bool.default(true),
  /** Skip manual verification of self-registered hospitals (demos only). */
  HOSPITAL_AUTO_VERIFY: bool.default(false),
  /** Skip manual verification of self-registered ambulances (demos only). */
  AMBULANCE_AUTO_VERIFY: bool.default(false),
  /**
   * Bootstrap admin for the verification panel. When both are set, the account is created at
   * startup (or its password reset to this value) — use it to rotate the demo admin password.
   */
  ADMIN_EMAIL: z.preprocess((v) => (v === '' ? undefined : v), z.email().optional()),
  /** Checked in ensureAdmin (a weak value is skipped with a warning; it never stops the server). */
  ADMIN_PASSWORD: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  ADMIN_NAME: z.string().default('BedLink Admin'),
  /** Google Identity Services OAuth client ID (Web). Unset = Google sign-in disabled. */
  GOOGLE_CLIENT_ID: z.string().optional(),
  /** Registration attempts per IP per hour. */
  REGISTER_RATE_LIMIT_PER_HOUR: positiveInt.default(10),
  /**
   * Load the demo dataset at startup, but only when the database has no users and no
   * hospitals (a fresh Atlas cluster). Never touches a database that has data.
   */
  SEED_DEMO_ON_EMPTY: bool.default(false),
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

/**
 * Browsers send only scheme://host[:port] as Origin, so `https://app.vercel.app/login/` must
 * become `https://app.vercel.app` or CORS fails. Unparseable entries are kept as typed.
 */
function toOrigin(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

/** Parse and validate an env source. Throws an Error listing every problem. */
export function loadEnv(source) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  }
  const parsed = result.data;
  const isProduction = parsed.NODE_ENV === 'production';
  const clientOrigins = parsed.CLIENT_ORIGIN.split(',').map(toOrigin).filter(Boolean);
  // A deployed https client (e.g. Vercel) talking to this API on another site needs
  // SameSite=None; Secure cookies — decide from CLIENT_ORIGIN so a missing NODE_ENV can't break login.
  const deployedClient = clientOrigins.some(
    (o) => o.startsWith('https://') && !/\/\/(localhost|127\.0\.0\.1)(:|$)/.test(o)
  );
  const crossSiteDefault = isProduction || deployedClient;
  const cookieSameSite = parsed.COOKIE_SAMESITE ?? (crossSiteDefault ? 'none' : 'lax');
  const cookieSecure = parsed.COOKIE_SECURE ?? crossSiteDefault;
  // Render/Heroku-style hosts set these; they always sit behind one proxy hop.
  const behindProxy = isProduction || Boolean(source.RENDER || source.DYNO || source.RAILWAY_ENVIRONMENT);
  if (cookieSameSite === 'none' && !cookieSecure) {
    throw new Error('Invalid environment configuration:\n  - COOKIE_SECURE: must be true when COOKIE_SAMESITE=none');
  }
  return {
    ...parsed,
    TRUST_PROXY: parsed.TRUST_PROXY ?? (behindProxy ? 1 : 0),
    COOKIE_SAMESITE: cookieSameSite,
    COOKIE_SECURE: cookieSecure,
    DNS_SERVER_LIST: (parsed.DNS_SERVERS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    CLIENT_ORIGINS: clientOrigins,
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
