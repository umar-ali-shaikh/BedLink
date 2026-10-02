import { AUTH_COOKIE_NAME, authCookieOptions } from '../config/cookie.js';
import { describeUser, login as loginUser } from '../services/auth/index.js';
import { ok } from '../utils/response.js';

/** Token lives only in the HttpOnly cookie; it is never in the response body. */
export async function login(req, res) {
  const { token, user } = await loginUser(req.body);
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
  return ok(res, { user });
}

export function logout(_req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions());
  return ok(res, { loggedOut: true });
}

export async function me(req, res) {
  return ok(res, { user: await describeUser(req.user) });
}
