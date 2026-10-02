import { FRESHNESS_SCORES, RESOURCE_SATURATION_BEDS, WEIGHTS } from '../../constants/matching.js';

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Weighted 0–100 score (ARCHITECTURE.md §10.3). Each component is 0–1.
 * The score uses unrounded components; the breakdown is rounded for display.
 */
export function computeScore({ matchingBedCount, etaMinutes, freshnessTier, currentLoad }, { maxEtaMinutes }) {
  const components = {
    resource: Math.min(matchingBedCount, RESOURCE_SATURATION_BEDS) / RESOURCE_SATURATION_BEDS,
    travel: Math.max(0, 1 - etaMinutes / maxEtaMinutes),
    freshness: FRESHNESS_SCORES[freshnessTier],
    load: Math.min(1, Math.max(0, 1 - currentLoad / 100)),
  };
  const weighted =
    WEIGHTS.resource * components.resource +
    WEIGHTS.travel * components.travel +
    WEIGHTS.freshness * components.freshness +
    WEIGHTS.load * components.load;

  return {
    score: Math.round(100 * weighted),
    breakdown: {
      resource: round2(components.resource),
      travel: round2(components.travel),
      freshness: round2(components.freshness),
      load: round2(components.load),
    },
  };
}
