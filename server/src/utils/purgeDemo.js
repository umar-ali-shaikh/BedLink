/* eslint-disable no-console -- CLI output is the interface. */
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { ROLES } from '../constants/roles.js';
import {
  Bed,
  EmergencyRequest,
  EmergencyTimeline,
  Hospital,
  HospitalRequest,
  Notification,
  Reservation,
  User,
} from '../models/index.js';
import { logger } from './logger.js';

const DEMO_EMAIL = /@bedlink\.demo$/i;

/** Names of the sample hospitals older versions loaded (they never had a registration number). */
const SAMPLE_HOSPITAL_NAMES = [
  'Lakeside Medical Centre',
  'City General Hospital',
  'Eastwood Medical',
  'Greenfield Care Hospital',
  'Sunrise Hospital',
  'Harbourview Hospital',
  'St. Aurora Heart Institute',
  'Westbay Community Hospital',
  'Hilltop Neuro Clinic',
  'Riverside Burns & Trauma Centre',
  'Northgate Hospital',
  'Far Coast Hospital',
];

/**
 * Remove the seeded demo dataset from a database, keeping everything real:
 *   - users with an `@bedlink.demo` email
 *   - the seeded hospitals (seed names, and no registration number — real sign-ups always have one)
 *   - their beds, offers, reservations, notifications, and the demo users' emergencies + timelines
 * A demo ADMIN is kept unless ADMIN_EMAIL points at a different (real) admin, so the
 * verification desk never ends up without a login. Idempotent: safe to run on every boot.
 */
export async function purgeDemoData() {
  const realAdmin = env.ADMIN_EMAIL && !DEMO_EMAIL.test(env.ADMIN_EMAIL);
  const userFilter = { email: DEMO_EMAIL, ...(realAdmin ? {} : { role: { $ne: ROLES.ADMIN } }) };
  const hospitalFilter = {
    name: { $in: SAMPLE_HOSPITAL_NAMES },
    $or: [{ registrationNumber: { $exists: false } }, { registrationNumber: null }],
  };

  const [users, hospitals] = await Promise.all([
    User.find(userFilter).select('_id'),
    Hospital.find(hospitalFilter).select('_id'),
  ]);
  const userIds = users.map((u) => u._id);
  const hospitalIds = hospitals.map((h) => h._id);
  if (!userIds.length && !hospitalIds.length) return { users: 0, hospitals: 0 };

  const emergencies = await EmergencyRequest.find({ dispatcherId: { $in: userIds } }).select('_id');
  const emergencyIds = emergencies.map((e) => e._id);
  const byHospitalOrEmergency = { $or: [{ hospitalId: { $in: hospitalIds } }, { emergencyId: { $in: emergencyIds } }] };

  const results = await Promise.all([
    Bed.deleteMany({ hospitalId: { $in: hospitalIds } }),
    HospitalRequest.deleteMany(byHospitalOrEmergency),
    Reservation.deleteMany({ $or: [{ hospitalId: { $in: hospitalIds } }, { requestId: { $in: emergencyIds } }] }),
    EmergencyTimeline.deleteMany({ emergencyId: { $in: emergencyIds } }),
    Notification.deleteMany({ $or: [{ userId: { $in: userIds } }, { hospitalId: { $in: hospitalIds } }] }),
    EmergencyRequest.deleteMany({ _id: { $in: emergencyIds } }),
    User.deleteMany({ $or: [{ _id: { $in: userIds } }, { hospitalId: { $in: hospitalIds } }] }),
    Hospital.deleteMany({ _id: { $in: hospitalIds } }),
  ]);
  const counts = {
    users: results[6].deletedCount,
    hospitals: results[7].deletedCount,
    beds: results[0].deletedCount,
    emergencies: results[5].deletedCount,
    offers: results[1].deletedCount,
    reservations: results[2].deletedCount,
  };
  logger.info('demo.purged', { ...counts, keptDemoAdmin: !realAdmin });
  return counts;
}

/** `npm run demo:purge` */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  connectDB()
    .then(purgeDemoData)
    .then((counts) => console.log('\nRemoved demo data:', counts, '\n'))
    .catch((err) => {
      console.error(`\n${err.message}\n`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDB().catch(() => {}));
}
