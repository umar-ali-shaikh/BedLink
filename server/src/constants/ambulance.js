export const AMBULANCE_TYPES = Object.freeze({
  BLS: 'BLS', // Basic Life Support
  ALS: 'ALS', // Advanced Life Support
  PTA: 'PTA', // Patient Transport
});

export const AMBULANCE_TYPE_VALUES = Object.freeze(Object.values(AMBULANCE_TYPES));

/** Indian vehicle registration after removing spaces/dashes: MH01AB1234, DL1CAB1234, KA05F1234. */
export const VEHICLE_NUMBER_PATTERN = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/;

/**
 * Indian driving licence number after removing spaces/dashes and uppercasing:
 * state (2 letters) + RTO (2 digits) + year (4 digits) + serial (7 digits) = 15 characters.
 */
export const LICENCE_NUMBER_PATTERN = /^[A-Z]{2}\d{2}\d{4}\d{7}$/;

/** Indian mobile number (optionally +91 / 0 prefixed). */
export const PHONE_PATTERN = /^(?:\+91|0)?[6-9]\d{9}$/;
