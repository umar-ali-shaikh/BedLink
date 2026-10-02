import { BED_TYPES, EQUIPMENT } from './bed.js';
import { SPECIALTIES } from './hospital.js';

/** Public ambulance booking by a patient/caller (ARCHITECTURE.md §6.9, §7.5). */
export const BOOKING_STATUS = Object.freeze({
  FINDING_AMBULANCE: 'FINDING_AMBULANCE',
  NO_AMBULANCE: 'NO_AMBULANCE',
  AMBULANCE_ASSIGNED: 'AMBULANCE_ASSIGNED',
  ON_THE_WAY: 'ON_THE_WAY',
  AT_PICKUP: 'AT_PICKUP',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

export const BOOKING_STATUS_VALUES = Object.freeze(Object.values(BOOKING_STATUS));

/** One booking per phone number may be in one of these at a time (unique `activePhone`). */
export const ACTIVE_BOOKING_STATUSES = Object.freeze([
  BOOKING_STATUS.FINDING_AMBULANCE,
  BOOKING_STATUS.AMBULANCE_ASSIGNED,
  BOOKING_STATUS.ON_THE_WAY,
  BOOKING_STATUS.AT_PICKUP,
]);

/** An ambulance holding one of these is busy and gets no new offers. */
export const ASSIGNED_BOOKING_STATUSES = Object.freeze([
  BOOKING_STATUS.AMBULANCE_ASSIGNED,
  BOOKING_STATUS.ON_THE_WAY,
  BOOKING_STATUS.AT_PICKUP,
]);

/** The caller may cancel until the ambulance has reached them. */
export const USER_CANCELLABLE_BOOKING_STATUSES = Object.freeze([
  BOOKING_STATUS.FINDING_AMBULANCE,
  BOOKING_STATUS.NO_AMBULANCE,
  BOOKING_STATUS.AMBULANCE_ASSIGNED,
  BOOKING_STATUS.ON_THE_WAY,
]);

/** Closed bookings: their personal fields are purged after BOOKING_PII_RETENTION_DAYS. */
export const CLOSED_BOOKING_STATUSES = Object.freeze([
  BOOKING_STATUS.NO_AMBULANCE,
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.CANCELLED,
]);

export const CONDITIONS = Object.freeze({
  CARDIAC: 'CARDIAC',
  BREATHING: 'BREATHING',
  TRAUMA: 'TRAUMA',
  BURNS: 'BURNS',
  STROKE: 'STROKE',
  OTHER: 'OTHER',
});

export const CONDITION_VALUES = Object.freeze(Object.values(CONDITIONS));

/**
 * The single table that turns a caller's condition category into the bed requirements of
 * the emergency raised when an ambulance accepts. Operational matching only — not a diagnosis.
 */
export const CONDITION_REQUIREMENTS = Object.freeze({
  [CONDITIONS.CARDIAC]: { bedType: BED_TYPES.CARDIAC, equipment: [], specialties: [SPECIALTIES.CARDIOLOGY] },
  [CONDITIONS.BREATHING]: { bedType: BED_TYPES.ICU, equipment: [EQUIPMENT.VENTILATOR], specialties: [] },
  [CONDITIONS.TRAUMA]: { bedType: BED_TYPES.ICU, equipment: [], specialties: [SPECIALTIES.TRAUMA] },
  [CONDITIONS.BURNS]: { bedType: BED_TYPES.BURNS, equipment: [], specialties: [SPECIALTIES.BURNS] },
  [CONDITIONS.STROKE]: { bedType: BED_TYPES.ICU, equipment: [], specialties: [SPECIALTIES.NEUROLOGY] },
  [CONDITIONS.OTHER]: { bedType: BED_TYPES.GENERAL, equipment: [], specialties: [] },
});

/** Why an ambulance cancels a booking before pickup. FAKE_OR_PRANK counts against the caller's phone. */
export const CANCEL_REASONS = Object.freeze({
  FAKE_OR_PRANK: 'FAKE_OR_PRANK',
  CALLER_UNREACHABLE: 'CALLER_UNREACHABLE',
  DUPLICATE: 'DUPLICATE',
  PATIENT_ALREADY_TRANSPORTED: 'PATIENT_ALREADY_TRANSPORTED',
  OTHER: 'OTHER',
});

export const CANCEL_REASON_VALUES = Object.freeze(Object.values(CANCEL_REASONS));

export const CANCELLED_BY = Object.freeze({ CALLER: 'CALLER', AMBULANCE: 'AMBULANCE' });

export const MAX_CANCEL_NOTE_LENGTH = 200;

export const MAX_BOOKING_NOTES_LENGTH = 300;
export const MAX_PATIENT_NAME_LENGTH = 80;

/** How often the sweeper runs the retention purge, regardless of its own interval. */
export const PII_PURGE_INTERVAL_MINUTES = 60;

/** Bytes of randomness in a tracking token (24 bytes = 192 bits, ≥ 128 required). */
export const TRACKING_TOKEN_BYTES = 24;
