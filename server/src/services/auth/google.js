import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

let client = null;
let override = null;

/** Tests inject a fake verifier: (credential) => ({ sub, email, email_verified, name }). */
export function setGoogleVerifier(fn) {
  override = fn;
}

export const googleEnabled = () => Boolean(env.GOOGLE_CLIENT_ID) || Boolean(override);

/** Verify a Google Identity Services ID token for our client ID → { googleId, email, name }. */
export async function verifyGoogleCredential(credential) {
  if (!googleEnabled()) throw new AppError('GOOGLE_AUTH_DISABLED');
  let payload;
  try {
    if (override) payload = await override(credential);
    else {
      client ??= new OAuth2Client(env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    }
  } catch {
    throw new AppError('GOOGLE_AUTH_FAILED');
  }
  if (!payload?.sub || !payload.email || payload.email_verified === false) throw new AppError('GOOGLE_AUTH_FAILED');
  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name ?? payload.email.split('@')[0],
  };
}
