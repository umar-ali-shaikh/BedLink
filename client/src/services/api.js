import axios from 'axios';
import { config } from '../config';

/**
 * Axios instance (ARCHITECTURE.md §4). Cookie auth (`bl_token`) needs withCredentials.
 * Resolves to the `data` of `{ success, data }`; rejects with `{ message, code, status, details }`.
 */
const api = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

const unauthorizedListeners = new Set();
export const onUnauthorized = (fn) => {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
};

const FRIENDLY = {
  NETWORK_ERROR: 'Cannot reach the BedLink server. Check your connection and try again.',
  RATE_LIMITED: 'Too many requests — please wait a moment and try again.',
  INTERNAL_ERROR: 'Something went wrong on the server. Please try again.',
};

api.interceptors.response.use(
  (response) => response.data?.data,
  (error) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const code = body?.code || (status ? 'INTERNAL_ERROR' : 'NETWORK_ERROR');
    const normalised = {
      status,
      code,
      message: body?.message || FRIENDLY[code] || 'Something went wrong',
      details: body?.details,
    };
    if (status === 401 && !error.config?.url?.includes('/auth/')) {
      unauthorizedListeners.forEach((fn) => fn());
    }
    return Promise.reject(normalised);
  }
);

/** First field message for validation errors, else the message. */
export function errorMessage(err) {
  if (err?.details?.length) return err.details.map((d) => d.message).join(' · ');
  return err?.message || 'Something went wrong';
}

export default api;
