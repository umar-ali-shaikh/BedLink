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
