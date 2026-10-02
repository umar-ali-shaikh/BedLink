import { ERROR_CODES } from '../constants/errorCodes.js';

/** Operational error with a stable code. `throw new AppError('BED_NOT_AVAILABLE')`. */
export class AppError extends Error {
  constructor(code, message, httpStatus, details) {
    const known = ERROR_CODES[code] ?? ERROR_CODES.INTERNAL_ERROR;
    super(message ?? known.message);
    this.name = 'AppError';
    this.code = ERROR_CODES[code] ? code : 'INTERNAL_ERROR';
    this.httpStatus = httpStatus ?? known.status;
    if (details) this.details = details;
  }
}

export const notFound = (what = 'Resource') => new AppError('RESOURCE_NOT_FOUND', `${what} not found`);
export const forbidden = (message) => new AppError('FORBIDDEN', message);
