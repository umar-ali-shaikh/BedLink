import { BED_TYPE_LABELS, EQUIPMENT_LABELS } from './bed.js';
import { SPECIALTY_LABELS } from './hospital.js';

/**
 * MVP weights (ARCHITECTURE.md §10.3). They can be tuned, but every change must be
 * recorded in MEMORY.md → Decisions Made.
 */
export const WEIGHTS = Object.freeze({
  resource: 0.5,
  travel: 0.25,
  freshness: 0.15,
  load: 0.1,
});

/** Number of matching beds at which the resource component saturates at 1.0. */
export const RESOURCE_SATURATION_BEDS = 3;

export const FRESHNESS = Object.freeze({
  FRESH: 'FRESH',
  RECENT: 'RECENT',
  STALE: 'STALE',
});

export const FRESHNESS_SCORES = Object.freeze({
  FRESH: 1.0,
  RECENT: 0.6,
  STALE: 0.2,
});

export const CONFIDENCE = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

/** Ordered from best to worst; downgrading moves one step right. */
export const CONFIDENCE_ORDER = Object.freeze([CONFIDENCE.HIGH, CONFIDENCE.MEDIUM, CONFIDENCE.LOW]);

export const FRESHNESS_TO_CONFIDENCE = Object.freeze({
  FRESH: CONFIDENCE.HIGH,
  RECENT: CONFIDENCE.MEDIUM,
  STALE: CONFIDENCE.LOW,
});

export const EXCLUSION_REASONS = Object.freeze({
  HOSPITAL_INACTIVE: 'HOSPITAL_INACTIVE',
  ALREADY_CONTACTED: 'ALREADY_CONTACTED',
  NO_MATCHING_BED: 'NO_MATCHING_BED',
  MISSING_EQUIPMENT: 'MISSING_EQUIPMENT',
  MISSING_SPECIALTY: 'MISSING_SPECIALTY',
  CRITICAL_LOAD: 'CRITICAL_LOAD',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
});

/** Load thresholds used only for wording reasons (not for scoring). */
export const LOAD_LABEL_THRESHOLDS = Object.freeze({ low: 50, moderate: 80 });

const listLabels = (values, labels) => values.map((v) => labels[v] ?? v).join(', ');

/**
 * Human-readable text for an exclusion code. `ctx` carries the request requirements and
 * the hospital facts needed to make the sentence specific.
 */
export const EXCLUSION_REASON_TEXT = Object.freeze({
  HOSPITAL_INACTIVE: () => 'Hospital is not active',
  ALREADY_CONTACTED: () => 'Already contacted for this emergency',
  NO_MATCHING_BED: ({ requirements }) =>
    `No available ${BED_TYPE_LABELS[requirements.bedType] ?? requirements.bedType} bed`,
  MISSING_EQUIPMENT: ({ requirements }) =>
    `No available ${BED_TYPE_LABELS[requirements.bedType] ?? requirements.bedType} bed with ${listLabels(
      requirements.equipment,
      EQUIPMENT_LABELS
    )}`,
  MISSING_SPECIALTY: ({ missingSpecialties }) => `No ${listLabels(missingSpecialties, SPECIALTY_LABELS)} department`,
  CRITICAL_LOAD: ({ currentLoad }) => `Hospital load is critical (${currentLoad}%)`,
  OUT_OF_RANGE: ({ etaMinutes, maxEtaMinutes }) =>
    `Too far: ${etaMinutes}-minute ETA exceeds the ${maxEtaMinutes}-minute limit`,
});
