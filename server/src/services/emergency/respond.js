import { runInTransaction } from '../../config/db.js';
import { EMERGENCY_STATUS, OFFER_STATUS, REJECT_REASONS, TIMELINE_EVENTS } from '../../constants/emergency.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { emergencyRepo } from '../../repositories/emergencyRepo.js';
import { hospitalRepo } from '../../repositories/hospitalRepo.js';
import { hospitalRequestRepo } from '../../repositories/hospitalRequestRepo.js';
import { timelineRepo } from '../../repositories/timelineRepo.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { idOf } from '../../utils/ids.js';
import { assertHospitalScope } from '../access.js';
import { publishBedChange } from '../bed/index.js';
import { emit } from '../notification/index.js';
import { emitReservationCreated, lockBed, undoLock } from '../reservation/index.js';
import { emitEmergencyUpdated, notifyDispatcher, offerRooms } from './events.js';
import { runFallback } from './fallback.js';
import { SYSTEM_ACTOR, entry, record, userActor } from './timeline.js';
import { clearOfferTimeout } from './timers.js';

const secondsBetween = (from, to) => Math.round((to.getTime() - new Date(from).getTime()) / 1000);

async function hospitalName(hospitalId) {
  return (await hospitalRepo.findById(hospitalId))?.name ?? null;
}

async function loadOwnOffer(id, user) {
  const offer = await hospitalRequestRepo.findById(id);
  if (!offer) throw notFound('Hospital request');
  assertHospitalScope(user, offer.hospitalId);
  return offer;
}

/** Explain why a PENDING-only transition did not apply. */
async function resolutionError(id, now) {
  const offer = await hospitalRequestRepo.findById(id);
  const expired =
    offer?.status === OFFER_STATUS.TIMEOUT || (offer?.status === OFFER_STATUS.PENDING && offer.expiresAt <= now);
  return new AppError(expired ? 'OFFER_EXPIRED' : 'OFFER_ALREADY_RESOLVED');
}

/** Accept found no bed → treat as rejection `NO_BED_AT_ACCEPT` and fall back (ARCHITECTURE.md §11.3). */
async function handleNoBedAtAccept(offer, user, now) {
  const rejected = await hospitalRequestRepo.markNoBedAtAccept(offer._id, {
    rejectReason: REJECT_REASONS.NO_BED_AT_ACCEPT,
    respondedAt: now,
    respondedBy: user.id,
  });
  if (!rejected) return;
  clearOfferTimeout(offer._id);

  const emergency = await emergencyRepo.findById(offer.emergencyId);
  await record(offer.emergencyId, TIMELINE_EVENTS.ACCEPT_FAILED_NO_BED, {
    actor: userActor(user),
    hospitalId: offer.hospitalId,
    timestamp: now,
    metadata: { hospitalName: await hospitalName(offer.hospitalId) },
  });
  emit(SERVER_EVENTS.HOSPITAL_REJECTED, offerRooms(emergency, offer.hospitalId), {
    hospitalRequestId: idOf(offer),
    emergencyId: idOf(offer.emergencyId),
    hospitalId: idOf(offer.hospitalId),
    respondedAt: now,
    reason: REJECT_REASONS.NO_BED_AT_ACCEPT,
  });
  await runFallback(offer.emergencyId, { resolvedOfferId: offer._id });
}

/**
 * Hospital accepts (ARCHITECTURE.md §11.3): PENDING → ACCEPTED (only before expiry),
 * atomically lock one matching bed, emergency → RESERVED — in one transaction.
 */
export async function acceptOffer(id, user) {
  const offer = await loadOwnOffer(id, user);
  const now = new Date();
  const actor = userActor(user);
  const name = await hospitalName(offer.hospitalId);

  let outcome;
  try {
    outcome = await runInTransaction(async (session) => {
      const accepted = await hospitalRequestRepo.resolvePending(
        id,
        OFFER_STATUS.ACCEPTED,
        { respondedAt: now, respondedBy: user.id },
        { session, notExpiredAt: now }
      );
      if (!accepted) throw await resolutionError(id, now);

      const emergency = await emergencyRepo.findById(offer.emergencyId, { session });
      const { reservation, bed } = await lockBed(
        { emergency, hospitalId: offer.hospitalId, hospitalRequestId: offer._id, userId: user.id, now },
        { session }
      );

      const updated = await emergencyRepo.transition(
        offer.emergencyId,
        [EMERGENCY_STATUS.AWAITING_HOSPITAL],
        { status: EMERGENCY_STATUS.RESERVED, reservationId: reservation._id },
        { session, extraFilter: { currentHospitalRequestId: offer._id } }
      );
      if (!updated) {
        if (!session) await undoLock({ reservation, bed });
        throw new AppError('INVALID_STATE_TRANSITION', 'This emergency is no longer waiting for your hospital');
      }

      const entries = await timelineRepo.append(
        [
          entry(offer.emergencyId, TIMELINE_EVENTS.HOSPITAL_ACCEPTED, {
            actor,
            hospitalId: offer.hospitalId,
            timestamp: now,
            metadata: { hospitalName: name, responseSeconds: secondsBetween(offer.offeredAt, now) },
          }),
          entry(offer.emergencyId, TIMELINE_EVENTS.BED_RESERVED, {
            actor,
            hospitalId: offer.hospitalId,
            timestamp: now,
            metadata: { hospitalName: name, bedLabel: bed.label, expiresAt: reservation.expiresAt },
          }),
        ],
        { session }
      );
      return { accepted, reservation, bed, emergency: updated, entries };
    });
  } catch (err) {
    if (err?.code === 'BED_NOT_AVAILABLE') await handleNoBedAtAccept(offer, user, now);
    throw err;
  }

  clearOfferTimeout(id);
  const { accepted, reservation, bed, emergency, entries } = outcome;
  emit(SERVER_EVENTS.HOSPITAL_ACCEPTED, offerRooms(emergency, offer.hospitalId), {
    hospitalRequestId: idOf(accepted),
    emergencyId: idOf(emergency),
    hospitalId: idOf(offer.hospitalId),
    respondedAt: now,
  });
  emitReservationCreated(emergency, reservation, bed);
  emitEmergencyUpdated(emergency, entries[entries.length - 1]);
  await publishBedChange(offer.hospitalId, bed);
  await notifyDispatcher(emergency, SERVER_EVENTS.HOSPITAL_ACCEPTED, `${name} accepted`, `Bed ${bed.label} reserved`);

  return { hospitalRequest: accepted, reservation, emergency };
}

/** Hospital rejects with a reason → automatic fallback (ARCHITECTURE.md §11.4). */
export async function rejectOffer(id, { reason }, user) {
  const offer = await loadOwnOffer(id, user);
  const now = new Date();
  const rejected = await hospitalRequestRepo.resolvePending(
    id,
    OFFER_STATUS.REJECTED,
    { respondedAt: now, respondedBy: user.id, rejectReason: reason },
    { notExpiredAt: now }
  );
  if (!rejected) throw await resolutionError(id, now);
  clearOfferTimeout(id);

  const name = await hospitalName(offer.hospitalId);
  const emergency = await emergencyRepo.findById(offer.emergencyId);
  await record(offer.emergencyId, TIMELINE_EVENTS.HOSPITAL_REJECTED, {
    actor: userActor(user),
    hospitalId: offer.hospitalId,
    timestamp: now,
    metadata: { hospitalName: name, reason, responseSeconds: secondsBetween(offer.offeredAt, now) },
  });
  emit(SERVER_EVENTS.HOSPITAL_REJECTED, offerRooms(emergency, offer.hospitalId), {
    hospitalRequestId: idOf(rejected),
    emergencyId: idOf(emergency),
    hospitalId: idOf(offer.hospitalId),
    respondedAt: now,
    reason,
  });
  await notifyDispatcher(emergency, SERVER_EVENTS.HOSPITAL_REJECTED, `${name} rejected`, `Reason: ${reason}`);

  await runFallback(offer.emergencyId, { resolvedOfferId: rejected._id });
  return rejected;
}

/**
 * Server-side timeout (ARCHITECTURE.md §11.2). Idempotent: only the first caller (timer
 * or sweeper) wins the PENDING → TIMEOUT transition; everyone else gets null.
 */
export async function expireOffer(id, now = new Date()) {
  const expired = await hospitalRequestRepo.resolvePending(
    id,
    OFFER_STATUS.TIMEOUT,
    { respondedAt: now },
    { expiredAt: now }
  );
  if (!expired) return null;
  clearOfferTimeout(id);

  const name = await hospitalName(expired.hospitalId);
  const emergency = await emergencyRepo.findById(expired.emergencyId);
  await record(expired.emergencyId, TIMELINE_EVENTS.HOSPITAL_TIMEOUT, {
    actor: SYSTEM_ACTOR,
    hospitalId: expired.hospitalId,
    timestamp: now,
    metadata: { hospitalName: name, windowSeconds: secondsBetween(expired.offeredAt, expired.expiresAt) },
  });
  if (emergency) {
    emit(SERVER_EVENTS.HOSPITAL_TIMEOUT, offerRooms(emergency, expired.hospitalId), {
      hospitalRequestId: idOf(expired),
      emergencyId: idOf(emergency),
      hospitalId: idOf(expired.hospitalId),
    });
    await notifyDispatcher(emergency, SERVER_EVENTS.HOSPITAL_TIMEOUT, `${name} did not respond in time`);
  }

  await runFallback(expired.emergencyId, { resolvedOfferId: expired._id });
  return expired;
}
