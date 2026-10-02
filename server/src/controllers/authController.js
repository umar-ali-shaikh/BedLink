import { AUTH_COOKIE_NAME, authCookieOptions } from '../config/cookie.js';
import { describeUser, login as loginUser, loginWithGoogle } from '../services/auth/index.js';
import { sendVerificationCode, verifyEmailCode } from '../services/auth/emailVerification.js';
import { googleEnabled } from '../services/auth/google.js';
import { env } from '../config/env.js';
import {
  registerAmbulance as registerAmbulanceUser,
  registerHospital as registerHospitalUser,
} from '../services/auth/register.js';
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

/** Self-registration signs the new account in, like login. */
const signedIn = (register) => async (req, res) => {
  const { token, user } = await register(req.body);
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
  return res.status(201).json({ success: true, data: { user } });
};

export const registerAmbulance = signedIn(registerAmbulanceUser);
export const registerHospital = signedIn(registerHospitalUser);

export async function google(req, res) {
  const { token, user } = await loginWithGoogle(req.body.credential);
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
  return ok(res, { user });
}

/** Public: what the login/register screens should offer. */
export function config(_req, res) {
  return ok(res, {
    googleClientId: googleEnabled() ? (env.GOOGLE_CLIENT_ID ?? null) : null,
    emailVerification: env.EMAIL_VERIFICATION,
    registrationEnabled: env.REGISTRATION_ENABLED,
  });
}

export const sendEmailCode = async (req, res) => ok(res, await sendVerificationCode(req.user.id));
export const verifyEmail = async (req, res) => ok(res, await verifyEmailCode(req.user.id, req.body.code));
