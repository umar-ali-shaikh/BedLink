import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { errorMeta, logger } from '../../utils/logger.js';

let override = null;
let smtp = null;

/** Tests (and diagnostics) can capture mail instead of sending it. Pass null to restore. */
export function setMailTransport(fn) {
  override = fn;
}

export const mailProvider = () => (env.RESEND_API_KEY ? 'resend' : env.SMTP_HOST ? 'smtp' : 'log');

async function sendWithResend({ to, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function sendWithSmtp({ to, subject, text, html }) {
  smtp ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  await smtp.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
}

/**
 * Send one email. Provider: RESEND_API_KEY → Resend, SMTP_HOST → SMTP, otherwise the
 * message is written to the server log (development, or until a provider is configured).
 * Returns true when handed to a provider.
 */
export async function sendMail(message) {
  if (override) {
    await override(message);
    return true;
  }
  const provider = mailProvider();
  if (provider === 'log') {
    logger.warn('mail.not_configured', { to: message.to, subject: message.subject, text: message.text });
    return false;
  }
  try {
    await (provider === 'resend' ? sendWithResend(message) : sendWithSmtp(message));
    logger.info('mail.sent', { provider, to: message.to, subject: message.subject });
    return true;
  } catch (err) {
    logger.error('mail.failed', { provider, to: message.to, ...errorMeta(err) });
    throw err;
  }
}
