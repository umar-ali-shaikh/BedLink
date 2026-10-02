import dns from 'node:dns';
import http from 'node:http';
import { env } from './config/env.js';
import { connectDB, disconnectDB, ensureIndexes } from './config/db.js';
import './models/index.js';
import { createApp } from './app.js';
import { createSocketServer } from './sockets/index.js';
import { clearAllOfferTimeouts, restorePendingTimers } from './services/emergency/index.js';
import { startSweeper, stopSweeper, sweepOnce } from './services/sweeper.js';
import { errorMeta, logger } from './utils/logger.js';

/** Opt-in DNS override (DNS_SERVERS) for networks whose resolver can't look up Atlas SRV records. */
function configureDns() {
  dns.setDefaultResultOrder('ipv4first');
  if (env.DNS_SERVER_LIST.length) dns.setServers(env.DNS_SERVER_LIST);
}

async function start() {
  configureDns();
  await connectDB();
  await ensureIndexes();

  const app = createApp();
  const server = http.createServer(app);
  const io = createSocketServer(server);

  // Recover work from before a restart: overdue items now, pending offers via timers.
  await sweepOnce();
  const restored = await restorePendingTimers();
  startSweeper();

  server.listen(env.PORT, env.HOST, () => {
    logger.info('server.listening', {
      host: env.HOST,
      port: env.PORT,
      env: env.NODE_ENV,
      restoredOfferTimers: restored,
    });
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('server.shutdown', { signal });
    stopSweeper();
    clearAllOfferTimeouts();
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
