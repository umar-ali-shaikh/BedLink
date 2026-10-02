import { HOSPITAL_STATUS } from '../../src/constants/hospital.js';
import { ROLES } from '../../src/constants/roles.js';
import { DEMO_PASSWORDS, SEED_HOSPITALS, SEED_USERS } from './seedData.js';
import * as models from '../../src/models/index.js';
import { hashPassword } from '../../src/services/auth/password.js';
import { toPoint } from '../../src/utils/geo.js';

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
