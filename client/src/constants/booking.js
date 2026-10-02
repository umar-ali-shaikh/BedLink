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

/** Why a crew cancels a booking before pickup (values mirror the server's CANCEL_REASONS). */
export const CANCEL_REASONS = [
  { value: 'FAKE_OR_PRANK', label: 'Fake or prank call', hint: 'Counts against the caller\'s number' },
  { value: 'CALLER_UNREACHABLE', label: 'Caller unreachable' },
  { value: 'DUPLICATE', label: 'Duplicate booking' },
  { value: 'PATIENT_ALREADY_TRANSPORTED', label: 'Patient already transported' },
  { value: 'OTHER', label: 'Other', hint: 'Describe below' },
];

/** What the caller reads on the tracking page when the ambulance cancelled. */
export const CANCEL_REASON_FOR_CALLER = Object.freeze({
  FAKE_OR_PRANK: 'The ambulance crew reported this as a false request.',
  CALLER_UNREACHABLE: 'The crew could not reach you on the phone number you gave.',
  DUPLICATE: 'The crew found this was a duplicate of another booking.',
  PATIENT_ALREADY_TRANSPORTED: 'The crew found the patient was already taken to a hospital.',
  OTHER: 'The crew cancelled this booking.',
});

export const MAX_CANCEL_NOTE_LENGTH = 200;
export const MAX_NOTES_LENGTH = 300;
export const MAX_NAME_LENGTH = 80;
