import { ROLES } from '../../constants/roles.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { bookingRoom, dispatcherRoom, emergencyRoom, hospitalRoom, roleRoom } from '../../sockets/rooms.js';
import { idOf } from '../../utils/ids.js';
import { emit, notify } from '../notification/index.js';

/** Rooms that follow an emergency: its own room, the owner dispatcher, admins. */
export const emergencyRooms = (emergency) => [
  emergencyRoom(idOf(emergency)),
  dispatcherRoom(idOf(emergency.dispatcherId)),
  roleRoom(ROLES.ADMIN),
];

/** The caller's tracking room, when the emergency was raised from a public booking. */
export const bookingRoomsOf = (emergency) => (emergency.bookingId ? [bookingRoom(idOf(emergency.bookingId))] : []);

/**
 * Emergency rooms + the hospital involved (accept/reject/timeout/reservation events) + the
 * caller's booking room. These payloads are ids and display basics only.
 */
export const offerRooms = (emergency, hospitalId) => [
  ...emergencyRooms(emergency),
  hospitalRoom(idOf(hospitalId)),
  ...bookingRoomsOf(emergency),
];

export function emitEmergencyUpdated(emergency, timelineEntry = null) {
  const base = {
    emergencyId: idOf(emergency),
    status: emergency.status,
    currentHospital: idOf(emergency.currentHospital),
  };
  emit(SERVER_EVENTS.EMERGENCY_UPDATED, emergencyRooms(emergency), {
    ...base,
    timelineEntry: timelineEntry?.toJSON?.() ?? timelineEntry,
  });
  // The caller gets the status only — never the audit-log entry (actors, scores, bed labels).
  if (emergency.bookingId) emit(SERVER_EVENTS.EMERGENCY_UPDATED, bookingRoomsOf(emergency), base);
}

/** Persisted alert for the owner dispatcher. */
export const notifyDispatcher = (emergency, type, title, body = '') =>
  notify({ userId: emergency.dispatcherId, type, title, body, refId: emergency._id });
