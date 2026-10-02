import { userRepo } from '../../repositories/userRepo.js';
import { idOf } from '../../utils/ids.js';

/**
 * Who is coming, as a hospital sees it (RULES.md §6): vehicle, driver, organisation and the
 * crew phone to call. Never ids, emails or the licence number. Only built for offers sent to
 * that hospital.
 */
export function crewView(user) {
  const a = user?.ambulance;
  if (!a?.vehicleNumber) return null;
  return {
    vehicleNumber: a.vehicleNumber,
    ambulanceType: a.ambulanceType,
    organization: a.organization || '',
    driverName: a.driverName || '',
    phone: user.phone || '',
  };
}

/** `Map(userId → crewView)` for a set of ambulance accounts, in one query. */
export async function loadCrewViews(userIds) {
  const ids = [...new Set(userIds.filter(Boolean).map(idOf))];
  if (!ids.length) return new Map();
  const users = await userRepo.findByIds(ids);
  return new Map(users.map((u) => [idOf(u), crewView(u)]));
}
