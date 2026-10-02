import { ROLES } from '../../constants/roles.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { dispatcherRoom, emergencyRoom, hospitalRoom, roleRoom } from '../../sockets/rooms.js';
import { idOf } from '../../utils/ids.js';
import { emit, notify } from '../notification/index.js';

/** Rooms that follow an emergency: its own room, the owner dispatcher, admins. */
export const emergencyRooms = (emergency) => [
  emergencyRoom(idOf(emergency)),
  dispatcherRoom(idOf(emergency.dispatcherId)),
  roleRoom(ROLES.ADMIN),
];

/** Emergency rooms + the hospital involved (accept/reject/timeout/reservation events). */
export const offerRooms = (emergency, hospitalId) => [...emergencyRooms(emergency), hospitalRoom(idOf(hospitalId))];

export function emitEmergencyUpdated(emergency, timelineEntry = null) {
  emit(SERVER_EVENTS.EMERGENCY_UPDATED, emergencyRooms(emergency), {
    emergencyId: idOf(emergency),
    status: emergency.status,
    currentHospital: idOf(emergency.currentHospital),
    timelineEntry: timelineEntry?.toJSON?.() ?? timelineEntry,
  });
}

/** Persisted alert for the owner dispatcher. */
export const notifyDispatcher = (emergency, type, title, body = '') =>
  notify({ userId: emergency.dispatcherId, type, title, body, refId: emergency._id });
