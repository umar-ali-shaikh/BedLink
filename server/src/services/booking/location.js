import { env } from '../../config/env.js';
import { BOOKING_STATUS } from '../../constants/booking.js';
import { VERIFICATION_STATUS } from '../../constants/hospital.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { bookingRepo } from '../../repositories/bookingRepo.js';
import { userRepo } from '../../repositories/userRepo.js';
import { bookingRoom } from '../../sockets/rooms.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { haversineKm } from '../../utils/geo.js';
import { idOf } from '../../utils/ids.js';
import { emit } from '../notification/index.js';
import { emitBookingUpdated } from './events.js';
import { etaToPickup } from './track.js';
import { pickupOf } from './views.js';

/** A socket's user snapshot predates a later admin approval, so a non-verified one is re-checked in the DB. */
async function assertVerified(user) {
  if (user.verificationStatus === VERIFICATION_STATUS.VERIFIED) return;
  const current = await userRepo.findById(user.id);
  if ((current?.verificationStatus ?? VERIFICATION_STATUS.VERIFIED) !== VERIFICATION_STATUS.VERIFIED) {
    throw new AppError('ACCOUNT_NOT_VERIFIED');
  }
}

/** `POST /api/ambulance/duty`. Only verified ambulances can go on duty. */
export async function setDuty(user, onDuty) {
  await assertVerified(user);
  const updated = await userRepo.setOnDuty(user.id, onDuty);
  if (!updated) throw notFound('Ambulance');
  return { onDuty: updated.ambulance.onDuty, locationAt: updated.ambulance.locationAt };
}

/** Move the booking along as the ambulance approaches: ON_THE_WAY on the first fix, AT_PICKUP when close. */
async function advanceBooking(booking, location, now) {
  const pickup = pickupOf(booking);
  let current = booking;
  if (current.status === BOOKING_STATUS.AMBULANCE_ASSIGNED) {
    const moved = await bookingRepo.transition(current._id, [BOOKING_STATUS.AMBULANCE_ASSIGNED], {
      status: BOOKING_STATUS.ON_THE_WAY,
      onTheWayAt: now,
    });
    if (moved) {
      current = moved;
      emitBookingUpdated(moved);
    }
  }
  if (pickup && haversineKm(location, pickup) * 1000 <= env.BOOKING_PICKUP_RADIUS_METERS) {
    const arrived = await bookingRepo.transition(
      current._id,
      [BOOKING_STATUS.AMBULANCE_ASSIGNED, BOOKING_STATUS.ON_THE_WAY],
      { status: BOOKING_STATUS.AT_PICKUP, atPickupAt: now }
    );
    if (arrived) {
      current = arrived;
      emitBookingUpdated(arrived);
    }
  }
  return current;
}

/**
 * Socket `ambulance:location`. Stores the position (at most one per
 * AMBULANCE_LOCATION_MIN_INTERVAL_SECONDS), then — if the ambulance carries a booking —
 * advances it and pushes the position with a freshly computed ETA/distance to the caller.
 */
export async function updateAmbulanceLocation(user, { lat, lng }, now = new Date()) {
  await assertVerified(user);
  const notAfter = new Date(now.getTime() - env.AMBULANCE_LOCATION_MIN_INTERVAL_SECONDS * 1000);
  const updated = await userRepo.setAmbulanceLocation(user.id, { lat, lng }, now, notAfter);
  if (!updated) {
    const current = await userRepo.findById(user.id);
    if (!current?.ambulance?.onDuty) throw new AppError('AMBULANCE_NOT_ON_DUTY');
    return { stored: false };
  }
  const booking = await bookingRepo.findAssignedToAmbulance(user.id);
  if (booking) {
    const current = await advanceBooking(booking, { lat, lng }, now);
    emit(SERVER_EVENTS.BOOKING_AMBULANCE_LOCATION, [bookingRoom(idOf(current))], {
      bookingId: idOf(current),
      location: { lat, lng },
      locationAt: now,
      ...etaToPickup({ lat, lng }, pickupOf(current)),
    });
  }
  return { stored: true };
}
