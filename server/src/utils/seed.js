import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB, ensureIndexes } from '../config/db.js';
import { HOSPITAL_STATUS } from '../constants/hospital.js';
import { ROLES } from '../constants/roles.js';
import { DEMO_PASSWORDS, SEED_HOSPITALS, SEED_USERS } from '../constants/seedData.js';
import * as models from '../models/index.js';
import { hashPassword } from '../services/auth/password.js';
import { toPoint } from './geo.js';
import { errorMeta, logger } from './logger.js';

const pad = (n) => String(n).padStart(2, '0');

/** Expand bed groups into documents with per-kind labels (ICU-01, ICU-02, CCU-01, …). */
function bedDocs(hospitalId, groups) {
  const counters = {};
  return groups.flatMap(({ prefix, type, equipment, statuses }) =>
    statuses.map((status) => {
      counters[prefix] = (counters[prefix] ?? 0) + 1;
      return { hospitalId, label: `${prefix}-${pad(counters[prefix])}`, type, equipment, status };
    })
  );
}

/**
 * Wipe every collection and load the demo dataset. `now` is injectable so tests get
 * deterministic freshness.
 */
export async function seedDatabase({ now = new Date() } = {}) {
  await Promise.all(Object.values(models).map((model) => model.deleteMany({})));

  const hashes = Object.fromEntries(
    await Promise.all(Object.entries(DEMO_PASSWORDS).map(async ([role, pw]) => [role, await hashPassword(pw)]))
  );

  const hospitals = {};
  for (const spec of SEED_HOSPITALS) {
    const confirmedAt = new Date(now.getTime() - spec.availabilityAgeMinutes * 60_000);
    const hospital = await models.Hospital.create({
      name: spec.name,
      address: spec.address,
      location: toPoint(spec.coordinates),
      specialties: spec.specialties,
      currentLoad: spec.currentLoad,
      status: spec.status ?? HOSPITAL_STATUS.ACTIVE,
      lastAvailabilityUpdate: confirmedAt,
    });
    await models.Bed.insertMany(bedDocs(hospital._id, spec.beds));
    // Backdate freshness without Mongoose bumping updatedAt again.
    await models.Bed.updateMany(
      { hospitalId: hospital._id },
      { $set: { updatedAt: confirmedAt } },
      { timestamps: false }
    );
    hospitals[spec.slug] = hospital;
  }

  const users = [
    ...SEED_USERS.map((u) => ({ ...u, passwordHash: hashes[u.role] })),
    ...SEED_HOSPITALS.map((spec) => ({
      name: `${spec.name} Staff`,
      email: `${spec.slug}@bedlink.demo`,
      role: ROLES.HOSPITAL,
      hospitalId: hospitals[spec.slug]._id,
      passwordHash: hashes.HOSPITAL,
    })),
  ];
  await models.User.insertMany(users);

  return {
    hospitals,
    counts: {
      hospitals: SEED_HOSPITALS.length,
      beds: await models.Bed.countDocuments(),
      users: users.length,
    },
  };
}

/** `npm run seed` */
async function main() {
  const started = Date.now();
  await connectDB();
  await ensureIndexes();
  const { counts } = await seedDatabase();
  logger.info('seed.done', { ...counts, ms: Date.now() - started });
  console.log(`\nSeeded ${counts.hospitals} hospitals, ${counts.beds} beds, ${counts.users} users.`);
  console.log(`Admin: admin@bedlink.demo / ${DEMO_PASSWORDS.ADMIN}`);
  console.log(`Dispatchers: dispatcher1@bedlink.demo, dispatcher2@bedlink.demo / ${DEMO_PASSWORDS.DISPATCHER}`);
  console.log(`Hospitals: <slug>@bedlink.demo (e.g. lakeside@bedlink.demo) / ${DEMO_PASSWORDS.HOSPITAL}\n`);
  await disconnectDB();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(async (err) => {
    logger.error('seed.failed', errorMeta(err));
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
}
