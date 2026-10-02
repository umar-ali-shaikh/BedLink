import { env } from '../../config/env.js';
import { ROLES } from '../../constants/roles.js';
import { User } from '../../models/index.js';
import { logger } from '../../utils/logger.js';
import { hashPassword } from './password.js';

/**
 * ADMIN_EMAIL + ADMIN_PASSWORD → make sure that admin exists with that password (creates it,
 * or resets the password/role so a leaked demo password can be rotated from the host's env).
 */
export async function ensureAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  const email = env.ADMIN_EMAIL.toLowerCase();
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  const existing = await User.findOne({ email });
  if (existing) {
    await User.updateOne(
      { _id: existing._id },
      { $set: { passwordHash, role: ROLES.ADMIN, hospitalId: null, isActive: true, verificationStatus: 'VERIFIED' } }
    );
    logger.info('admin.updated', { email });
  } else {
    await User.create({ name: env.ADMIN_NAME, email, passwordHash, role: ROLES.ADMIN, verificationStatus: 'VERIFIED' });
    logger.info('admin.created', { email });
  }
}
