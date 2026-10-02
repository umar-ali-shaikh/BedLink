import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// server/.env wins over the repo-root .env; real environment variables win over both.
dotenv.config({ path: [path.join(serverRoot, '.env'), path.join(serverRoot, '..', '.env')], quiet: true });

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const positiveInt = z.coerce.number().int().positive();
const positiveNumber = z.coerce.number().positive();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: positiveInt.default(5000),
  MONGO_URI: z.string({ error: 'MONGO_URI is required' }).min(1, 'MONGO_URI is required'),
  MONGO_TRANSACTIONS: bool.default(true),
  JWT_SECRET: z.string({ error: 'JWT_SECRET is required' }).min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

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
  return {
    ...parsed,
    CLIENT_ORIGINS: parsed.CLIENT_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    isProduction: parsed.NODE_ENV === 'production',
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
