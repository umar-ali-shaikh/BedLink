import { BED_STATUS, SUMMARY_RESOURCES } from '../../constants/bed.js';
import { bedRepo } from '../../repositories/bedRepo.js';
import { freshnessOfDate, matchingConfig } from '../matching/index.js';

/** Shape a raw `bedRepo.summarize` row for the API / socket payloads. */
export function formatSummary(raw, lastAvailabilityUpdate, now = new Date()) {
  const available = Object.fromEntries(Object.keys(SUMMARY_RESOURCES).map((k) => [k, raw?.[k] ?? 0]));
  const byStatus = Object.fromEntries(Object.values(BED_STATUS).map((s) => [s, raw?.[`status_${s}`] ?? 0]));
  const lastUpdatedAt = lastAvailabilityUpdate ?? raw?.lastUpdatedAt ?? null;
  const freshness = freshnessOfDate(lastUpdatedAt, now, matchingConfig());
  return {
    available,
    byStatus,
    total: raw?.total ?? 0,
    lastUpdatedAt,
    freshness: freshness.tier,
    freshnessAgeSeconds: freshness.ageSeconds,
  };
}

/** Summaries for many hospitals → Map(hospitalId → summary). */
export async function summariesFor(hospitals, now = new Date()) {
  const raw = await bedRepo.summarize(hospitals.map((h) => h._id.toString()));
  return new Map(
    hospitals.map((h) => {
      const id = h._id.toString();
      return [id, formatSummary(raw.get(id), h.lastAvailabilityUpdate, now)];
    })
  );
}

export async function summaryFor(hospital, now = new Date()) {
  return (await summariesFor([hospital], now)).get(hospital._id.toString());
}
