import { env } from '../../config/env.js';
import { BOOKING_STATUS } from '../../constants/booking.js';
import { OFFER_STATUS } from '../../constants/emergency.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { ambulanceOfferRepo } from '../../repositories/ambulanceOfferRepo.js';
import { bookingRepo } from '../../repositories/bookingRepo.js';
import { userRepo } from '../../repositories/userRepo.js';
import { dispatcherRoom } from '../../sockets/rooms.js';
import { haversineKm, fromPoint } from '../../utils/geo.js';
import { idOf } from '../../utils/ids.js';
import { errorMeta, logger } from '../../utils/logger.js';
import { estimate } from '../matching/eta.js';
import { emit, notify } from '../notification/index.js';
import { emitBookingUpdated } from './events.js';
import { scheduleBookingOfferTimeout } from './timers.js';

const etaConfig = () => ({ roadFactor: env.ROAD_FACTOR, avgSpeedKmph: env.AVG_AMBULANCE_SPEED_KMPH });

/**
 * Ambulances that may be offered this booking, nearest first. Eligible = verified, active, on
 * duty, a stored position newer than AMBULANCE_LOCATION_MAX_AGE_SECONDS, not busy with another
 * booking or live offer, not already offered this booking, and within MATCH_MAX_ETA_MINUTES.
 * Distance is the great-circle distance from the stored position (ties: lower id first).
 */
export async function rankAmbulances(booking, { now = new Date() } = {}) {
  const since = new Date(now.getTime() - env.AMBULANCE_LOCATION_MAX_AGE_SECONDS * 1000);
  const [ambulances, busy, pending] = await Promise.all([
    userRepo.findDispatchableAmbulances(since),
    bookingRepo.busyAmbulanceIds(),
    ambulanceOfferRepo.pendingAmbulanceIds(),
  ]);
  const skip = new Set([...busy, ...pending, ...booking.contactedAmbulanceIds].map(String));
  const pickup = fromPoint(booking.pickupLocation);
  return ambulances
    .filter((user) => !skip.has(idOf(user)) && user.ambulance?.location)
    .map((user) => {
      const position = { lat: user.ambulance.location.lat, lng: user.ambulance.location.lng };
      return { user, straightKm: haversineKm(position, pickup), ...estimate(position, pickup, etaConfig()) };
    })
    .filter((candidate) => candidate.etaMinutes <= env.MATCH_MAX_ETA_MINUTES)
    .sort((a, b) => a.straightKm - b.straightKm || idOf(a.user).localeCompare(idOf(b.user)));
}

/** No ambulance left: FINDING_AMBULANCE → NO_AMBULANCE. The caller sees it and may try again. */
export async function concludeNoAmbulance(booking, now = new Date()) {
  const updated = await bookingRepo.transition(
    booking._id,
    [BOOKING_STATUS.FINDING_AMBULANCE],
    { status: BOOKING_STATUS.NO_AMBULANCE, currentOfferId: null, closedAt: now },
    { unset: ['activePhone'] }
  );
  if (!updated) return bookingRepo.findById(booking._id);
  emitBookingUpdated(updated);
  return updated;
}

/** Create the PENDING offer for one candidate; null when another offer won the race. */
async function createOffer(booking, candidate, now) {
  const expiresAt = new Date(now.getTime() + env.BOOKING_OFFER_TIMEOUT_SECONDS * 1000);
  try {
    return await ambulanceOfferRepo.create({
      bookingId: booking._id,
      ambulanceId: candidate.user._id,
      attempt: (await ambulanceOfferRepo.countByBooking(booking._id)) + 1,
      status: OFFER_STATUS.PENDING,
      offeredAt: now,
      expiresAt,
      distanceKm: candidate.distanceKm,
      etaMinutes: candidate.etaMinutes,
    });
  } catch (err) {
    if (err?.code === 11000) return null;
    throw err;
  }
}

/**
 * Offer the booking to the nearest eligible ambulance (one live offer at a time), arm the
 * server-side timeout, and notify that ambulance. With nobody left → NO_AMBULANCE.
 */
export async function offerToNextAmbulance(booking, { now = new Date() } = {}) {
  const candidates = await rankAmbulances(booking, { now });
  for (const candidate of candidates) {
    const offer = await createOffer(booking, candidate, now);
    if (!offer) continue;
    const updated = await bookingRepo.transition(
      booking._id,
      [BOOKING_STATUS.FINDING_AMBULANCE],
      { currentOfferId: offer._id },
      { push: { contactedAmbulanceIds: offer.ambulanceId } }
    );
    if (!updated) {
      // The booking moved on (cancelled): withdraw our offer.
      await ambulanceOfferRepo.resolvePending(offer._id, OFFER_STATUS.CANCELLED, { respondedAt: new Date() });
      return bookingRepo.findById(booking._id);
    }
    scheduleBookingOfferTimeout(offer._id, offer.expiresAt);
    emit(SERVER_EVENTS.BOOKING_OFFER, [dispatcherRoom(idOf(offer.ambulanceId))], {
      offerId: idOf(offer),
      bookingId: idOf(updated),
      urgency: updated.urgency,
      condition: updated.condition,
      distanceKm: offer.distanceKm,
      etaMinutes: offer.etaMinutes,
      expiresAt: offer.expiresAt,
      serverNow: new Date(),
    });
    await notify({
      userId: offer.ambulanceId,
      type: SERVER_EVENTS.BOOKING_OFFER,
      title: `New ${updated.urgency} ambulance booking`,
      body: `Pickup est. ${offer.etaMinutes} min away`,
      refId: offer._id,
    });
    return updated;
  }
  return concludeNoAmbulance(booking, now);
}

/**
 * After a reject or timeout: if the booking is still waiting on `resolvedOfferId`, offer it to
 * the next ambulance. A cancel or newer offer is never clobbered.
 */
export async function fallbackToNextAmbulance(bookingId, { resolvedOfferId } = {}) {
  const booking = await bookingRepo.transition(
    bookingId,
    [BOOKING_STATUS.FINDING_AMBULANCE],
    { currentOfferId: null },
    { extraFilter: resolvedOfferId ? { currentOfferId: resolvedOfferId } : {} }
  );
  if (!booking) return null;
  return offerToNextAmbulance(booking);
}

/** Fallback that never throws into the caller (the reject/timeout already succeeded). */
export async function runBookingFallback(bookingId, options) {
  try {
    return await fallbackToNextAmbulance(bookingId, options);
  } catch (err) {
    logger.error('booking.fallback_failed', { bookingId: idOf(bookingId), ...errorMeta(err) });
    return null;
  }
}
