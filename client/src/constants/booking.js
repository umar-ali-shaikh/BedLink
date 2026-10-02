import { Activity, Flame, HeartPulse, HelpCircle, Wind, Brain } from 'lucide-react';

/** Mirrors server constants/booking.js. */
export const BOOKING_STATUS = Object.freeze({
  FINDING_AMBULANCE: 'FINDING_AMBULANCE',
  NO_AMBULANCE: 'NO_AMBULANCE',
  AMBULANCE_ASSIGNED: 'AMBULANCE_ASSIGNED',
  ON_THE_WAY: 'ON_THE_WAY',
  AT_PICKUP: 'AT_PICKUP',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

/** The caller is still waiting on something: keep the tracking page live. */
export const LIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.FINDING_AMBULANCE,
  BOOKING_STATUS.AMBULANCE_ASSIGNED,
  BOOKING_STATUS.ON_THE_WAY,
  BOOKING_STATUS.AT_PICKUP,
];

export const HOSPITAL_STATE = Object.freeze({
  NONE: 'NONE',
  SEARCHING: 'SEARCHING',
  CONTACTING: 'CONTACTING',
  ACCEPTED: 'ACCEPTED',
  NO_MATCH: 'NO_MATCH',
  ARRIVED: 'ARRIVED',
});

/** Condition categories shown on the form (values mirror the server's CONDITION enum). */
export const CONDITIONS = [
  { value: 'CARDIAC', label: 'Chest pain / cardiac', icon: HeartPulse },
  { value: 'BREATHING', label: 'Breathing difficulty', icon: Wind },
  { value: 'TRAUMA', label: 'Accident / trauma', icon: Activity },
  { value: 'BURNS', label: 'Burns', icon: Flame },
  { value: 'STROKE', label: 'Unconscious / stroke', icon: Brain },
  { value: 'OTHER', label: 'Other', icon: HelpCircle },
];

export const CONDITION_LABELS = Object.freeze(Object.fromEntries(CONDITIONS.map((c) => [c.value, c.label])));

export const URGENCY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical', hint: 'Life-threatening' },
  { value: 'HIGH', label: 'High', hint: 'Serious, needs help fast' },
  { value: 'MODERATE', label: 'Moderate', hint: 'Needs care, stable' },
];

export const MAX_NOTES_LENGTH = 300;
export const MAX_NAME_LENGTH = 80;
