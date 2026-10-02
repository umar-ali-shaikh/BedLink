import { env } from '../../config/env.js';
import { DUPLICATE_HOSPITAL_RADIUS_METERS, HOSPITAL_STATUS, VERIFICATION_STATUS } from '../../constants/hospital.js';
import { ROLES } from '../../constants/roles.js';
import { hospitalRepo } from '../../repositories/hospitalRepo.js';
import { userRepo } from '../../repositories/userRepo.js';
import { AppError } from '../../utils/AppError.js';
import { toPoint } from '../../utils/geo.js';
import { logger } from '../../utils/logger.js';
import { describeUser, toAuthUser } from './index.js';
import { hashPassword } from './password.js';
import { signToken } from './token.js';

const duplicate = (path, message) => new AppError('DUPLICATE_RESOURCE', message, undefined, [{ path, message }]);

function assertEnabled() {
  if (!env.REGISTRATION_ENABLED) throw new AppError('FORBIDDEN', 'Registration is closed. Contact the BedLink team.');
}

async function session(userDoc) {
  const authUser = toAuthUser(userDoc);
  return { token: signToken(authUser), user: await describeUser(authUser) };
}

/** Mongo duplicate-key → the field-level 409 the forms can show. */
function mapDuplicateKey(err) {
  if (err?.code !== 11000) return err;
  const key = Object.keys(err.keyPattern ?? {})[0] ?? '';
  if (key === 'email') return duplicate('email', 'An account with this email already exists');
  if (key.includes('vehicleNumber')) return duplicate('vehicleNumber', 'This ambulance is already registered');
  if (key === 'registrationNumber')
    return duplicate('hospital.registrationNumber', 'This registration number is already registered');
  if (key === 'hfrId') return duplicate('hospital.hfrId', 'This Health Facility ID is already registered');
  return new AppError('DUPLICATE_RESOURCE');
}

/**
 * Ambulance crew self-registration → active DISPATCHER account, signed in.
 * Vehicle numbers are unique so one ambulance can't register twice.
 */
export async function registerAmbulance({ name, email, password, phone, vehicleNumber, ambulanceType, organization }) {
  assertEnabled();
  if (await userRepo.existsByEmail(email)) throw duplicate('email', 'An account with this email already exists');
  if (await userRepo.existsByVehicle(vehicleNumber))
    throw duplicate('vehicleNumber', 'This ambulance is already registered');

  try {
    const user = await userRepo.create({
      name,
      email,
      phone,
      role: ROLES.DISPATCHER,
      passwordHash: await hashPassword(password),
      ambulance: { vehicleNumber, ambulanceType, organization: organization ?? '' },
    });
    logger.info('register.ambulance', { userId: user._id.toString() });
    return session(user);
  } catch (err) {
    throw mapDuplicateKey(err);
  }
}

/**
 * Hospital self-registration. Automatic checks: field formats (validator), unique
 * registration number / HFR ID / emails, and no same-named hospital within 1 km. The
 * hospital starts PENDING + INACTIVE — invisible to matching — until verified
 * (`npm run hospitals -- verify <id>`), unless HOSPITAL_AUTO_VERIFY=true.
 * The contact person gets a HOSPITAL account right away so they can set up beds.
 */
export async function registerHospital({ hospital, contact }) {
  assertEnabled();
  if (await userRepo.existsByEmail(contact.email))
    throw duplicate('contact.email', 'An account with this email already exists');
  if (await hospitalRepo.existsBy({ registrationNumber: hospital.registrationNumber })) {
    throw duplicate('hospital.registrationNumber', 'This registration number is already registered');
  }
  if (hospital.hfrId && (await hospitalRepo.existsBy({ hfrId: hospital.hfrId }))) {
    throw duplicate('hospital.hfrId', 'This Health Facility ID is already registered');
  }
  const twin = await hospitalRepo.findNamedNear({
    name: hospital.name,
    point: hospital.coordinates,
    meters: DUPLICATE_HOSPITAL_RADIUS_METERS,
  });
  if (twin) throw duplicate('hospital.name', 'A hospital with this name is already registered at this location');

  const verified = env.HOSPITAL_AUTO_VERIFY;
  const { coordinates, ...fields } = hospital;
  let created;
  try {
    created = await hospitalRepo.create({
      ...fields,
      location: toPoint(coordinates),
      contactName: contact.name,
      status: verified ? HOSPITAL_STATUS.ACTIVE : HOSPITAL_STATUS.INACTIVE,
      verificationStatus: verified ? VERIFICATION_STATUS.VERIFIED : VERIFICATION_STATUS.PENDING,
      verifiedAt: verified ? new Date() : null,
      verificationNote: verified ? 'Automatically verified (HOSPITAL_AUTO_VERIFY)' : '',
    });
    const user = await userRepo.create({
      name: contact.name,
      email: contact.email,
      phone: hospital.phone,
      role: ROLES.HOSPITAL,
      hospitalId: created._id,
      passwordHash: await hashPassword(contact.password),
    });
    logger.info('register.hospital', { hospitalId: created._id.toString(), verified });
    return session(user);
  } catch (err) {
    // No orphan hospital if the account could not be created.
    if (created) await hospitalRepo.deleteById(created._id).catch(() => {});
    throw mapDuplicateKey(err);
  }
}
