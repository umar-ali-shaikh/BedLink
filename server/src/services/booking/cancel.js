import { BOOKING_STATUS, USER_CANCELLABLE_BOOKING_STATUSES } from '../../constants/booking.js';
import { OFFER_STATUS } from '../../constants/emergency.js';
import { ambulanceOfferRepo } from '../../repositories/ambulanceOfferRepo.js';
import { bookingRepo } from '../../repositories/bookingRepo.js';
import { AppError } from '../../utils/AppError.js';
import { cancelEmergencyAs } from '../emergency/index.js';
import { SYSTEM_ACTOR } from '../emergency/timeline.js';
import { offerToNextAmbulance } from './dispatch.js';
import { emitBookingUpdated, emitOfferCancelled } from './events.js';
import { clearBookingOfferTimeout } from './timers.js';
import { resolveBookingByToken, trackingView } from './track.js';

/**
 * The caller cancels (until the ambulance has reached them). The booking flips to CANCELLED
 * first so a concurrent fallback or accept stops; then the live offer is withdrawn and the
 * emergency is cancelled through the existing cancel logic, which releases the held bed.
 */
export async function cancelBooking(token, now = new Date()) {
  const booking = await resolveBookingByToken(token);
  if (booking.status === BOOKING_STATUS.AT_PICKUP) throw new AppError('BOOKING_NOT_CANCELLABLE');
  if (!USER_CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
    throw new AppError('INVALID_STATE_TRANSITION', `A ${booking.status} booking cannot be cancelled`);
  }
  const cancelled = await bookingRepo.transition(
    booking._id,
    USER_CANCELLABLE_BOOKING_STATUSES,
    { status: BOOKING_STATUS.CANCELLED, closedAt: now, currentOfferId: null },
    { unset: ['activePhone'] }
  );
  if (!cancelled) throw new AppError('BOOKING_NOT_CANCELLABLE');

  const pending = await ambulanceOfferRepo.findPendingByBooking(cancelled._id);
  if (pending) {
    const withdrawn = await ambulanceOfferRepo.resolvePending(pending._id, OFFER_STATUS.CANCELLED, {
      respondedAt: now,
    });
    if (withdrawn) {
      clearBookingOfferTimeout(withdrawn._id);
      emitOfferCancelled(withdrawn, OFFER_STATUS.CANCELLED);
    }
  }
  if (cancelled.emergencyId) {
    await cancelEmergencyAs(cancelled.emergencyId, SYSTEM_ACTOR, { cancelledBy: 'CALLER' });
  }
  emitBookingUpdated(cancelled);
  return trackingView(cancelled);
}

/** "Try again" after NO_AMBULANCE: a new round of offers (previously offered ambulances are eligible again). */
export async function retryBooking(token, now = new Date()) {
  const booking = await resolveBookingByToken(token);
  let reopened;
  try {
    reopened = await bookingRepo.transition(booking._id, [BOOKING_STATUS.NO_AMBULANCE], {
      status: BOOKING_STATUS.FINDING_AMBULANCE,
      contactedAmbulanceIds: [],
      closedAt: null,
      activePhone: booking.phone,
    });
  } catch (err) {
    if (err?.code === 11000) throw new AppError('BOOKING_ALREADY_ACTIVE');
    throw err;
  }
  if (!reopened) throw new AppError('INVALID_STATE_TRANSITION', 'Only a booking with no ambulance can be retried');
  emitBookingUpdated(reopened);
  return trackingView(await offerToNextAmbulance(reopened, { now }));
}
