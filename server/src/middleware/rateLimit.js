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

/** Login: 10/min/IP. */
export const loginLimiter = rateLimit({ ...base, limit: 10 });

/** Everything: 300/min/IP. */
export const globalLimiter = rateLimit({ ...base, limit: 300 });

/** Accept / reject / request-hospital: 30/min/user (mount after `authenticate`). */
export const actionLimiter = rateLimit({
  ...base,
  limit: 30,
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip)),
});
