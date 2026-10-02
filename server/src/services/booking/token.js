import { createHash, randomBytes } from 'node:crypto';
import { TRACKING_TOKEN_BYTES } from '../../constants/booking.js';

/** Unguessable tracking token (192 bits, URL-safe). Shown once, stored only as a hash. */
export const generateTrackingToken = () => randomBytes(TRACKING_TOKEN_BYTES).toString('base64url');

export const hashTrackingToken = (token) => createHash('sha256').update(String(token)).digest('hex');
