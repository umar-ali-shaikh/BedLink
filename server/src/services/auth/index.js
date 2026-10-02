import mongoose from 'mongoose';
import { ROLES } from '../../constants/roles.js';
import { hospitalRepo } from '../../repositories/hospitalRepo.js';
import { userRepo } from '../../repositories/userRepo.js';
import { AppError } from '../../utils/AppError.js';
import { burnPasswordCheck, verifyPassword } from './password.js';
import { signToken, verifyToken } from './token.js';

/** The request-scoped user shape (`req.user`, `socket.data.user`). */
export function toAuthUser(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    hospitalId: doc.hospitalId ? doc.hospitalId.toString() : null,
  };
}

/** Same response for unknown email, wrong password and inactive user (RULES.md §5). */
export async function login({ email, password }) {
  const user = await userRepo.findByEmailWithPassword(email);
  if (!user) {
    await burnPasswordCheck(password);
    throw new AppError('INVALID_CREDENTIALS');
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid || !user.isActive) throw new AppError('INVALID_CREDENTIALS');

  const authUser = toAuthUser(user);
  return { token: signToken(authUser), user: await describeUser(authUser) };
}

/**
 * Resolve a token to an active user, re-loading role and hospital from the DB
 * (never trusting the token alone). Returns null when not authenticated.
 */
export async function resolveToken(token) {
  const payload = verifyToken(token);
  if (!payload?.sub || !mongoose.isValidObjectId(payload.sub)) return null;
  const user = await userRepo.findById(payload.sub);
  if (!user || !user.isActive) return null;
  return toAuthUser(user);
}

/** `/auth/me` payload: the user plus a hospital summary for HOSPITAL users. */
export async function describeUser(authUser) {
  const result = { ...authUser, hospital: null, ambulance: null };
  if (authUser.role === ROLES.HOSPITAL && authUser.hospitalId) {
    const hospital = await hospitalRepo.findById(authUser.hospitalId);
    if (hospital) {
      result.hospital = {
        id: hospital._id.toString(),
        name: hospital.name,
        status: hospital.status,
        verificationStatus: hospital.verificationStatus,
        verificationNote: hospital.verificationNote,
        registrationNumber: hospital.registrationNumber ?? null,
      };
    }
  }
  if (authUser.role === ROLES.DISPATCHER) {
    const user = await userRepo.findById(authUser.id);
    const a = user?.ambulance;
    if (a?.vehicleNumber) {
      result.ambulance = {
        vehicleNumber: a.vehicleNumber,
        ambulanceType: a.ambulanceType,
        organization: a.organization,
      };
    }
  }
  return result;
}
