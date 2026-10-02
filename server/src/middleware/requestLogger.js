import { logger } from '../utils/logger.js';

/** One JSON line per request — no bodies, no cookies, no secrets. */
export function requestLogger(req, res, next) {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - started) / 1_000_000n),
      userId: req.user?.id,
    });
  });
  next();
}
