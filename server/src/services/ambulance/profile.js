import { userRepo } from '../../repositories/userRepo.js';
import { notFound } from '../../utils/AppError.js';
import { describeUser } from '../auth/index.js';

/**
 * `PATCH /api/ambulance/profile`. Only the phone and the organisation are editable; the
 * vehicle, driver and licence are what the admin verified and stay read-only.
 */
export async function updateAmbulanceProfile(user, { phone, organization }) {
  const set = {};
  if (phone !== undefined) set.phone = phone;
  if (organization !== undefined) set['ambulance.organization'] = organization;
  const updated = await userRepo.updateById(user.id, { $set: set });
  if (!updated) throw notFound('Ambulance');
  return describeUser({ ...user });
}
