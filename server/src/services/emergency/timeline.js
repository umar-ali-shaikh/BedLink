import { ACTOR_TYPES } from '../../constants/emergency.js';
import { timelineRepo } from '../../repositories/timelineRepo.js';

export const SYSTEM_ACTOR = Object.freeze({ type: ACTOR_TYPES.SYSTEM, userId: null, role: null });

export const userActor = (user) => ({ type: ACTOR_TYPES.USER, userId: user.id, role: user.role });

/** Build one timeline entry (append-only audit log, ARCHITECTURE.md §6.7). */
export const entry = (
  emergencyId,
  event,
  { actor = SYSTEM_ACTOR, hospitalId = null, metadata = {}, timestamp = new Date() } = {}
) => ({
  emergencyId,
  event,
  actor,
  hospitalId,
  metadata,
  timestamp,
});

/** Append a single entry and return the stored document. */
export async function record(emergencyId, event, options = {}, { session } = {}) {
  const [doc] = await timelineRepo.append(entry(emergencyId, event, options), { session });
  return doc;
}
