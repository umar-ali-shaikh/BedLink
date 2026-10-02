import { FRESHNESS } from '../../constants/matching.js';

/** FRESH / RECENT / STALE for an age in seconds. */
export function freshnessTier(ageSeconds, { freshSeconds, recentSeconds }) {
  if (ageSeconds == null) return FRESHNESS.STALE;
  if (ageSeconds <= freshSeconds) return FRESHNESS.FRESH;
  if (ageSeconds <= recentSeconds) return FRESHNESS.RECENT;
  return FRESHNESS.STALE;
}

/**
 * Freshness of a set of beds: age of the most recent `updatedAt` (ARCHITECTURE.md §10.4).
 * `now` is injected — never read the clock in here.
 */
export function freshnessOf(beds, now, config) {
  if (!beds.length) return { tier: FRESHNESS.STALE, ageSeconds: null, lastUpdatedAt: null };
  const last = Math.max(...beds.map((b) => new Date(b.updatedAt).getTime()));
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - last) / 1000));
  return { tier: freshnessTier(ageSeconds, config), ageSeconds, lastUpdatedAt: new Date(last) };
}

/** Freshness of a single timestamp (hospital lists, dashboards). */
export function freshnessOfDate(date, now, config) {
  if (!date) return { tier: FRESHNESS.STALE, ageSeconds: null, lastUpdatedAt: null };
  return freshnessOf([{ updatedAt: date }], now, config);
}
