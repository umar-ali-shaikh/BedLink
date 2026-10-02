import {
  CANCELLABLE_EMERGENCY_STATUSES,
  EMERGENCY_STATUS,
  OFFER_STATUS,
  TIMELINE_EVENTS,
} from '../../constants/emergency.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { emergencyRepo } from '../../repositories/emergencyRepo.js';
import { hospitalRequestRepo } from '../../repositories/hospitalRequestRepo.js';
import { hospitalRoom } from '../../sockets/rooms.js';
import { AppError } from '../../utils/AppError.js';
import { idOf } from '../../utils/ids.js';
import { emit } from '../notification/index.js';
import { releaseForCancelledEmergency } from '../reservation/index.js';
import { loadManagedEmergency } from './access.js';
import { emitEmergencyUpdated } from './events.js';
import { record, userActor } from './timeline.js';
import { clearOfferTimeout } from './timers.js';

/**
 * Cancel (ARCHITECTURE.md §11.6). The emergency flips to CANCELLED first so a concurrent
 * fallback stops; then the live offer is withdrawn and any active reservation released.
 */
export async function cancelEmergency(id, user) {
  const emergency = await loadManagedEmergency(id, user, { allowAdmin: true });
  if (!CANCELLABLE_EMERGENCY_STATUSES.includes(emergency.status)) {
    throw new AppError('INVALID_STATE_TRANSITION', `A ${emergency.status} emergency cannot be cancelled`);
  }

  const cancelled = await emergencyRepo.transition(id, CANCELLABLE_EMERGENCY_STATUSES, {
    status: EMERGENCY_STATUS.CANCELLED,
  });
  if (!cancelled) throw new AppError('INVALID_STATE_TRANSITION', 'The emergency changed state, please refresh');

  const actor = userActor(user);
  const now = new Date();

  const pending = await hospitalRequestRepo.findPendingByEmergency(id);
  if (pending) {
    const withdrawn = await hospitalRequestRepo.resolvePending(pending._id, OFFER_STATUS.CANCELLED, {
      respondedAt: now,
    });
    if (withdrawn) {
      clearOfferTimeout(withdrawn._id);
      emit(SERVER_EVENTS.HOSPITAL_REQUEST_CANCELLED, [hospitalRoom(idOf(withdrawn.hospitalId))], {
        hospitalRequestId: idOf(withdrawn),
      });
    }
  }

  await releaseForCancelledEmergency(cancelled, actor);

  const timelineEntry = await record(cancelled._id, TIMELINE_EVENTS.REQUEST_CANCELLED, {
    actor,
    hospitalId: cancelled.currentHospital,
    timestamp: now,
    metadata: { previousStatus: emergency.status },
  });
  emitEmergencyUpdated(cancelled, timelineEntry);
  return cancelled;
}
