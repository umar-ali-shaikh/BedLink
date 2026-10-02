import { env } from '../../config/env.js';
import {
  ASSIGNED_BOOKING_STATUSES,
  BOOKING_STATUS,
  USER_CANCELLABLE_BOOKING_STATUSES,
} from '../../constants/booking.js';
import { EMERGENCY_STATUS } from '../../constants/emergency.js';
import { RESERVATION_STATUS } from '../../constants/reservation.js';
import { bookingRepo } from '../../repositories/bookingRepo.js';
import { emergencyRepo } from '../../repositories/emergencyRepo.js';
import { hospitalRepo } from '../../repositories/hospitalRepo.js';
import { hospitalRequestRepo } from '../../repositories/hospitalRequestRepo.js';
import { reservationRepo } from '../../repositories/reservationRepo.js';
import { userRepo } from '../../repositories/userRepo.js';
import { notFound } from '../../utils/AppError.js';
import { estimate } from '../matching/eta.js';
import { hashTrackingToken } from './token.js';
import { pickupOf } from './views.js';

/** Token → booking, or 404. Wrong, malformed and purged tokens all look the same. */
export async function resolveBookingByToken(token) {
  if (typeof token !== 'string' || !token) throw notFound('Booking');
  const booking = await bookingRepo.findByTokenHash(hashTrackingToken(token));
  if (!booking) throw notFound('Booking');
  return booking;
}

/** Live ETA/distance from the ambulance's last position to the pickup (same estimate as matching). */
export function etaToPickup(location, pickup) {
  if (!location || !pickup) return { etaMinutes: null, distanceKm: null };
  return estimate(location, pickup, { roadFactor: env.ROAD_FACTOR, avgSpeedKmph: env.AVG_AMBULANCE_SPEED_KMPH });
}

async function ambulanceSection(booking, pickup) {
  if (!booking.ambulanceId) return null;
  const user = await userRepo.findById(booking.ambulanceId);
  const a = user?.ambulance;
  if (!a) return null;
  const tracking = ASSIGNED_BOOKING_STATUSES.includes(booking.status);
  const location = tracking && a.location ? { lat: a.location.lat, lng: a.location.lng } : null;
  return {
    vehicleNumber: a.vehicleNumber,
    ambulanceType: a.ambulanceType,
    organization: a.organization,
    phone: user.phone || '',
    location,
    locationAt: location ? a.locationAt : null,
    ...(location ? etaToPickup(location, pickup) : { etaMinutes: null, distanceKm: null }),
  };
}

const HOSPITAL_STATE = Object.freeze({
  NONE: 'NONE',
  SEARCHING: 'SEARCHING',
  CONTACTING: 'CONTACTING',
  ACCEPTED: 'ACCEPTED',
  NO_MATCH: 'NO_MATCH',
  ARRIVED: 'ARRIVED',
});

/** Hospital stage of the linked emergency: contacting → accepted (with the held bed) → arrived. */
async function hospitalSection(booking) {
  if (!booking.emergencyId) return { state: HOSPITAL_STATE.NONE };
  const emergency = await emergencyRepo.findById(booking.emergencyId);
  if (!emergency || emergency.status === EMERGENCY_STATUS.CANCELLED) return { state: HOSPITAL_STATE.NONE };
  if (emergency.status === EMERGENCY_STATUS.NO_MATCH) return { state: HOSPITAL_STATE.NO_MATCH };
  if (emergency.status === EMERGENCY_STATUS.SEARCHING) return { state: HOSPITAL_STATE.SEARCHING };
  if (emergency.status === EMERGENCY_STATUS.AWAITING_HOSPITAL) {
    const hospital = emergency.currentHospital ? await hospitalRepo.findById(emergency.currentHospital) : null;
    return { state: HOSPITAL_STATE.CONTACTING, name: hospital?.name ?? null };
  }
  const reservation = emergency.reservationId ? await reservationRepo.findWithBed(emergency.reservationId) : null;
  const held = reservation && [RESERVATION_STATUS.ACTIVE, RESERVATION_STATUS.FULFILLED].includes(reservation.status);
  if (!held) return { state: HOSPITAL_STATE.NONE };
  const [hospital, offer] = await Promise.all([
    hospitalRepo.findById(reservation.hospitalId),
    reservation.hospitalRequestId ? hospitalRequestRepo.findById(reservation.hospitalRequestId) : null,
  ]);
  return {
    state: emergency.status === EMERGENCY_STATUS.COMPLETED ? HOSPITAL_STATE.ARRIVED : HOSPITAL_STATE.ACCEPTED,
    name: hospital?.name ?? null,
    address: hospital?.address ?? '',
    bedType: reservation.bedId?.type ?? emergency.requirements.bedType,
    heldUntil: reservation.expiresAt,
    etaMinutes: offer?.matchSnapshot?.etaMinutes ?? null,
    distanceKm: offer?.matchSnapshot?.distanceKm ?? null,
  };
}

/**
 * Everything the caller's tracking page shows. Never contains the phone number, ids of other
 * users, or anything about other bookings.
 */
export async function trackingView(booking) {
  const pickup = pickupOf(booking);
  const [ambulance, hospital] = await Promise.all([
    ambulanceSection(booking, pickup && { lat: pickup.lat, lng: pickup.lng }),
    hospitalSection(booking),
  ]);
  return {
    status: booking.status,
    condition: booking.condition,
    urgency: booking.urgency,
    pickup,
    createdAt: booking.createdAt,
    assignedAt: booking.assignedAt,
    onTheWayAt: booking.onTheWayAt,
    atPickupAt: booking.atPickupAt,
    closedAt: booking.closedAt,
    cancellation:
      booking.status === BOOKING_STATUS.CANCELLED
        ? { by: booking.cancelledBy, reason: booking.cancelReason, note: booking.cancelNote }
        : null,
    cancellable: USER_CANCELLABLE_BOOKING_STATUSES.includes(booking.status),
    retryable: booking.status === BOOKING_STATUS.NO_AMBULANCE,
    ambulance,
    hospital,
    serverNow: new Date(),
  };
}

export async function getTracking(token) {
  return trackingView(await resolveBookingByToken(token));
}
