import { AppError } from '../utils/AppError.js';

/** Route-level RBAC. Ownership checks still happen in the services. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError('UNAUTHORIZED'));
    if (!roles.includes(req.user.role)) return next(new AppError('FORBIDDEN'));
    // Every role-protected route needs a confirmed email (auth/* routes don't use authorize).
    if (req.user.emailVerified === false) return next(new AppError('EMAIL_NOT_VERIFIED'));
    return next();
  };
