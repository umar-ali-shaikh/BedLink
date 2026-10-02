import { UNVERIFIED_STATUSES } from '../../constants/hospital.js';
import { ROLES } from '../../constants/roles.js';
import { hospitalRepo } from '../../repositories/hospitalRepo.js';
import { forbidden, notFound } from '../../utils/AppError.js';
import { toPoint } from '../../utils/geo.js';
import { assertHospitalScope } from '../access.js';
import { summariesFor, summaryFor } from '../bed/summary.js';
import { estimate, matchingConfig } from '../matching/index.js';

/** Fields a HOSPITAL user may change on their own hospital. */
const HOSPITAL_EDITABLE = new Set(['currentLoad', 'specialties', 'phone', 'contactName']);

const withSummary = (hospital, summary) => ({ ...hospital.toJSON(), bedSummary: summary });

function toUpdate(changes) {
  const { coordinates, ...rest } = changes;
  return coordinates ? { ...rest, location: toPoint(coordinates) } : rest;
}

/** Ambulances only see verified hospitals; admins see everything (incl. pending). */
export async function listHospitals({ status } = {}, user) {
  const filter = status ? { status } : {};
  if (user?.role !== ROLES.ADMIN) filter.verificationStatus = { $nin: [...UNVERIFIED_STATUSES] };
  const hospitals = await hospitalRepo.list(filter);
  const summaries = await summariesFor(hospitals);
  return hospitals.map((h) => withSummary(h, summaries.get(h._id.toString())));
}

/** Map markers sorted by distance, with the same ETA estimate matching uses. */
export async function nearbyHospitals({ lat, lng, radiusKm }) {
  const config = matchingConfig();
  const docs = await hospitalRepo.findNear({ point: { lat, lng }, radiusKm: radiusKm ?? config.maxRadiusKm });
  const hospitals = docs.map((d) => hospitalRepo.hydrate(d));
  const summaries = await summariesFor(hospitals);
  return hospitals.map((h, i) => {
    const json = withSummary(h, summaries.get(h._id.toString()));
    return {
      ...json,
      ...estimate({ lat, lng }, json.coordinates, config),
      straightLineKm: Math.round(docs[i].distanceMeters / 100) / 10,
    };
  });
}

export async function getHospital(id, user) {
  assertHospitalScope(user, id);
  const hospital = await hospitalRepo.findById(id);
  if (!hospital) throw notFound('Hospital');
  return withSummary(hospital, await summaryFor(hospital));
}

export async function createHospital(data) {
  const hospital = await hospitalRepo.create(toUpdate(data));
  return withSummary(hospital, await summaryFor(hospital));
}

/** ADMIN may change everything; HOSPITAL only `currentLoad` of its own hospital. */
export async function updateHospital(id, changes, user) {
  if (user.role === ROLES.HOSPITAL) {
    assertHospitalScope(user, id);
    const blocked = Object.keys(changes).filter((k) => !HOSPITAL_EDITABLE.has(k));
    if (blocked.length) throw forbidden(`Hospital staff can only update: ${[...HOSPITAL_EDITABLE].join(', ')}`);
  }
  const hospital = await hospitalRepo.updateById(id, { $set: toUpdate(changes) });
  if (!hospital) throw notFound('Hospital');
  return withSummary(hospital, await summaryFor(hospital));
}
