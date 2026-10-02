import mongoose from 'mongoose';
import { ROLES } from '../../constants/roles.js';
import { hospitalRepo } from '../../repositories/hospitalRepo.js';
import { userRepo } from '../../repositories/userRepo.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { hashPassword } from '../auth/password.js';

/** Enforce "hospitalId required iff role = HOSPITAL" and that the hospital exists. */
async function resolveHospitalId(role, hospitalId) {
  if (role !== ROLES.HOSPITAL) return null;
  if (!hospitalId) {
    throw new AppError('VALIDATION_ERROR', 'hospitalId is required for HOSPITAL users', 400, [
      { path: 'hospitalId', message: 'Required when role is HOSPITAL' },
    ]);
  }
  if (!(await hospitalRepo.exists(hospitalId))) throw notFound('Hospital');
  return new mongoose.Types.ObjectId(hospitalId);
}

export const listUsers = ({ role } = {}) => userRepo.list(role ? { role } : {});

export async function createUser({ name, email, password, role, hospitalId }) {
  if (await userRepo.existsByEmail(email)) {
    throw new AppError('DUPLICATE_RESOURCE', 'A user with this email already exists');
  }
  return userRepo.create({
    name,
    email,
    role,
    passwordHash: await hashPassword(password),
    hospitalId: await resolveHospitalId(role, hospitalId),
  });
}

export async function updateUser(id, changes) {
  const user = await userRepo.findById(id);
  if (!user) throw notFound('User');

  const role = changes.role ?? user.role;
  const update = {};
  if (changes.name !== undefined) update.name = changes.name;
  if (changes.isActive !== undefined) update.isActive = changes.isActive;
  if (changes.password !== undefined) update.passwordHash = await hashPassword(changes.password);
  if (changes.role !== undefined || changes.hospitalId !== undefined) {
    update.role = role;
    const requested = changes.hospitalId !== undefined ? changes.hospitalId : user.hospitalId?.toString();
    update.hospitalId = await resolveHospitalId(role, requested);
  }
  return userRepo.updateById(id, { $set: update });
}
