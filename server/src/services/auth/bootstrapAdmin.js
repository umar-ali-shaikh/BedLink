import { env } from '../../config/env.js';
import { ROLES } from '../../constants/roles.js';
import { User } from '../../models/index.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { hashPassword } from './password.js';

export const ADMIN_PASSWORD_MIN = 10;

/**
 * Create the admin `email`, or reset its password if it already exists. Refuses to turn an
 * existing hospital or ambulance account into an admin. Returns 'created' | 'updated'.
 */
export async function upsertAdmin({ email, password, name = env.ADMIN_NAME }) {
  const normalized = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new AppError('VALIDATION_ERROR', 'Enter a valid email address');
  if (!password || password.length < ADMIN_PASSWORD_MIN) {
    throw new AppError('VALIDATION_ERROR', `Password must be at least ${ADMIN_PASSWORD_MIN} characters`);
  }
  const passwordHash = await hashPassword(password);
  const existing = await User.findOne({ email: normalized });
  if (existing && existing.role !== ROLES.ADMIN) {
    throw new AppError(
      'DUPLICATE_RESOURCE',
      `${normalized} is already a ${existing.role} account — use another email for the admin`
    );
  }
  if (existing) {
    await User.updateOne(
      { _id: existing._id },
      { $set: { passwordHash, isActive: true, verificationStatus: 'VERIFIED', ...(name ? { name } : {}) } }
    );
    logger.info('admin.updated', { email: normalized });
    return 'updated';
  }
  await User.create({
    name: name || 'BedLink Admin',
    email: normalized,
    passwordHash,
    role: ROLES.ADMIN,
    verificationStatus: 'VERIFIED',
  });
  logger.info('admin.created', { email: normalized });
  return 'created';
}

/**
 * ADMIN_EMAIL + ADMIN_PASSWORD (host env) → make sure that admin exists with that password.
 * Never stops the server: a weak password or a clash with another account is logged and skipped.
 */
export async function ensureAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  if (env.ADMIN_PASSWORD.length < ADMIN_PASSWORD_MIN) {
    logger.warn('admin.skipped_weak_password', {
      email: env.ADMIN_EMAIL,
      hint: `ADMIN_PASSWORD must be at least ${ADMIN_PASSWORD_MIN} characters; admin was not created or updated`,
    });
    return;
  }
  try {
    await upsertAdmin({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
  } catch (err) {
    logger.warn('admin.skipped', { email: env.ADMIN_EMAIL, reason: err.message });
  }
}
