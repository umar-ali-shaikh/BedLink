import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

export async function connectDB(uri = env.MONGO_URI) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info('mongo.connected', { host: mongoose.connection.host });
  return mongoose.connection;
}

/**
 * Create collections and indexes up front. Transactions cannot implicitly create
 * collections on every server version, and the geo/partial unique indexes must exist
 * before the first request relies on them.
 */
export async function ensureIndexes() {
  const models = Object.values(mongoose.models);
  for (const model of models) {
    await model.createCollection().catch((err) => {
      if (err.codeName !== 'NamespaceExists') throw err;
    });
  }
  await Promise.all(models.map((model) => model.init()));
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

/**
 * Run `fn(session)` inside a MongoDB transaction when MONGO_TRANSACTIONS=true.
 * Otherwise runs `fn(null)` and callers rely on conditional updates + compensation
 * (ARCHITECTURE.md §13.3). `fn` may be retried on transient errors, so it must only
 * touch the database (no emits, no timers).
 */
export async function runInTransaction(fn) {
  if (!env.MONGO_TRANSACTIONS) return fn(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
