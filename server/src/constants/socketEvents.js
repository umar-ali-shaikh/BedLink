/** Every Socket.IO event name. Never hardcode event strings elsewhere (ARCHITECTURE.md §9). */

/** Server → client */
export const SERVER_EVENTS = Object.freeze({
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
  /** A registration was created or decided: admins refresh the queue; the account refreshes /auth/me. */
  VERIFICATION_UPDATED: 'verification:updated',
  /** A public booking changed state — the booking room (caller) and the assigned ambulance refresh. */
  BOOKING_UPDATED: 'booking:updated',
  /** A booking is offered to one ambulance (its dispatcher room), with the accept window. */
  BOOKING_OFFER: 'booking:offer',
  BOOKING_OFFER_CANCELLED: 'booking:offer-cancelled',
  /** The assigned ambulance moved: position + live ETA/distance to the pickup (booking room). */
  BOOKING_AMBULANCE_LOCATION: 'booking:ambulance-location',
});

/** Client → server */
export const CLIENT_EVENTS = Object.freeze({
  JOIN_HOSPITAL: 'join:hospital',
  JOIN_DISPATCHER: 'join:dispatcher',
  EMERGENCY_CREATE: 'emergency:create',
  HOSPITAL_RESPOND: 'hospital:respond',
  /** On-duty ambulance shares its GPS position (throttled). */
  AMBULANCE_LOCATION: 'ambulance:location',
});
