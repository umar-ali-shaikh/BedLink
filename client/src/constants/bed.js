export const BED_TYPES = Object.freeze({ ICU: 'ICU', CARDIAC: 'CARDIAC', BURNS: 'BURNS', GENERAL: 'GENERAL' });
export const BED_TYPE_VALUES = Object.values(BED_TYPES);

export const EQUIPMENT = Object.freeze({ VENTILATOR: 'VENTILATOR', OXYGEN: 'OXYGEN', CARDIAC_MONITOR: 'CARDIAC_MONITOR' });
export const EQUIPMENT_VALUES = Object.values(EQUIPMENT);

export const BED_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  CLEANING: 'CLEANING',
  UNAVAILABLE: 'UNAVAILABLE',
});

/** Statuses hospital staff may set by hand. RESERVED belongs to the reservation service. */
export const STAFF_BED_STATUSES = [BED_STATUS.AVAILABLE, BED_STATUS.OCCUPIED, BED_STATUS.CLEANING, BED_STATUS.UNAVAILABLE];

export const BED_TYPE_LABELS = Object.freeze({ ICU: 'ICU', CARDIAC: 'Cardiac', BURNS: 'Burns', GENERAL: 'General' });
export const EQUIPMENT_LABELS = Object.freeze({
  VENTILATOR: 'Ventilator',
  OXYGEN: 'Oxygen',
  CARDIAC_MONITOR: 'Cardiac monitor',
});

/** Keys of `bedSummary.available` (server SUMMARY_RESOURCES). */
export const SUMMARY_RESOURCES = [
  { key: 'ICU', label: 'ICU' },
  { key: 'VENTILATOR', label: 'Ventilator' },
  { key: 'OXYGEN', label: 'Oxygen' },
  { key: 'CARDIAC', label: 'Cardiac' },
  { key: 'BURNS', label: 'Burns' },
];
