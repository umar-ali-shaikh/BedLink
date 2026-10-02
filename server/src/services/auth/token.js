import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

/** HS256 JWT with `{ sub, role, hospitalId }` (ARCHITECTURE.md §14). */
export function signToken(user) {
  return jwt.sign({ role: user.role, hospitalId: user.hospitalId ? String(user.hospitalId) : null }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
    subject: String(user.id ?? user._id),
  });
}

/** Returns the payload or null for any invalid/expired token. */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}
