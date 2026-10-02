import { BOOKING_STATUS, CONDITION_REQUIREMENTS } from '../../constants/booking.js';
import { OFFER_STATUS } from '../../constants/emergency.js';
import { ambulanceOfferRepo } from '../../repositories/ambulanceOfferRepo.js';
import { bookingRepo } from '../../repositories/bookingRepo.js';
import { AppError, forbidden, notFound } from '../../utils/AppError.js';
import { fromPoint } from '../../utils/geo.js';
import { idOf, sameId } from '../../utils/ids.js';
import { dispatcherRoom } from '../../sockets/rooms.js';
import { errorMeta, logger } from '../../utils/logger.js';
import { cancelEmergencyAs, createEmergency, requestHospital } from '../emergency/index.js';
import { SYSTEM_ACTOR } from '../emergency/timeline.js';
import { runBookingFallback } from './dispatch.js';
import { emitBookingUpdated, emitOfferCancelled } from './events.js';
import { clearBookingOfferTimeout } from './timers.js';
import { ambulanceBookingView } from './views.js';

async function loadOwnOffer(id, user) {
  const offer = await ambulanceOfferRepo.findById(id);
  if (!offer) throw notFound('Booking offer');
  if (!sameId(offer.ambulanceId, user.id)) throw forbidden('This offer was sent to another ambulance');
  return offer;
}

/** Explain why a PENDING-only transition did not apply. */
async function resolutionError(id, now) {
  const offer = await ambulanceOfferRepo.findById(id);
  const expired =
    offer?.status === OFFER_STATUS.TIMEOUT || (offer?.status === OFFER_STATUS.PENDING && offer.expiresAt <= now);
  return new AppError(expired ? 'OFFER_EXPIRED' : 'OFFER_ALREADY_RESOLVED');
}

/**
 * Raise the emergency for an accepted booking (the booking's pickup, urgency and the
 * requirements mapped from its condition) owned by the accepting ambulance, then contact the
 * top hospital exactly like the crew pressing "Request best match".
 */
async function raiseEmergency(booking, user) {
  const emergency = await createEmergency(
    {
      patientLocation: fromPoint(booking.pickupLocation),
      requirements: structuredClone(CONDITION_REQUIREMENTS[booking.condition]),
      urgency: booking.urgency,
    },
    user,
    { bookingId: booking._id }
  );
  const linked = await bookingRepo.linkEmergency(booking._id, emergency._id);
  if (!linked) {
    // The caller cancelled while the emergency was being raised: withdraw it again.
    await cancelEmergencyAs(emergency._id, SYSTEM_ACTOR, { cancelledBy: 'CALLER' });
    return emergency;
  }
  try {
    return await requestHospital(emergency._id, {}, user);
  } catch (err) {
    // The crew can still press "Request best match" on the emergency page.
    logger.error('booking.request_hospital_failed', { bookingId: booking._id.toString(), ...errorMeta(err) });
    return emergency;
  }
}

/** The emergency could not be raised: give the booking back so another ambulance can take it. */
async function releaseAssignment(booking) {
  const reopened = await bookingRepo.transition(
    booking._id,
    [BOOKING_STATUS.AMBULANCE_ASSIGNED],
    { status: BOOKING_STATUS.FINDING_AMBULANCE, ambulanceId: null, assignedAt: null },
    { extraFilter: { emergencyId: null } }
  );
  if (!reopened) return;
  emitBookingUpdated(reopened, [dispatcherRoom(idOf(booking.ambulanceId))]);
  await runBookingFallback(booking._id);
}

/**
 * Ambulance accepts a booking: PENDING → ACCEPTED (only before expiry), the booking is
 * assigned to it, the emergency is raised and the first hospital contacted.
 */
export async function acceptBookingOffer(id, user) {
  const offer = await loadOwnOffer(id, user);
  const now = new Date();
  const accepted = await ambulanceOfferRepo.resolvePending(
    id,
    OFFER_STATUS.ACCEPTED,
    { respondedAt: now },
    { notExpiredAt: now }
  );
  if (!accepted) throw await resolutionError(id, now);
  clearBookingOfferTimeout(id);
  const booking = await bookingRepo.transition(
    offer.bookingId,
    [BOOKING_STATUS.FINDING_AMBULANCE],
    { status: BOOKING_STATUS.AMBULANCE_ASSIGNED, ambulanceId: user.id, assignedAt: now, currentOfferId: null },
    { extraFilter: { currentOfferId: offer._id } }
  );
  if (!booking) throw new AppError('INVALID_STATE_TRANSITION', 'The caller cancelled this booking');
  emitBookingUpdated(booking);
  let emergency;
  try {
    emergency = await raiseEmergency(booking, user);
  } catch (err) {
    await releaseAssignment(booking);
    throw err;
  }
  const fresh = await bookingRepo.findById(booking._id);
  return { offer: accepted, booking: ambulanceBookingView(fresh, { revealCaller: true }), emergency };
}

/** Ambulance rejects → the next nearest ambulance is offered the booking. */
export async function rejectBookingOffer(id, user) {
  const offer = await loadOwnOffer(id, user);
  const now = new Date();
  const rejected = await ambulanceOfferRepo.resolvePending(
    id,
    OFFER_STATUS.REJECTED,
    { respondedAt: now },
    { notExpiredAt: now }
  );
  if (!rejected) throw await resolutionError(id, now);
  clearBookingOfferTimeout(id);
  await runBookingFallback(offer.bookingId, { resolvedOfferId: offer._id });
  return rejected;
}

/**
 * Server-side timeout. Idempotent: only the first caller (timer or sweeper) wins the
 * PENDING → TIMEOUT transition; everyone else gets null.
 */
export async function expireBookingOffer(id, now = new Date()) {
  const expired = await ambulanceOfferRepo.resolvePending(
    id,
    OFFER_STATUS.TIMEOUT,
    { respondedAt: now },
    { expiredAt: now }
  );
  if (!expired) return null;
  clearBookingOfferTimeout(id);
  emitOfferCancelled(expired, OFFER_STATUS.TIMEOUT);
  await runBookingFallback(expired.bookingId, { resolvedOfferId: expired._id });
  return expired;
}
