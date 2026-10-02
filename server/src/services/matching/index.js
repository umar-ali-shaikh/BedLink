import { env } from '../../config/env.js';
import { bedRepo } from '../../repositories/bedRepo.js';
import { hospitalRepo } from '../../repositories/hospitalRepo.js';
import { hospitalRequestRepo } from '../../repositories/hospitalRequestRepo.js';
import { fromPoint } from '../../utils/geo.js';
import { rankHospitals } from './rank.js';

/** Matching thresholds from env, read at call time so tests can adjust them. */
export function matchingConfig() {
  return {
    freshSeconds: env.FRESHNESS_FRESH_SECONDS,
    recentSeconds: env.FRESHNESS_RECENT_SECONDS,
    maxEtaMinutes: env.MATCH_MAX_ETA_MINUTES,
    maxRadiusKm: env.MATCH_MAX_RADIUS_KM,
    criticalLoad: env.MATCH_CRITICAL_LOAD,
    timeoutWindowMinutes: env.CONFIDENCE_TIMEOUT_WINDOW_MINUTES,
    avgSpeedKmph: env.AVG_AMBULANCE_SPEED_KMPH,
    roadFactor: env.ROAD_FACTOR,
  };
}

/**
 * Load hospitals within the search radius plus their beds of the requested type, then
 * rank them (ARCHITECTURE.md §10). `onlyHospitalIds` re-validates specific hospitals.
 *
 * @returns {Promise<{ candidates: object[], exclusions: object[], durationMs: number }>}
 */
export async function rank({
  patientLocation,
  requirements,
  excludeHospitalIds = [],
  onlyHospitalIds,
  now = new Date(),
}) {
  const started = performance.now();
  const config = matchingConfig();
  const normalized = {
    bedType: requirements.bedType,
    equipment: [...(requirements.equipment ?? [])],
    specialties: [...(requirements.specialties ?? [])],
  };

  const docs = await hospitalRepo.findNear({
    point: patientLocation,
    radiusKm: config.maxRadiusKm,
    onlyIds: onlyHospitalIds,
  });
  const hospitals = docs.map((h) => ({
    id: h._id.toString(),
    name: h.name,
    coordinates: fromPoint(h.location),
    specialties: h.specialties ?? [],
    currentLoad: h.currentLoad,
    status: h.status,
  }));

  const ids = docs.map((h) => h._id);
  const [beds, lastTimeoutByHospital] = await Promise.all([
    bedRepo.findByHospitalsAndType(ids, normalized.bedType),
    hospitalRequestRepo.lastTimeoutByHospital(ids, new Date(now.getTime() - config.timeoutWindowMinutes * 60_000)),
  ]);

  const bedsByHospital = new Map();
  for (const bed of beds) {
    const key = bed.hospitalId.toString();
    if (!bedsByHospital.has(key)) bedsByHospital.set(key, []);
    bedsByHospital.get(key).push(bed);
  }

  const result = rankHospitals({
    hospitals,
    bedsByHospital,
    lastTimeoutByHospital,
    patientLocation,
    requirements: normalized,
    excludeHospitalIds: excludeHospitalIds.map(String),
    now,
    config,
  });

  return { ...result, durationMs: Math.round(performance.now() - started) };
}

export { rankHospitals } from './rank.js';
export { estimate } from './eta.js';
export { freshnessOf, freshnessOfDate, freshnessTier } from './freshness.js';
