import { CASE_REF_PREFIX, DEFAULT_URGENCY, EMERGENCY_STATUS, TIMELINE_EVENTS } from '../../constants/emergency.js';
import { ROLES } from '../../constants/roles.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { emergencyRepo } from '../../repositories/emergencyRepo.js';
import { dispatcherRoom, roleRoom } from '../../sockets/rooms.js';
import { toPoint } from '../../utils/geo.js';
import { rank } from '../matching/index.js';
import { emit } from '../notification/index.js';
import { concludeNoMatch } from './fallback.js';
import { SYSTEM_ACTOR, record, userActor } from './timeline.js';

/** `EM-0042` style case reference. Never real identity (RULES.md §9). */
async function nextCaseRef() {
  const count = await emergencyRepo.count();
  return `${CASE_REF_PREFIX}${String(count + 1).padStart(4, '0')}`;
}

/**
 * Create an emergency and run matching (ARCHITECTURE.md §1 "Emergency" flow). Does not
 * contact a hospital — the dispatcher does that with request-hospital. `bookingId` marks an
 * emergency raised from a public booking, so its events also reach the caller's booking room.
 */
export async function createEmergency(
  { patientLocation, requirements, urgency = DEFAULT_URGENCY },
  user,
  { bookingId = null } = {}
) {
  const now = new Date();
  const emergency = await emergencyRepo.create({
    dispatcherId: user.id,
    demoPatientId: await nextCaseRef(),
    patientLocation: toPoint(patientLocation),
    requirements,
    urgency,
    status: EMERGENCY_STATUS.SEARCHING,
    bookingId,
  });

  await record(emergency._id, TIMELINE_EVENTS.REQUEST_CREATED, {
    actor: userActor(user),
    timestamp: now,
    metadata: { requirements, urgency },
  });

  const ranking = await rank({ patientLocation, requirements, now });
  let saved = await emergencyRepo.saveMatching(emergency._id, {
    candidates: ranking.candidates,
    exclusions: ranking.exclusions,
    matchingDurationMs: ranking.durationMs,
  });

  await record(emergency._id, TIMELINE_EVENTS.MATCHING_COMPLETED, {
    actor: SYSTEM_ACTOR,
    metadata: {
      suitable: ranking.candidates.length,
      excluded: ranking.exclusions.length,
      durationMs: ranking.durationMs,
    },
  });

  if (!ranking.candidates.length) saved = await concludeNoMatch(saved, SYSTEM_ACTOR);

  emit(SERVER_EVENTS.EMERGENCY_CREATED, [dispatcherRoom(user.id), roleRoom(ROLES.ADMIN)], {
    emergency: saved.toJSON(),
  });
  return saved;
}
