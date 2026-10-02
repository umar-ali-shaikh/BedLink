import { env } from '../../config/env.js';
import { EMERGENCY_STATUS, OFFER_STATUS, TIMELINE_EVENTS } from '../../constants/emergency.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { emergencyRepo } from '../../repositories/emergencyRepo.js';
import { hospitalRepo } from '../../repositories/hospitalRepo.js';
import { hospitalRequestRepo } from '../../repositories/hospitalRequestRepo.js';
import { hospitalRoom } from '../../sockets/rooms.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { fromPoint } from '../../utils/geo.js';
import { idOf } from '../../utils/ids.js';
import { rank } from '../matching/index.js';
import { emit, notify } from '../notification/index.js';
import { userRepo } from '../../repositories/userRepo.js';
import { crewView } from '../ambulance/view.js';
import { loadManagedEmergency } from './access.js';
import { emitEmergencyUpdated } from './events.js';
import { concludeNoMatch } from './fallback.js';
import { record, userActor } from './timeline.js';
import { scheduleOfferTimeout } from './timers.js';

const requirementsOf = (emergency) => ({
  bedType: emergency.requirements.bedType,
  equipment: [...emergency.requirements.equipment],
  specialties: [...emergency.requirements.specialties],
});

/** Rank for an existing emergency, excluding hospitals already contacted. */
export const rankFor = (emergency, { onlyHospitalIds, now = new Date() } = {}) =>
  rank({
    patientLocation: fromPoint(emergency.patientLocation),
    requirements: requirementsOf(emergency),
    excludeHospitalIds: emergency.contactedHospitalIds.map(String),
    onlyHospitalIds,
    now,
  });

/**
 * Send the emergency to one ranked hospital (ARCHITECTURE.md §11.1): create the PENDING
 * offer with its 2-minute window, move the emergency to AWAITING_HOSPITAL, notify the
 * hospital, and arm the server-side timeout.
 */
export async function offerTo(emergency, candidate, { actor, automatic, now = new Date() }) {
  const expiresAt = new Date(now.getTime() + env.OFFER_TIMEOUT_SECONDS * 1000);
  let offer;
  try {
    offer = await hospitalRequestRepo.create({
      emergencyId: emergency._id,
      hospitalId: candidate.hospitalId,
      attempt: (await hospitalRequestRepo.countByEmergency(emergency._id)) + 1,
      status: OFFER_STATUS.PENDING,
      offeredAt: now,
      expiresAt,
      matchSnapshot: {
        score: candidate.score,
        etaMinutes: candidate.etaMinutes,
        distanceKm: candidate.distanceKm,
        confidence: candidate.confidence,
      },
    });
  } catch (err) {
    if (err?.code === 11000) throw new AppError('OFFER_ALREADY_PENDING');
    throw err;
  }

  const updated = await emergencyRepo.transition(
    emergency._id,
    [EMERGENCY_STATUS.SEARCHING],
    {
      status: EMERGENCY_STATUS.AWAITING_HOSPITAL,
      currentHospital: offer.hospitalId,
      currentHospitalRequestId: offer._id,
    },
    { push: { contactedHospitalIds: offer.hospitalId } }
  );
  if (!updated) {
    // The emergency moved on (cancelled, or another offer won the race): withdraw ours.
    await hospitalRequestRepo.resolvePending(offer._id, OFFER_STATUS.CANCELLED, { respondedAt: new Date() });
    const fresh = await emergencyRepo.findById(emergency._id);
    throw new AppError(
      fresh?.status === EMERGENCY_STATUS.AWAITING_HOSPITAL ? 'OFFER_ALREADY_PENDING' : 'INVALID_STATE_TRANSITION'
    );
  }

  const timelineEntry = await record(emergency._id, TIMELINE_EVENTS.HOSPITAL_CONTACTED, {
    actor,
    hospitalId: offer.hospitalId,
    timestamp: now,
    metadata: {
      hospitalName: candidate.hospitalName,
      attempt: offer.attempt,
      score: candidate.score,
      etaMinutes: candidate.etaMinutes,
      automatic,
      expiresAt,
    },
  });

  scheduleOfferTimeout(offer._id, expiresAt);

  const crew = crewView(await userRepo.findById(emergency.dispatcherId));
  emit(SERVER_EVENTS.HOSPITAL_REQUEST, [hospitalRoom(idOf(offer.hospitalId))], {
    hospitalRequestId: idOf(offer),
    emergencyId: idOf(emergency),
    requirements: requirementsOf(updated),
    urgency: updated.urgency,
    // Who is coming: only ever sent to the hospital that was offered this emergency.
    ambulance: crew,
    etaMinutes: candidate.etaMinutes,
    distanceKm: candidate.distanceKm,
    expiresAt,
    serverNow: new Date(),
  });
  emitEmergencyUpdated(updated, timelineEntry);
  await notify({
    hospitalId: offer.hospitalId,
    type: SERVER_EVENTS.HOSPITAL_REQUEST,
    title: `New ${updated.urgency} emergency request`,
    body: `${updated.requirements.bedType} bed · est. ${candidate.etaMinutes} min`,
    refId: offer._id,
  });

  return { emergency: updated, offer };
}

/**
 * `POST /api/emergencies/:id/request-hospital`. Without `hospitalId` the current top
 * candidate is offered; with it, that hospital is re-validated first. Retrying from
 * NO_MATCH starts a new round (contacted list cleared) with fresh matching.
 */
export async function requestHospital(emergencyId, { hospitalId } = {}, user) {
  let emergency = await loadManagedEmergency(emergencyId, user);

  if (emergency.status === EMERGENCY_STATUS.AWAITING_HOSPITAL) throw new AppError('OFFER_ALREADY_PENDING');
  if (![EMERGENCY_STATUS.SEARCHING, EMERGENCY_STATUS.NO_MATCH].includes(emergency.status)) {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Cannot request a hospital while the emergency is ${emergency.status}`
    );
  }
  if (hospitalId && !(await hospitalRepo.exists(hospitalId))) throw notFound('Hospital');

  if (emergency.status === EMERGENCY_STATUS.NO_MATCH) {
    emergency = await emergencyRepo.transition(emergency._id, [EMERGENCY_STATUS.NO_MATCH], {
      status: EMERGENCY_STATUS.SEARCHING,
      contactedHospitalIds: [],
    });
    if (!emergency) throw new AppError('INVALID_STATE_TRANSITION');
  }

  const now = new Date();
  const ranking = await rankFor(emergency, { onlyHospitalIds: hospitalId ? [hospitalId] : undefined, now });
  const candidate = ranking.candidates[0];

  if (hospitalId) {
    if (!candidate) {
      const messages = ranking.exclusions[0]?.messages ?? ['Hospital is outside the search radius'];
      throw new AppError(
        'HOSPITAL_NO_LONGER_MATCHES',
        undefined,
        undefined,
        messages.map((message) => ({ path: 'hospitalId', message }))
      );
    }
  } else {
    await emergencyRepo.saveMatching(emergency._id, { candidates: ranking.candidates, exclusions: ranking.exclusions });
    if (!candidate) return concludeNoMatch(emergency, userActor(user));
  }

  const { emergency: updated } = await offerTo(emergency, candidate, { actor: userActor(user), automatic: false, now });
  return updated;
}
