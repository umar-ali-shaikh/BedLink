import { BED_STATUS } from '../../constants/bed.js';
import { HOSPITAL_STATUS } from '../../constants/hospital.js';
import { EXCLUSION_REASONS as R } from '../../constants/matching.js';

/** "Matching bed" = right type, AVAILABLE, and has every required equipment item. */
export const isMatchingBed = (bed, requirements) =>
  bed.type === requirements.bedType &&
  bed.status === BED_STATUS.AVAILABLE &&
  requirements.equipment.every((e) => bed.equipment.includes(e));

/**
 * Apply the hard filters (ARCHITECTURE.md §10.2) to one hospital. Records **every**
 * applicable exclusion code, not just the first.
 *
 * @returns {{ codes: string[], matchingBeds: object[], missingSpecialties: string[] }}
 */
export function evaluateHospital({ hospital, beds, requirements, excluded, etaMinutes, config }) {
  const codes = [];

  if (hospital.status !== HOSPITAL_STATUS.ACTIVE) codes.push(R.HOSPITAL_INACTIVE);
  if (excluded) codes.push(R.ALREADY_CONTACTED);

  const availableOfType = beds.filter((b) => b.type === requirements.bedType && b.status === BED_STATUS.AVAILABLE);
  const matchingBeds = availableOfType.filter((b) => isMatchingBed(b, requirements));
  if (!availableOfType.length) codes.push(R.NO_MATCHING_BED);
  else if (!matchingBeds.length) codes.push(R.MISSING_EQUIPMENT);

  const missingSpecialties = requirements.specialties.filter((s) => !hospital.specialties.includes(s));
  if (missingSpecialties.length) codes.push(R.MISSING_SPECIALTY);

  if (hospital.currentLoad >= config.criticalLoad) codes.push(R.CRITICAL_LOAD);
  if (etaMinutes > config.maxEtaMinutes) codes.push(R.OUT_OF_RANGE);

  return { codes, matchingBeds, missingSpecialties };
}
