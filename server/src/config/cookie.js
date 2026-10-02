import { env } from './env.js';

export const AUTH_COOKIE_NAME = 'bl_token';

/**
 * Cookie options for the auth token. Production is cross-site (Vercel ↔ Render), so it
 * needs `sameSite: 'none'` + `secure`. Logout must clear with the same options.
 */
export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
  };
}
