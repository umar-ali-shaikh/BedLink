import { HOSPITAL_STATUS, VERIFICATION_STATUS } from '../../constants/hospital.js';
import { ROLES } from '../../constants/roles.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { Hospital, User } from '../../models/index.js';
import { dispatcherRoom, hospitalRoom, roleRoom } from '../../sockets/rooms.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { idOf } from '../../utils/ids.js';
import { logger } from '../../utils/logger.js';
import { emit } from '../notification/index.js';

export const DECISIONS = Object.freeze({ VERIFY: 'VERIFY', REJECT: 'REJECT' });

/** Accounts created before verification existed have no field: they count as VERIFIED (schema default). */
const statusFilter = (status) => {
  if (!status || status === 'ALL') return {};
  if (status === VERIFICATION_STATUS.VERIFIED) return { verificationStatus: { $in: [status, null] } };
  return { verificationStatus: status };
};

/** Tell admins the queue changed, and the account itself that its status changed. */
export function emitVerificationUpdate({ kind, id, status, accountRoom }) {
  emit(SERVER_EVENTS.VERIFICATION_UPDATED, [roleRoom(ROLES.ADMIN), accountRoom], { kind, id, status });
}

/** Hospitals with their staff logins, newest first. */
export async function listHospitalVerifications({ status = VERIFICATION_STATUS.PENDING } = {}) {
  const hospitals = await Hospital.find(statusFilter(status)).sort({ createdAt: -1 }).limit(200);
  const staff = await User.find({ hospitalId: { $in: hospitals.map((h) => h._id) } }).select(
    'name email phone hospitalId'
  );
  return hospitals.map((h) => ({
    ...h.toJSON(),
    staff: staff
      .filter((u) => idOf(u.hospitalId) === idOf(h))
      .map((u) => ({ name: u.name, email: u.email, phone: u.phone })),
  }));
}

/** Ambulance (DISPATCHER) accounts, newest first. */
export async function listAmbulanceVerifications({ status = VERIFICATION_STATUS.PENDING } = {}) {
  const users = await User.find({ role: ROLES.DISPATCHER, ...statusFilter(status) })
    .sort({ createdAt: -1 })
    .limit(200);
  return users.map((u) => u.toJSON());
}

export async function verificationSummary() {
  const count = async (Model, extra = {}) =>
    Object.fromEntries(
      await Promise.all(
        Object.values(VERIFICATION_STATUS).map(async (s) => [
          s,
          await Model.countDocuments({ ...extra, verificationStatus: s }),
        ])
      )
    );
  const [hospitals, ambulances] = await Promise.all([count(Hospital), count(User, { role: ROLES.DISPATCHER })]);
  return { hospitals, ambulances };
}

function checkDecision(decision, note) {
  if (!Object.values(DECISIONS).includes(decision))
    throw new AppError('VALIDATION_ERROR', 'decision must be VERIFY or REJECT');
  if (decision === DECISIONS.REJECT && !note?.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Give a reason — the applicant sees it', undefined, [
      { path: 'note', message: 'Required when rejecting' },
    ]);
  }
}

/**
 * Verify → hospital ACTIVE and visible to ambulances. Reject → INACTIVE with the reason.
 * `actor` is the admin user (null from the CLI).
 */
export async function decideHospital(id, { decision, note }, actor = null) {
  checkDecision(decision, note);
  const verified = decision === DECISIONS.VERIFY;
  const status = verified ? VERIFICATION_STATUS.VERIFIED : VERIFICATION_STATUS.REJECTED;
  const hospital = await Hospital.findByIdAndUpdate(
    id,
    {
      $set: {
        verificationStatus: status,
        status: verified ? HOSPITAL_STATUS.ACTIVE : HOSPITAL_STATUS.INACTIVE,
        verifiedAt: verified ? new Date() : null,
        verifiedBy: actor?.id ?? null,
        verificationNote: note?.trim() || (verified ? 'Verified' : ''),
      },
    },
    { returnDocument: 'after' }
  );
  if (!hospital) throw notFound('Hospital');
  logger.info('verification.hospital', { hospitalId: id, status, by: actor?.id ?? 'cli' });
  emitVerificationUpdate({ kind: 'hospital', id: idOf(hospital), status, accountRoom: hospitalRoom(idOf(hospital)) });
  return hospital;
}

/** Verify → the ambulance can create emergencies. Reject → it stays blocked, sees the reason. */
export async function decideAmbulance(id, { decision, note }, actor = null) {
  checkDecision(decision, note);
  const verified = decision === DECISIONS.VERIFY;
  const status = verified ? VERIFICATION_STATUS.VERIFIED : VERIFICATION_STATUS.REJECTED;
  const user = await User.findOneAndUpdate(
    { _id: id, role: ROLES.DISPATCHER },
    {
      $set: {
        verificationStatus: status,
        verifiedAt: verified ? new Date() : null,
        verifiedBy: actor?.id ?? null,
        verificationNote: note?.trim() || (verified ? 'Verified' : ''),
      },
    },
    { returnDocument: 'after' }
  );
  if (!user) throw notFound('Ambulance');
  logger.info('verification.ambulance', { userId: id, status, by: actor?.id ?? 'cli' });
  emitVerificationUpdate({ kind: 'ambulance', id: idOf(user), status, accountRoom: dispatcherRoom(idOf(user)) });
  return user;
}
