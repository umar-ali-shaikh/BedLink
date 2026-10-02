import { CLIENT_EVENTS } from '../constants/socketEvents.js';
import { ROLES } from '../constants/roles.js';
import { zodDetails } from '../middleware/validate.js';
import { updateAmbulanceLocation } from '../services/booking/index.js';
import { acceptOffer, canFollowEmergency, createEmergency, rejectOffer } from '../services/emergency/index.js';
import { AppError } from '../utils/AppError.js';
import { errorMeta, logger } from '../utils/logger.js';
import { emergencyBody } from '../validators/emergency.js';
import { hospitalRespondPayload } from '../validators/hospitalRequest.js';
import { locationPayload } from '../validators/booking.js';
import { objectId } from '../validators/common.js';
import { bookingRoom, dispatcherRoom, emergencyRoom, hospitalRoom, roleRoom } from './rooms.js';

/** Rooms are derived from the authenticated user only — client room names are ignored. */
export function joinDefaultRooms(socket) {
  const { user, bookingId } = socket.data;
  // A public caller joined with a tracking token: their one booking room, no role rooms.
  if (bookingId) socket.join(bookingRoom(bookingId));
  if (!user) return;
  socket.join(roleRoom(user.role));
  if (user.role === ROLES.HOSPITAL && user.hospitalId) socket.join(hospitalRoom(user.hospitalId));
  if (user.role === ROLES.DISPATCHER) socket.join(dispatcherRoom(user.id));
}

const ackOf = (ack) => (typeof ack === 'function' ? ack : () => {});

function ackError(ack, err) {
  if (err instanceof AppError)
    return ack({ success: false, code: err.code, message: err.message, details: err.details });
  logger.error('socket.handler_failed', errorMeta(err));
  return ack({ success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong' });
}

/** Run `fn` only for allowed roles, translating errors into the standard ack shape. */
const guarded = (socket, roles, fn) => async (payload, ack) => {
  const reply = ackOf(typeof payload === 'function' ? payload : ack);
  const body = typeof payload === 'function' ? {} : (payload ?? {});
  if (roles && !roles.includes(socket.data.user.role))
    return reply({ success: false, code: 'FORBIDDEN', message: 'Not allowed' });
  try {
    return reply({ success: true, data: await fn(body) });
  } catch (err) {
    return ackError(reply, err);
  }
};

function parse(schema, payload) {
  const result = schema.safeParse(payload);
  if (!result.success) throw new AppError('VALIDATION_ERROR', undefined, undefined, zodDetails(result.error));
  return result.data;
}

export function registerHandlers(socket) {
  const { user } = socket.data;
  if (!user) return; // tracking-token guests only listen; they have nothing to send

  socket.on(
    CLIENT_EVENTS.JOIN_HOSPITAL,
    guarded(socket, [ROLES.HOSPITAL], async () => {
      joinDefaultRooms(socket);
      return { rooms: [hospitalRoom(user.hospitalId)] };
    })
  );

  socket.on(
    CLIENT_EVENTS.JOIN_DISPATCHER,
    guarded(socket, [ROLES.DISPATCHER, ROLES.ADMIN], async ({ emergencyId } = {}) => {
      joinDefaultRooms(socket);
      if (!emergencyId) return { rooms: [] };
      const id = parse(objectId, emergencyId);
      if (!(await canFollowEmergency(id, user))) throw new AppError('FORBIDDEN');
      socket.join(emergencyRoom(id));
      return { rooms: [emergencyRoom(id)] };
    })
  );

  // Optional thin wrappers over the same services + validation as REST (ARCHITECTURE.md §9.2).
  socket.on(
    CLIENT_EVENTS.EMERGENCY_CREATE,
    guarded(socket, [ROLES.DISPATCHER], async (payload) => {
      if (user.verificationStatus !== 'VERIFIED') throw new AppError('ACCOUNT_NOT_VERIFIED');
      return (await createEmergency(parse(emergencyBody, payload), user)).toJSON();
    })
  );

  socket.on(
    CLIENT_EVENTS.AMBULANCE_LOCATION,
    guarded(socket, [ROLES.DISPATCHER], async (payload) =>
      updateAmbulanceLocation(user, parse(locationPayload, payload))
    )
  );
  socket.on(
    CLIENT_EVENTS.HOSPITAL_RESPOND,
    guarded(socket, [ROLES.HOSPITAL], async (payload) => {
      const { hospitalRequestId, action, reason } = parse(hospitalRespondPayload, payload);
      if (action === 'ACCEPT') {
        const result = await acceptOffer(hospitalRequestId, user);
        return { hospitalRequest: result.hospitalRequest.toJSON(), reservation: result.reservation.toJSON() };
      }
      return (await rejectOffer(hospitalRequestId, { reason }, user)).toJSON();
    })
  );
}
