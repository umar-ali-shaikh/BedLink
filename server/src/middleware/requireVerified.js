import { VERIFICATION_STATUS } from '../constants/hospital.js';
import { ROLES } from '../constants/roles.js';
import { AppError } from '../utils/AppError.js';

/** Ambulances must be verified by an admin before they can create emergencies or request beds. */
export function requireVerifiedAmbulance(req, _res, next) {
  if (req.user?.role === ROLES.DISPATCHER && req.user.verificationStatus !== VERIFICATION_STATUS.VERIFIED) {
    return next(new AppError('ACCOUNT_NOT_VERIFIED'));
  }
  return next();
}
