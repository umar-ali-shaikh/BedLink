import { env } from './env.js';

export const AUTH_COOKIE_NAME = 'bl_token';

/**
 * Cookie options for the auth token, from env (COOKIE_SAMESITE / COOKIE_SECURE /
 * COOKIE_DOMAIN). Defaults: production is cross-site (e.g. Vercel ↔ Render) so
 * `sameSite: 'none'` + `secure`; development is `lax`. Logout must clear with the same options.
 */
export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}
