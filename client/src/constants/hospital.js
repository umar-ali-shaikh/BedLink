export const SPECIALTIES = Object.freeze({
  CARDIOLOGY: 'CARDIOLOGY',
  BURNS: 'BURNS',
  TRAUMA: 'TRAUMA',
  NEUROLOGY: 'NEUROLOGY',
  GENERAL_MEDICINE: 'GENERAL_MEDICINE',
});
export const SPECIALTY_VALUES = Object.values(SPECIALTIES);

export const SPECIALTY_LABELS = Object.freeze({
  CARDIOLOGY: 'Cardiology',
  BURNS: 'Burns',
  TRAUMA: 'Trauma',
  NEUROLOGY: 'Neurology',
  GENERAL_MEDICINE: 'General medicine',
});

export const HOSPITAL_STATUS = Object.freeze({ ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' });

/** Load presets for the hospital segmented control (DESIGN.md §8.3). */
export const LOAD_PRESETS = [
  { label: 'Low', value: 25 },
  { label: 'Moderate', value: 50 },
  { label: 'High', value: 75 },
  { label: 'Critical', value: 95 },
];

/** Mirrors server MATCH_CRITICAL_LOAD default. */
export const CRITICAL_LOAD = 95;

/** Default demo patient location (server SEED_PATIENT_LOCATION, Mumbai). */
export const DEFAULT_PATIENT_LOCATION = Object.freeze({ lat: 19.076, lng: 72.8777 });
