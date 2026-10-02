export const BED_TYPES = Object.freeze({
  ICU: 'ICU',
  CARDIAC: 'CARDIAC',
  BURNS: 'BURNS',
  GENERAL: 'GENERAL',
});

export const EQUIPMENT = Object.freeze({
  VENTILATOR: 'VENTILATOR',
  OXYGEN: 'OXYGEN',
  CARDIAC_MONITOR: 'CARDIAC_MONITOR',
});

export const BED_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  CLEANING: 'CLEANING',
  UNAVAILABLE: 'UNAVAILABLE',
});

export const BED_TYPE_VALUES = Object.freeze(Object.values(BED_TYPES));
export const EQUIPMENT_VALUES = Object.freeze(Object.values(EQUIPMENT));
export const BED_STATUS_VALUES = Object.freeze(Object.values(BED_STATUS));

/** Statuses hospital staff may set by hand. RESERVED is owned by the reservation service. */
export const STAFF_BED_STATUSES = Object.freeze([
  BED_STATUS.AVAILABLE,
  BED_STATUS.OCCUPIED,
  BED_STATUS.CLEANING,
  BED_STATUS.UNAVAILABLE,
]);

/** The five product resources shown as counters on the hospital dashboard (PRD §4.1). */
export const SUMMARY_RESOURCES = Object.freeze({
  ICU: { field: 'type', value: BED_TYPES.ICU },
  VENTILATOR: { field: 'equipment', value: EQUIPMENT.VENTILATOR },
  OXYGEN: { field: 'equipment', value: EQUIPMENT.OXYGEN },
  CARDIAC: { field: 'type', value: BED_TYPES.CARDIAC },
  BURNS: { field: 'type', value: BED_TYPES.BURNS },
});

export const BED_TYPE_LABELS = Object.freeze({
  ICU: 'ICU',
  CARDIAC: 'Cardiac care',
  BURNS: 'Burns',
  GENERAL: 'General',
});

export const EQUIPMENT_LABELS = Object.freeze({
  VENTILATOR: 'Ventilator',
  OXYGEN: 'Oxygen',
  CARDIAC_MONITOR: 'Cardiac monitor',
});
