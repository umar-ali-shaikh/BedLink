import mongoose from 'mongoose';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { AppError } from '../utils/AppError.js';
import { errorMeta, logger } from '../utils/logger.js';
import { fail } from '../utils/response.js';

/** Map anything thrown to the standard error shape. Internals never leave the server. */
function normalize(err) {
  if (err instanceof AppError) return err;
  if (err?.type === 'entity.parse.failed') return new AppError('VALIDATION_ERROR', 'Request body is not valid JSON');
  if (err?.type === 'entity.too.large') return new AppError('VALIDATION_ERROR', 'Request body is too large', 413);
  if (err instanceof mongoose.Error.CastError) {
    return new AppError('VALIDATION_ERROR', undefined, undefined, [{ path: err.path, message: 'Invalid value' }]);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return new AppError('VALIDATION_ERROR', undefined, undefined, details);
  }
  if (err?.code === 11000) return new AppError('DUPLICATE_RESOURCE');
  return null;
}

// Express recognises error middleware by its 4-arg signature.
export function errorHandler(err, req, res, _next) {
  const known = normalize(err);
  if (!known) {
    logger.error('request.unhandled_error', { method: req.method, path: req.path, ...errorMeta(err) });
    const internal = ERROR_CODES.INTERNAL_ERROR;
    return fail(res, { status: internal.status, code: 'INTERNAL_ERROR', message: internal.message });
  }
  return fail(res, { status: known.httpStatus, code: known.code, message: known.message, details: known.details });
}

export function notFoundHandler(req, _res, next) {
  next(new AppError('RESOURCE_NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}
