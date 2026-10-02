export const AMBULANCE_TYPES = [
  { value: 'ALS', label: 'ALS', hint: 'Advanced Life Support' },
  { value: 'BLS', label: 'BLS', hint: 'Basic Life Support' },
  { value: 'PTA', label: 'PTA', hint: 'Patient transport' },
];

/** Mirrors server constants/ambulance.js (checked again on the server). */
export const VEHICLE_NUMBER_PATTERN = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/;
/** Indian driving licence, spaces/hyphens removed: state + RTO + year + 7-digit serial (15 characters). */
export const LICENCE_NUMBER_PATTERN = /^[A-Z]{2}\d{2}\d{4}\d{7}$/;
export const PHONE_PATTERN = /^(?:\+91|0)?[6-9]\d{9}$/;
export const REGISTRATION_NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9/.-]{4,39}$/;
export const HFR_ID_PATTERN = /^IN\d{10}$/;

export const normaliseVehicle = (v = '') => v.replace(/[\s-]/g, '').toUpperCase();
export const normaliseLicence = (v = '') => v.replace(/[\s-]/g, '').toUpperCase();
export const normalisePhone = (v = '') => v.replace(/[\s-]/g, '');
