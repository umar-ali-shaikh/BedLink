import http from 'node:http';
import { env } from './config/env.js';
import { connectDB, disconnectDB, ensureIndexes } from './config/db.js';
import './models/index.js';
import { purgeDemoData } from './utils/purgeDemo.js';
import { ensureAdmin } from './services/auth/bootstrapAdmin.js';
import { createApp } from './app.js';
import { createSocketServer } from './sockets/index.js';
import { clearAllBookingOfferTimeouts, restoreBookingOfferTimers } from './services/booking/index.js';
import { clearAllOfferTimeouts, restorePendingTimers } from './services/emergency/index.js';
import { startSweeper, stopSweeper, sweepOnce } from './services/sweeper.js';
import { errorMeta, logger } from './utils/logger.js';

async function start() {
  await connectDB();
  await ensureIndexes();
  if (env.PURGE_DEMO_DATA) await purgeDemoData();
  await ensureAdmin();

  const app = createApp();
  const server = http.createServer(app);
  const io = createSocketServer(server);

  // Recover work from before a restart: overdue items now, pending offers via timers.
  await sweepOnce();
  const restored = await restorePendingTimers();
  const restoredBookingOffers = await restoreBookingOfferTimers();
  startSweeper();

  server.listen(env.PORT, env.HOST, () => {
    logger.info('server.listening', {
      host: env.HOST,
      port: env.PORT,
      env: env.NODE_ENV,
      restoredOfferTimers: restored,
      restoredBookingOfferTimers: restoredBookingOffers,
    });
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('server.shutdown', { signal });
    stopSweeper();
    clearAllOfferTimeouts();
    clearAllBookingOfferTimeouts();
    io.close();
    server.close();
    await disconnectDB().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.error('server.start_failed', errorMeta(err));
  process.exit(1);
});
