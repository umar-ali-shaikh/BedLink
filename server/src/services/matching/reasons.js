import { BED_TYPE_LABELS, EQUIPMENT_LABELS } from '../../constants/bed.js';
import { SPECIALTY_LABELS } from '../../constants/hospital.js';
import { EXCLUSION_REASON_TEXT, FRESHNESS, LOAD_LABEL_THRESHOLDS } from '../../constants/matching.js';

export function formatAge(seconds) {
  if (seconds == null) return 'never';
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

function loadLabel(load) {
  if (load < LOAD_LABEL_THRESHOLDS.low) return 'Low';
  if (load < LOAD_LABEL_THRESHOLDS.moderate) return 'Moderate';
  return 'High';
}

/** ✓ reasons for a ranked hospital (ARCHITECTURE.md §10.6). Generated server-side only. */
export function buildMatchReasons({ requirements, matchingBedCount, etaMinutes, distanceKm, freshness, currentLoad }) {
  const bedLabel = BED_TYPE_LABELS[requirements.bedType] ?? requirements.bedType;
  const reasons = [`${bedLabel} available (${matchingBedCount} bed${matchingBedCount === 1 ? '' : 's'})`];
  for (const item of requirements.equipment) reasons.push(`${EQUIPMENT_LABELS[item] ?? item} available`);
  for (const s of requirements.specialties) reasons.push(`${SPECIALTY_LABELS[s] ?? s} department`);
  reasons.push(`${etaMinutes}-minute ETA (${distanceKm} km)`);
  const stale = freshness.tier === FRESHNESS.STALE ? ' (stale)' : '';
  reasons.push(`Availability updated ${formatAge(freshness.ageSeconds)}${stale}`);
  reasons.push(`${loadLabel(currentLoad)} hospital load (${currentLoad}%)`);
  return reasons;
}

/** "Why not this hospital?" sentences for exclusion codes. */
export function buildExclusionMessages(codes, ctx) {
  return codes.map((code) => EXCLUSION_REASON_TEXT[code]?.(ctx) ?? code);
}
