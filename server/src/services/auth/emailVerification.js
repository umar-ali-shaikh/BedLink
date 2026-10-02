import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { User } from '../../models/index.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { sendMail } from '../mail/index.js';

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;

const hashCode = (userId, code) => crypto.createHash('sha256').update(`${userId}:${code}`).digest('hex');

function verificationEmail(name, code) {
  const minutes = env.EMAIL_CODE_TTL_MINUTES;
  const text = `Hi ${name},\n\nYour BedLink verification code is ${code}.\nIt expires in ${minutes} minutes.\n\nIf you didn't create a BedLink account, ignore this email.`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0F172A">
  <p style="font-weight:700;font-size:18px;margin:0 0 16px">BedLink</p>
  <p>Hi ${name.replace(/[<>&]/g, '')},</p>
  <p>Your verification code is</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:8px 0 16px;color:#0B63CE">${code}</p>
  <p style="color:#475569">It expires in ${minutes} minutes. If you didn't create a BedLink account, ignore this email.</p>
</div>`;
  return { subject: `${code} is your BedLink verification code`, text, html };
}

/**
 * Create a fresh 6-digit code (stored hashed, expires in EMAIL_CODE_TTL_MINUTES) and email it.
 * `force` skips the 60 s resend cooldown (used right after registration).
 */
export async function sendVerificationCode(userId, { force = false } = {}) {
  const user = await User.findById(userId).select('+emailVerification');
  if (!user) throw notFound('User');
  if (user.emailVerified) return { alreadyVerified: true };
  const last = user.emailVerification?.sentAt?.getTime() ?? 0;
  if (!force && Date.now() - last < RESEND_COOLDOWN_MS) throw new AppError('EMAIL_CODE_COOLDOWN');

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  user.emailVerification = {
    codeHash: hashCode(user._id, code),
    expiresAt: new Date(Date.now() + env.EMAIL_CODE_TTL_MINUTES * 60_000),
    attempts: 0,
    sentAt: new Date(),
  };
  await user.save();
  await sendMail({ to: user.email, ...verificationEmail(user.name, code) });
  return { sent: true, expiresAt: user.emailVerification.expiresAt };
}

/** Check a code; 5 wrong tries burn it. Success marks the email verified. */
export async function verifyEmailCode(userId, code) {
  const user = await User.findById(userId).select('+emailVerification');
  if (!user) throw notFound('User');
  if (user.emailVerified) return { verified: true };
  const pending = user.emailVerification;
  if (!pending?.codeHash || pending.expiresAt < new Date() || pending.attempts >= MAX_ATTEMPTS) {
    throw new AppError('EMAIL_CODE_EXPIRED');
  }
  const ok = crypto.timingSafeEqual(Buffer.from(pending.codeHash), Buffer.from(hashCode(user._id, code)));
  if (!ok) {
    await User.updateOne({ _id: user._id }, { $inc: { 'emailVerification.attempts': 1 } });
    throw new AppError(
      'EMAIL_CODE_INVALID',
      `That code is not correct (${MAX_ATTEMPTS - pending.attempts - 1} tries left)`
    );
  }
  await User.updateOne({ _id: user._id }, { $set: { emailVerified: true }, $unset: { emailVerification: 1 } });
  logger.info('email.verified', { userId: user._id.toString() });
  return { verified: true };
}

/** After sign-up: send the first code, but never fail the registration because mail failed. */
export async function sendFirstCode(userId) {
  try {
    await sendVerificationCode(userId, { force: true });
  } catch (err) {
    logger.error('email.first_code_failed', { userId: String(userId), errMessage: err?.message });
  }
}
