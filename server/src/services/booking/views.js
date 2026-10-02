import { fromPoint } from '../../utils/geo.js';
import { idOf } from '../../utils/ids.js';

/** Stored as the 10 national digits; shown and dialled with the +91 country code. */
export const dialablePhone = (phone) => (phone ? `+91${phone}` : '');

export const pickupOf = (booking) =>
  booking.pickupLocation ? { ...fromPoint(booking.pickupLocation), label: booking.pickupLabel } : null;

/**
 * What the crew and hospital staff see of a booking. The caller's name and phone are included
 * only with `revealCaller` (after the ambulance accepted / the hospital accepted) and only
 * while they have not been purged.
 */
export function ambulanceBookingView(booking, { revealCaller = false } = {}) {
  const view = {
    id: idOf(booking),
    status: booking.status,
    condition: booking.condition,
    urgency: booking.urgency,
    pickup: pickupOf(booking),
    notes: booking.notes,
    createdAt: booking.createdAt,
  };
  if (revealCaller && booking.phone) view.caller = { name: booking.patientName, phone: dialablePhone(booking.phone) };
  return view;
}

/** One entry of `GET /api/booking-offers` for the ambulance it was sent to. */
export function offerView(offer) {
  const booking = offer.bookingId;
  return {
    id: idOf(offer),
    status: offer.status,
    attempt: offer.attempt,
    offeredAt: offer.offeredAt,
    expiresAt: offer.expiresAt,
    distanceKm: offer.distanceKm,
    etaMinutes: offer.etaMinutes,
    booking: booking?.condition ? ambulanceBookingView(booking) : null,
  };
}
