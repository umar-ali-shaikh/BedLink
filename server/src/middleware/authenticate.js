import { AUTH_COOKIE_NAME } from '../config/cookie.js';
import { resolveToken } from '../services/auth/index.js';
import { AppError } from '../utils/AppError.js';

/** Reads the `bl_token` cookie, verifies it and re-loads the user → `req.user`. */
export async function authenticate(req, _res, next) {
  try {
    const user = await resolveToken(req.cookies?.[AUTH_COOKIE_NAME]);
    if (!user) return next(new AppError('UNAUTHORIZED'));
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}
