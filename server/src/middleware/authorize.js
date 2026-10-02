import { AppError } from '../utils/AppError.js';

/** Route-level RBAC. Ownership checks still happen in the services. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError('UNAUTHORIZED'));
    if (!roles.includes(req.user.role)) return next(new AppError('FORBIDDEN'));
    return next();
  };
