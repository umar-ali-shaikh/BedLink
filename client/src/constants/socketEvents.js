/** Mirrors server/src/constants/socketEvents.js — never hardcode event strings elsewhere. */
export const SOCKET_EVENTS = Object.freeze({
  BED_UPDATED: 'bed:updated',
  EMERGENCY_CREATED: 'emergency:created',
  EMERGENCY_UPDATED: 'emergency:updated',
  HOSPITAL_REQUEST: 'hospital:request',
  HOSPITAL_REQUEST_CANCELLED: 'hospital:request-cancelled',
  HOSPITAL_ACCEPTED: 'hospital:accepted',
  HOSPITAL_REJECTED: 'hospital:rejected',
  HOSPITAL_TIMEOUT: 'hospital:timeout',
  RESERVATION_CREATED: 'reservation:created',
  RESERVATION_EXPIRED: 'reservation:expired',
  RESERVATION_RELEASED: 'reservation:released',
  VERIFICATION_UPDATED: 'verification:updated',
});

export const CLIENT_EVENTS = Object.freeze({
  JOIN_HOSPITAL: 'join:hospital',
  JOIN_DISPATCHER: 'join:dispatcher',
});
