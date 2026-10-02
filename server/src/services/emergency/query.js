import { OFFER_STATUS, URGENCY_ORDER } from '../../constants/emergency.js';
import { ROLES } from '../../constants/roles.js';
import { ASSIGNED_BOOKING_STATUSES } from '../../constants/booking.js';
import { bookingRepo } from '../../repositories/bookingRepo.js';
import { emergencyRepo } from '../../repositories/emergencyRepo.js';
import { hospitalRequestRepo } from '../../repositories/hospitalRequestRepo.js';
import { reservationRepo } from '../../repositories/reservationRepo.js';
import { timelineRepo } from '../../repositories/timelineRepo.js';
import { forbidden } from '../../utils/AppError.js';
import { idOf, sameId } from '../../utils/ids.js';
import { ambulanceBookingView } from '../booking/views.js';
import { isOwner, loadEmergency, wasContacted } from './access.js';

/** Dispatcher: own emergencies; admin: all. `statuses` optional. */
export async function listEmergencies(user, { statuses } = {}) {
  const filter = {};
  if (user.role === ROLES.DISPATCHER) filter.dispatcherId = user.id;
  if (statuses?.length) filter.status = { $in: statuses };
  return emergencyRepo.list(filter);
}

/** Only what a contacted hospital needs to respond — no dispatcher details (RULES.md §6). */
async function hospitalView(emergency, hospitalId) {
  const offers = (await hospitalRequestRepo.findByEmergency(emergency._id)).filter((o) =>
    sameId(o.hospitalId, hospitalId)
  );
  const latest = offers[offers.length - 1];
  return {
    id: idOf(emergency),
    demoPatientId: emergency.demoPatientId,
    requirements: emergency.requirements,
    urgency: emergency.urgency,
    etaMinutes: latest?.matchSnapshot?.etaMinutes ?? null,
    distanceKm: latest?.matchSnapshot?.distanceKm ?? null,
    offers: offers.map((o) => o.toJSON()),
    createdAt: emergency.createdAt,
    serverNow: new Date(),
  };
}

/**
 * Full view for the owner dispatcher / admin: emergency + timeline + offers + current
 * offer + reservation. A contacted hospital gets the restricted view.
 */
export async function getEmergency(id, user) {
  const emergency = await loadEmergency(id);

  if (user.role === ROLES.HOSPITAL) {
    if (!wasContacted(emergency, user.hospitalId))
      throw forbidden('Your hospital was not contacted for this emergency');
    return hospitalView(emergency, user.hospitalId);
  }
  if (user.role !== ROLES.ADMIN && !isOwner(emergency, user)) throw forbidden('You can only view your own emergencies');

  const [timeline, offers, reservation, booking] = await Promise.all([
    timelineRepo.listByEmergency(emergency._id),
    hospitalRequestRepo.findByEmergency(emergency._id),
    emergency.reservationId ? reservationRepo.findWithBed(emergency.reservationId) : null,
    emergency.bookingId ? bookingRepo.findById(emergency.bookingId) : null,
  ]);
  const currentOffer = offers.find((o) => sameId(o._id, emergency.currentHospitalRequestId)) ?? null;

  return {
    ...emergency.toJSON(),
    timeline: timeline.map((t) => t.toJSON()),
    offers: offers.map((o) => o.toJSON()),
    currentOffer: currentOffer?.toJSON() ?? null,
    reservation: reservation ? reservationJSON(reservation) : null,
    // Present when a public caller booked this ambulance: condition, pickup place and caller contact.
    booking: booking ? ambulanceBookingView(booking, { revealCaller: true }) : null,
    serverNow: new Date(),
  };
}

function reservationJSON(reservation) {
  const json = reservation.toJSON();
  const bed = reservation.bedId;
  if (bed?.label) {
    json.bedId = idOf(bed);
    json.bed = { id: idOf(bed), label: bed.label, type: bed.type, equipment: bed.equipment };
  }
  return json;
}

/** Hospital queue: PENDING first (urgency → expiresAt), then the rest, newest first. */
export async function listHospitalRequests(user, { statuses } = {}) {
  const filter = {};
  if (user.role === ROLES.HOSPITAL) filter.hospitalId = user.hospitalId;
  if (statuses?.length) filter.status = { $in: statuses };

  const offers = await hospitalRequestRepo.list(filter);
  const acceptedIds = offers.filter((o) => o.status === OFFER_STATUS.ACCEPTED).map((o) => o._id);
  const reservations = acceptedIds.length ? await reservationRepo.findByHospitalRequestIds(acceptedIds) : [];
  const reservationByOffer = new Map(reservations.map((r) => [idOf(r.hospitalRequestId), reservationJSON(r)]));

  const bookingIds = offers.map((o) => o.emergencyId?.bookingId).filter(Boolean);
  const bookings = bookingIds.length ? await bookingRepo.findByIds(bookingIds) : [];
  const bookingById = new Map(bookings.map((b) => [idOf(b), b]));
  const items = offers.map((offer) => {
    const json = offer.toJSON();
    const emergency = offer.emergencyId;
    json.emergencyId = idOf(emergency);
    json.emergency = emergency?.requirements
      ? { requirements: emergency.requirements, urgency: emergency.urgency, demoPatientId: emergency.demoPatientId }
      : null;
    const booking = bookingById.get(idOf(emergency?.bookingId));
    if (json.emergency && booking) {
      json.emergency.condition = booking.condition;
      // Caller contact only once this hospital accepted, and only while the booking is live.
      const reveal = offer.status === OFFER_STATUS.ACCEPTED && ASSIGNED_BOOKING_STATUSES.includes(booking.status);
      const caller = ambulanceBookingView(booking, { revealCaller: reveal }).caller;
      if (caller) json.emergency.caller = caller;
    }
    json.reservation = reservationByOffer.get(idOf(offer)) ?? null;
    return json;
  });

  const pendingFirst = (a, b) => {
    const ap = a.status === OFFER_STATUS.PENDING;
    const bp = b.status === OFFER_STATUS.PENDING;
    if (ap !== bp) return ap ? -1 : 1;
    if (ap) {
      const urgency = (URGENCY_ORDER[a.emergency?.urgency] ?? 9) - (URGENCY_ORDER[b.emergency?.urgency] ?? 9);
      return urgency || new Date(a.expiresAt) - new Date(b.expiresAt);
    }
    return new Date(b.offeredAt) - new Date(a.offeredAt);
  };

  return { requests: items.sort(pendingFirst), serverNow: new Date() };
}
