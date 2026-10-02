import { ROLES } from '../../constants/roles.js';
import { emergencyRepo } from '../../repositories/emergencyRepo.js';
import { forbidden, notFound } from '../../utils/AppError.js';
import { sameId } from '../../utils/ids.js';

export const isOwner = (emergency, user) => sameId(emergency.dispatcherId, user.id);

export const wasContacted = (emergency, hospitalId) =>
  hospitalId != null && emergency.contactedHospitalIds.some((id) => sameId(id, hospitalId));

export async function loadEmergency(id) {
  const emergency = await emergencyRepo.findById(id);
  if (!emergency) throw notFound('Emergency');
  return emergency;
}

/** Owner dispatcher, or admin when `allowAdmin`. Everyone else → 403. */
export async function loadManagedEmergency(id, user, { allowAdmin = false } = {}) {
  const emergency = await loadEmergency(id);
  const allowed = isOwner(emergency, user) || (allowAdmin && user.role === ROLES.ADMIN);
  if (!allowed) throw forbidden('You can only manage your own emergencies');
  return emergency;
}

/** Who may follow `emergency:<id>` over sockets. */
export async function canFollowEmergency(id, user) {
  const emergency = await emergencyRepo.findById(id);
  if (!emergency) return false;
  return user.role === ROLES.ADMIN || isOwner(emergency, user);
}
