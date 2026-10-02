import { env } from '../../config/env.js';
import { runInTransaction } from '../../config/db.js';
import { BED_STATUS } from '../../constants/bed.js';
import { EMERGENCY_STATUS, REQUESTABLE_EMERGENCY_STATUSES, TIMELINE_EVENTS } from '../../constants/emergency.js';
import { RESERVATION_STATUS } from '../../constants/reservation.js';
import { ROLES } from '../../constants/roles.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { bedRepo } from '../../repositories/bedRepo.js';
import { emergencyRepo } from '../../repositories/emergencyRepo.js';
import { reservationRepo } from '../../repositories/reservationRepo.js';
import { timelineRepo } from '../../repositories/timelineRepo.js';
import { AppError, forbidden, notFound } from '../../utils/AppError.js';
import { idOf, sameId } from '../../utils/ids.js';
import { errorMeta, logger } from '../../utils/logger.js';
import { assertHospitalScope } from '../access.js';
import { publishBedChange } from '../bed/index.js';
import { emitEmergencyUpdated, notifyDispatcher, offerRooms } from '../emergency/events.js';
import { SYSTEM_ACTOR, entry, record, userActor } from '../emergency/timeline.js';
import { loadCrewViews } from '../ambulance/view.js';
import { BOOKING_STATUS } from '../../constants/booking.js';
import { closeBookingForEmergency } from '../booking/lifecycle.js';
import { emit, notify } from '../notification/index.js';

/**
 * Atomically lock one bed and create the ACTIVE reservation (ARCHITECTURE.md §13).
 * Primary guard: conditional `findOneAndUpdate` on `status: AVAILABLE`. Secondary guard:
 * unique partial index on active reservations. Without a session (no transactions) a
 * failed insert is compensated by reverting the bed.
 *
 * With `bedId` (admin manual hold) that exact bed is locked; otherwise the freshest bed
 * matching the emergency's bed type and equipment.
 */
export async function lockBed(
  { emergency, hospitalId, hospitalRequestId = null, bedId, userId, now = new Date() },
  { session } = {}
) {
  const bed = await bedRepo.lockMatchingBed(
    {
      hospitalId,
      bedId,
      bedType: emergency.requirements.bedType,
      equipment: bedId ? undefined : [...emergency.requirements.equipment],
      userId,
    },
    { session }
  );
  if (!bed) throw new AppError('BED_NOT_AVAILABLE');

  try {
    const reservation = await reservationRepo.create(
      {
        requestId: emergency._id,
        hospitalRequestId,
        hospitalId,
        bedId: bed._id,
        status: RESERVATION_STATUS.ACTIVE,
        expiresAt: new Date(now.getTime() + env.RESERVATION_HOLD_MINUTES * 60_000),
        createdBy: userId,
      },
      { session }
    );
    return { reservation, bed };
  } catch (err) {
    if (!session) await bedRepo.transition(bed._id, BED_STATUS.RESERVED, BED_STATUS.AVAILABLE);
    if (err?.code === 11000) throw new AppError('DUPLICATE_RESERVATION');
    throw err;
  }
}

/** Compensation for the no-transaction mode: drop the reservation and free the bed. */
export async function undoLock({ reservation, bed }) {
  await reservationRepo.deleteById(reservation._id);
  await bedRepo.transition(bed._id, BED_STATUS.RESERVED, BED_STATUS.AVAILABLE);
}

export function emitReservationCreated(emergency, reservation, bed) {
  emit(SERVER_EVENTS.RESERVATION_CREATED, offerRooms(emergency, reservation.hospitalId), {
    reservationId: idOf(reservation),
    emergencyId: idOf(emergency),
    bedId: idOf(bed),
    bedLabel: bed.label,
    hospitalId: idOf(reservation.hospitalId),
    expiresAt: reservation.expiresAt,
  });
}

/**
 * `POST /api/reservations` — admin manual hold `{ requestId, bedId }` through the same
 * atomic lock path. The emergency must be SEARCHING or NO_MATCH (no live offer).
 */
export async function createManualReservation({ requestId, bedId }, user) {
  const emergency = await emergencyRepo.findById(requestId);
  if (!emergency) throw notFound('Emergency');
  const target = await bedRepo.findById(bedId);
  if (!target) throw notFound('Bed');
  if (!REQUESTABLE_EMERGENCY_STATUSES.includes(emergency.status)) {
    throw new AppError('INVALID_STATE_TRANSITION', `Cannot hold a bed while the emergency is ${emergency.status}`);
  }

  const now = new Date();
  const actor = userActor(user);
  const { reservation, bed, updated, timelineEntry } = await runInTransaction(async (session) => {
    const locked = await lockBed(
      { emergency, hospitalId: target.hospitalId, bedId, userId: user.id, now },
      { session }
    );
    const moved = await emergencyRepo.transition(
      requestId,
      REQUESTABLE_EMERGENCY_STATUSES,
      {
        status: EMERGENCY_STATUS.RESERVED,
        reservationId: locked.reservation._id,
        currentHospital: target.hospitalId,
        currentHospitalRequestId: null,
      },
      { session, push: { contactedHospitalIds: target.hospitalId } }
    );
    if (!moved) {
      if (!session) await undoLock(locked);
      throw new AppError('INVALID_STATE_TRANSITION', 'The emergency changed state, please refresh');
    }
    const [created] = await timelineRepo.append(
      entry(requestId, TIMELINE_EVENTS.BED_RESERVED, {
        actor,
        hospitalId: target.hospitalId,
        timestamp: now,
        metadata: { bedLabel: locked.bed.label, expiresAt: locked.reservation.expiresAt, manual: true },
      }),
      { session }
    );
    return { ...locked, updated: moved, timelineEntry: created };
  });

  emitReservationCreated(updated, reservation, bed);
  emitEmergencyUpdated(updated, timelineEntry);
  await publishBedChange(reservation.hospitalId, bed);
  return reservation;
}

async function loadReservation(id) {
  const reservation = await reservationRepo.findById(id);
  if (!reservation) throw notFound('Reservation');
  return reservation;
}

/** HOSPITAL (own), DISPATCHER (owner of the emergency), ADMIN. */
function assertCanRelease(user, reservation, emergency) {
  if (user.role === ROLES.ADMIN) return;
  if (user.role === ROLES.HOSPITAL && sameId(user.hospitalId, reservation.hospitalId)) return;
  if (user.role === ROLES.DISPATCHER && emergency && sameId(emergency.dispatcherId, user.id)) return;
  throw forbidden('You cannot release this reservation');
}

async function stateError(id, now) {
  const current = await reservationRepo.findById(id);
  const expired =
    current?.status === RESERVATION_STATUS.EXPIRED ||
    (current?.status === RESERVATION_STATUS.ACTIVE && current.expiresAt <= now);
  return expired
    ? new AppError('RESERVATION_EXPIRED')
    : new AppError('INVALID_STATE_TRANSITION', `Reservation is already ${current?.status}`);
}

/**
 * Shared tail of release / expiry: free the bed, optionally return the emergency to
 * SEARCHING (dispatcher retries manually), timeline, events.
 */
async function finishRelease(reservation, { event, timelineEvent, actor, by, moveEmergency }) {
  const bed = await bedRepo.transition(reservation.bedId, BED_STATUS.RESERVED, BED_STATUS.AVAILABLE, actor.userId);

  let emergency = null;
  if (moveEmergency) {
    emergency = await emergencyRepo.transition(
      reservation.requestId,
      [EMERGENCY_STATUS.RESERVED],
      {
        status: EMERGENCY_STATUS.SEARCHING,
        reservationId: null,
        currentHospital: null,
        currentHospitalRequestId: null,
      },
      { extraFilter: { reservationId: reservation._id } }
    );
  }
  emergency ??= await emergencyRepo.findById(reservation.requestId);

  const timelineEntry = await record(reservation.requestId, timelineEvent, {
    actor,
    hospitalId: reservation.hospitalId,
    metadata: { bedLabel: bed?.label ?? null },
  });

  if (emergency) {
    emit(event, offerRooms(emergency, reservation.hospitalId), {
      reservationId: idOf(reservation),
      bedId: idOf(reservation.bedId),
      emergencyId: idOf(emergency),
      ...(by ? { by } : {}),
    });
    emitEmergencyUpdated(emergency, timelineEntry);
  }
  if (bed) await publishBedChange(reservation.hospitalId, bed);
  return emergency;
}

/** `POST /api/reservations/:id/release` — bed back to AVAILABLE, emergency to SEARCHING. */
export async function releaseReservation(id, user) {
  const reservation = await loadReservation(id);
  const emergency = await emergencyRepo.findById(reservation.requestId);
  assertCanRelease(user, reservation, emergency);

  const now = new Date();
  const released = await reservationRepo.resolveActive(id, RESERVATION_STATUS.RELEASED, { notExpiredAt: now });
  if (!released) throw await stateError(id, now);

  await finishRelease(released, {
    event: SERVER_EVENTS.RESERVATION_RELEASED,
    timelineEvent: TIMELINE_EVENTS.RESERVATION_RELEASED,
    actor: userActor(user),
    by: { userId: user.id, role: user.role },
    moveEmergency: true,
  });
  return released;
}

/** Used by cancel: release without moving the (already CANCELLED) emergency. */
export async function releaseForCancelledEmergency(emergency, actor) {
  const active = await reservationRepo.findActiveByRequest(emergency._id);
  if (!active) return null;
  const released = await reservationRepo.resolveActive(active._id, RESERVATION_STATUS.RELEASED);
  if (!released) return null;
  await finishRelease(released, {
    event: SERVER_EVENTS.RESERVATION_RELEASED,
    timelineEvent: TIMELINE_EVENTS.RESERVATION_RELEASED,
    actor,
    by: { userId: actor.userId, role: actor.role },
    moveEmergency: false,
  });
  return released;
}

/** `POST /api/reservations/:id/arrive` — bed OCCUPIED, reservation FULFILLED, emergency COMPLETED. */
export async function arriveReservation(id, user) {
  const reservation = await loadReservation(id);
  assertHospitalScope(user, reservation.hospitalId);

  const now = new Date();
  const fulfilled = await reservationRepo.resolveActive(id, RESERVATION_STATUS.FULFILLED, { notExpiredAt: now });
  if (!fulfilled) throw await stateError(id, now);

  const bed = await bedRepo.transition(fulfilled.bedId, BED_STATUS.RESERVED, BED_STATUS.OCCUPIED, user.id);
  const emergency =
    (await emergencyRepo.transition(
      fulfilled.requestId,
      [EMERGENCY_STATUS.RESERVED],
      { status: EMERGENCY_STATUS.COMPLETED },
      { extraFilter: { reservationId: fulfilled._id } }
    )) ?? (await emergencyRepo.findById(fulfilled.requestId));

  const timelineEntry = await record(fulfilled.requestId, TIMELINE_EVENTS.PATIENT_ARRIVED, {
    actor: userActor(user),
    hospitalId: fulfilled.hospitalId,
    timestamp: now,
    metadata: { bedLabel: bed?.label ?? null },
  });
  if (emergency) emitEmergencyUpdated(emergency, timelineEntry);
  await closeBookingForEmergency(fulfilled.requestId, BOOKING_STATUS.COMPLETED, now);
  if (bed) await publishBedChange(fulfilled.hospitalId, bed);
  return fulfilled;
}

/** Hold expired (sweeper): ACTIVE → EXPIRED, bed AVAILABLE, emergency SEARCHING. Idempotent. */
export async function expireReservation(id, now = new Date()) {
  const expired = await reservationRepo.resolveActive(id, RESERVATION_STATUS.EXPIRED, { expiredAt: now });
  if (!expired) return null;

  const emergency = await finishRelease(expired, {
    event: SERVER_EVENTS.RESERVATION_EXPIRED,
    timelineEvent: TIMELINE_EVENTS.RESERVATION_EXPIRED,
    actor: SYSTEM_ACTOR,
    moveEmergency: true,
  });
  if (emergency) {
    await notifyDispatcher(
      emergency,
      SERVER_EVENTS.RESERVATION_EXPIRED,
      'Bed hold expired',
      `${emergency.demoPatientId}: request a hospital again`
    );
  }
  await notify({
    hospitalId: expired.hospitalId,
    type: SERVER_EVENTS.RESERVATION_EXPIRED,
    title: 'Bed hold expired',
    refId: expired._id,
  });
  return expired;
}

/** Sweeper step for reservations. */
export async function expireOverdueReservations(now = new Date()) {
  const overdue = await reservationRepo.findOverdue(now);
  for (const reservation of overdue) {
    try {
      await expireReservation(reservation._id, now);
    } catch (err) {
      logger.error('reservation.sweep_failed', { reservationId: idOf(reservation), ...errorMeta(err) });
    }
  }
  return overdue.length;
}

/** HOSPITAL: own hospital · DISPATCHER: own emergencies · ADMIN: all. */
export async function listReservations(user, { statuses } = {}) {
  const filter = {};
  if (user.role === ROLES.HOSPITAL) filter.hospitalId = user.hospitalId;
  if (user.role === ROLES.DISPATCHER) filter.requestId = { $in: await emergencyRepo.idsByDispatcher(user.id) };
  if (statuses?.length) filter.status = { $in: statuses };
  const reservations = await reservationRepo.list(filter);
  // Hospital staff see which ambulance is bringing the patient (vehicle, driver, organisation, crew phone).
  let crewByRequest = new Map();
  if (user.role === ROLES.HOSPITAL && reservations.length) {
    const emergencies = await emergencyRepo.findByIds(
      reservations.map((r) => r.requestId),
      'dispatcherId'
    );
    const crews = await loadCrewViews(emergencies.map((e) => e.dispatcherId));
    crewByRequest = new Map(emergencies.map((e) => [idOf(e), crews.get(idOf(e.dispatcherId)) ?? null]));
  }
  return reservations.map((r) => {
    const json = r.toJSON();
    if (user.role === ROLES.HOSPITAL) json.ambulance = crewByRequest.get(idOf(r.requestId)) ?? null;
    if (r.bedId?.label) {
      json.bedId = idOf(r.bedId);
      json.bed = { id: idOf(r.bedId), label: r.bedId.label, type: r.bedId.type, equipment: r.bedId.equipment };
    }
    if (r.hospitalId?.name) {
      json.hospitalId = idOf(r.hospitalId);
      json.hospitalName = r.hospitalId.name;
    }
    return json;
  });
}
