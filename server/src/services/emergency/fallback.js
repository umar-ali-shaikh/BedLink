import { EMERGENCY_STATUS, TIMELINE_EVENTS } from '../../constants/emergency.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { emergencyRepo } from '../../repositories/emergencyRepo.js';
import { errorMeta, logger } from '../../utils/logger.js';
import { idOf } from '../../utils/ids.js';
import { emitEmergencyUpdated, notifyDispatcher } from './events.js';
import { offerTo, rankFor } from './offer.js';
import { SYSTEM_ACTOR, record } from './timeline.js';

/** SEARCHING → NO_MATCH with timeline entry + live update. Returns the latest emergency. */
export async function concludeNoMatch(emergency, actor = SYSTEM_ACTOR) {
  const updated = await emergencyRepo.transition(emergency._id, [EMERGENCY_STATUS.SEARCHING], {
    status: EMERGENCY_STATUS.NO_MATCH,
    currentHospital: null,
    currentHospitalRequestId: null,
  });
  if (!updated) return emergencyRepo.findById(emergency._id);

  const timelineEntry = await record(updated._id, TIMELINE_EVENTS.NO_HOSPITALS_REMAINING, {
    actor,
    metadata: { contacted: updated.contactedHospitalIds.length },
  });
  emitEmergencyUpdated(updated, timelineEntry);
  await notifyDispatcher(
    updated,
    SERVER_EVENTS.EMERGENCY_UPDATED,
    'No suitable hospitals remaining',
    `${updated.demoPatientId}: retry or widen the requirements`
  );
  return updated;
}

/**
 * Automatic fallback (ARCHITECTURE.md §11.5). Runs after a reject, timeout or
 * failed accept. Only proceeds if the emergency is still waiting on `resolvedOfferId`,
 * so a cancel or a newer offer is never clobbered. Re-ranks with fresh data.
 */
async function fallback(emergencyId, { resolvedOfferId } = {}) {
  const extraFilter = resolvedOfferId ? { currentHospitalRequestId: resolvedOfferId } : {};
  const emergency = await emergencyRepo.transition(
    emergencyId,
    [EMERGENCY_STATUS.AWAITING_HOSPITAL],
    { status: EMERGENCY_STATUS.SEARCHING, currentHospital: null, currentHospitalRequestId: null },
    { extraFilter }
  );
  if (!emergency) return null;

  const now = new Date();
  const ranking = await rankFor(emergency, { now });
  await emergencyRepo.saveMatching(emergency._id, { candidates: ranking.candidates, exclusions: ranking.exclusions });

  if (!ranking.candidates.length) return concludeNoMatch(emergency, SYSTEM_ACTOR);
  const { emergency: updated } = await offerTo(emergency, ranking.candidates[0], {
    actor: SYSTEM_ACTOR,
    automatic: true,
    now,
  });
  return updated;
}

/** Fallback that never throws into the caller (the reject/timeout already succeeded). */
export async function runFallback(emergencyId, options) {
  try {
    return await fallback(emergencyId, options);
  } catch (err) {
    logger.error('emergency.fallback_failed', { emergencyId: idOf(emergencyId), ...errorMeta(err) });
    return null;
  }
}
