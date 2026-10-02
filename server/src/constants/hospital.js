export const SPECIALTIES = Object.freeze({
  CARDIOLOGY: 'CARDIOLOGY',
  BURNS: 'BURNS',
  TRAUMA: 'TRAUMA',
  NEUROLOGY: 'NEUROLOGY',
  GENERAL_MEDICINE: 'GENERAL_MEDICINE',
});

export const SPECIALTY_VALUES = Object.freeze(Object.values(SPECIALTIES));

export const SPECIALTY_LABELS = Object.freeze({
  CARDIOLOGY: 'Cardiology',
  BURNS: 'Burns',
  TRAUMA: 'Trauma',
  NEUROLOGY: 'Neurology',
  GENERAL_MEDICINE: 'General medicine',
});

export const HOSPITAL_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

export const HOSPITAL_STATUS_VALUES = Object.freeze(Object.values(HOSPITAL_STATUS));

export const DEFAULT_HOSPITAL_LOAD = 50;

/** Who runs the hospital. Display only, never used by matching or scoring. Older hospitals have none. */
export const HOSPITAL_OWNERSHIP = Object.freeze({
  GOVERNMENT: 'GOVERNMENT',
  SEMI_GOVERNMENT: 'SEMI_GOVERNMENT',
  PRIVATE: 'PRIVATE',
});

export const HOSPITAL_OWNERSHIP_VALUES = Object.freeze(Object.values(HOSPITAL_OWNERSHIP));

/**
 * Self-registered hospitals start PENDING and are invisible to matching until VERIFIED
 * (by `npm run hospitals -- verify`, or automatically with HOSPITAL_AUTO_VERIFY=true).
 * Hospitals created by seed/admin default to VERIFIED.
 */
export const VERIFICATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
});

export const VERIFICATION_STATUS_VALUES = Object.freeze(Object.values(VERIFICATION_STATUS));

/** Hospitals with these statuses never appear in matching, maps or lists for ambulances. */
export const UNVERIFIED_STATUSES = Object.freeze([VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.REJECTED]);

/** State clinical-establishment / municipal registration number: letters, digits, / - . */
export const REGISTRATION_NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9/.-]{4,39}$/;

/** ABDM Health Facility Registry ID, e.g. IN2710000123. */
export const HFR_ID_PATTERN = /^IN\d{10}$/;

/** Same name within this distance is treated as a duplicate registration. */
export const DUPLICATE_HOSPITAL_RADIUS_METERS = 1000;
