import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const base = {
  windowMs: 60_000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
};

/** Login: LOGIN_RATE_LIMIT_PER_MINUTE per IP (default 10). */
export const loginLimiter = rateLimit({ ...base, limit: () => env.LOGIN_RATE_LIMIT_PER_MINUTE });

/** Self-registration: REGISTER_RATE_LIMIT_PER_HOUR per IP (default 10). */
export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60_000,
  limit: () => env.REGISTER_RATE_LIMIT_PER_HOUR,
});

/** Place search: 40/min/IP (typing is debounced on the client; results are cached). */
export const geocodeLimiter = rateLimit({ ...base, limit: 40 });

/** Everything: 300/min/IP. */
export const globalLimiter = rateLimit({ ...base, limit: 300 });

/** Accept / reject / request-hospital: 30/min/user (mount after `authenticate`). */
export const actionLimiter = rateLimit({
  ...base,
  limit: 30,
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip)),
});
