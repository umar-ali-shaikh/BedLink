import { haversineKm } from '../../utils/geo.js';

/**
 * Deterministic ETA estimate (ARCHITECTURE.md §12). A real routing provider can replace
 * this function later without touching scoring.
 *
 * @returns {{ distanceKm: number, etaMinutes: number }} road-adjusted distance (1 dp) and minutes
 */
export function estimate(from, to, { roadFactor, avgSpeedKmph }) {
  const roadKm = haversineKm(from, to) * roadFactor;
  return {
    distanceKm: Math.round(roadKm * 10) / 10,
    etaMinutes: Math.max(1, Math.ceil((roadKm / avgSpeedKmph) * 60)),
  };
}
