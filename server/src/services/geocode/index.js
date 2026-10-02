import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { errorMeta, logger } from '../../utils/logger.js';

/**
 * Place search / reverse lookup through an OpenStreetMap Nominatim-compatible geocoder
 * (GEOCODER_URL). Server-side so we can send a proper User-Agent (Nominatim's usage
 * policy), cache answers and rate-limit clients. Results: [{ label, lat, lng }].
 */
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 1000;
const cache = new Map();
let override = null;

/** Tests inject a fake: (kind, params) => raw Nominatim-shaped rows. */
export function setGeocoder(fn) {
  override = fn;
  cache.clear();
}

function remember(key, value) {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { value, at: Date.now() });
  return value;
}

function recall(key) {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at > TTL_MS) return undefined;
  return hit.value;
}

async function call(kind, params) {
  if (override) return override(kind, params);
  const url = new URL(`${env.GEOCODER_URL.replace(/\/+$/, '')}/${kind}`);
  Object.entries({ format: 'jsonv2', ...params }).forEach(
    ([k, v]) => v != null && v !== '' && url.searchParams.set(k, v)
  );
  if (env.GEOCODER_EMAIL) url.searchParams.set('email', env.GEOCODER_EMAIL);
  const res = await fetch(url, {
    headers: { 'User-Agent': `BedLink/1.0 (${env.GEOCODER_EMAIL || 'bed coordination app'})`, 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`geocoder ${res.status}`);
  return res.json();
}

const toPlace = (row) => ({
  label: row.display_name,
  lat: Number(Number(row.lat).toFixed(6)),
  lng: Number(Number(row.lon).toFixed(6)),
});

export async function searchPlaces(q) {
  const query = q.trim().replace(/\s+/g, ' ');
  const key = `s:${env.GEOCODER_COUNTRY}:${query.toLowerCase()}`;
  const cached = recall(key);
  if (cached) return cached;
  try {
    const rows = await call('search', { q: query, limit: 6, countrycodes: env.GEOCODER_COUNTRY || undefined });
    return remember(
      key,
      (Array.isArray(rows) ? rows : []).map(toPlace).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    );
  } catch (err) {
    logger.warn('geocode.search_failed', errorMeta(err));
    throw new AppError('GEOCODER_UNAVAILABLE');
  }
}

export async function reversePlace(lat, lng) {
  const key = `r:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = recall(key);
  if (cached) return cached;
  try {
    const row = await call('reverse', { lat, lon: lng, zoom: 18 });
    return remember(key, { label: row?.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
  } catch (err) {
    logger.warn('geocode.reverse_failed', errorMeta(err));
    throw new AppError('GEOCODER_UNAVAILABLE');
  }
}
