import { ROLES } from '../constants/roles.js';
import { forbidden } from '../utils/AppError.js';
import { sameId } from '../utils/ids.js';

/** HOSPITAL users may only touch their own hospital; other roles pass (route RBAC decides). */
export function assertHospitalScope(user, hospitalId) {
  if (user.role === ROLES.HOSPITAL && !sameId(user.hospitalId, hospitalId)) {
    throw forbidden('You can only access your own hospital');
  }
}

export const isAdmin = (user) => user.role === ROLES.ADMIN;
