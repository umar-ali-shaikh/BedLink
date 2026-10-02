import { estimate } from './eta.js';
import { evaluateHospital } from './filter.js';
import { freshnessOf } from './freshness.js';
import { computeScore } from './score.js';
import { computeConfidence } from './confidence.js';
import { buildExclusionMessages, buildMatchReasons } from './reasons.js';

/** Deterministic tie-break (ARCHITECTURE.md §10.7). */
export function compareCandidates(a, b) {
  return (
    b.score - a.score ||
    a.etaMinutes - b.etaMinutes ||
    (a.freshnessAgeSeconds ?? Infinity) - (b.freshnessAgeSeconds ?? Infinity) ||
    (a.hospitalId < b.hospitalId ? -1 : a.hospitalId > b.hospitalId ? 1 : 0)
  );
}

/**
 * Pure ranking core: no DB, no clock, no randomness. Same input ⇒ same output.
 *
 * @param {object} input
 * @param {Array<{id,name,coordinates:{lat,lng},specialties,currentLoad,status}>} input.hospitals
 * @param {Map<string, object[]>} input.bedsByHospital beds of the requested type, per hospital id
 * @param {Map<string, Date>} [input.lastTimeoutByHospital]
 * @param {{lat,lng}} input.patientLocation
 * @param {{bedType, equipment: string[], specialties: string[]}} input.requirements
 * @param {string[]} [input.excludeHospitalIds]
 * @param {Date} input.now
 * @param {object} input.config see `matchingConfig()` in ./index.js
 */
export function rankHospitals({
  hospitals,
  bedsByHospital,
  lastTimeoutByHospital = new Map(),
  patientLocation,
  requirements,
  excludeHospitalIds = [],
  now,
  config,
}) {
  const excluded = new Set(excludeHospitalIds.map(String));
  const candidates = [];
  const exclusions = [];

  for (const hospital of hospitals) {
    const id = String(hospital.id);
    const beds = bedsByHospital.get(id) ?? [];
    const { distanceKm, etaMinutes } = estimate(patientLocation, hospital.coordinates, config);
    const { codes, matchingBeds, missingSpecialties } = evaluateHospital({
      hospital,
      beds,
      requirements,
      excluded: excluded.has(id),
      etaMinutes,
      config,
    });

    if (codes.length) {
      exclusions.push({
        hospitalId: id,
        hospitalName: hospital.name,
        coordinates: hospital.coordinates,
        etaMinutes,
        reasons: codes,
        messages: buildExclusionMessages(codes, {
          requirements,
          missingSpecialties,
          currentLoad: hospital.currentLoad,
          etaMinutes,
          maxEtaMinutes: config.maxEtaMinutes,
        }),
      });
      continue;
    }

    const freshness = freshnessOf(matchingBeds, now, config);
    const { score, breakdown } = computeScore(
      {
        matchingBedCount: matchingBeds.length,
        etaMinutes,
        freshnessTier: freshness.tier,
        currentLoad: hospital.currentLoad,
      },
      config
    );
    const confidence = computeConfidence(
      {
        freshnessTier: freshness.tier,
        matchingBedCount: matchingBeds.length,
        lastTimeoutAt: lastTimeoutByHospital.get(id),
        now,
      },
      config
    );

    candidates.push({
      hospitalId: id,
      hospitalName: hospital.name,
      coordinates: hospital.coordinates,
      score,
      confidence: confidence.level,
      confidenceReasons: confidence.reasons,
      etaMinutes,
      distanceKm,
      matchingBeds: matchingBeds.length,
      freshness: freshness.tier,
      freshnessAgeSeconds: freshness.ageSeconds,
      currentLoad: hospital.currentLoad,
      breakdown,
      reasons: buildMatchReasons({
        requirements,
        matchingBedCount: matchingBeds.length,
        etaMinutes,
        distanceKm,
        freshness,
        currentLoad: hospital.currentLoad,
      }),
    });
  }

  candidates.sort(compareCandidates);
  candidates.forEach((c, i) => {
    c.rank = i + 1;
  });
  exclusions.sort(
    (a, b) => a.etaMinutes - b.etaMinutes || (a.hospitalId < b.hospitalId ? -1 : a.hospitalId > b.hospitalId ? 1 : 0)
  );
  // etaMinutes was only needed for ordering exclusions.
  for (const e of exclusions) delete e.etaMinutes;

  return { candidates, exclusions };
}
