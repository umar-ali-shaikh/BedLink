import { ROLES } from '../../constants/roles.js';
import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { bedRepo } from '../../repositories/bedRepo.js';
import { hospitalRepo } from '../../repositories/hospitalRepo.js';
import { hospitalRoom, roleRoom } from '../../sockets/rooms.js';
import { AppError, notFound } from '../../utils/AppError.js';
import { idOf } from '../../utils/ids.js';
import { assertHospitalScope } from '../access.js';
import { emit } from '../notification/index.js';
import { summaryFor } from './summary.js';

async function loadHospital(hospitalId) {
  const hospital = await hospitalRepo.findById(hospitalId);
  if (!hospital) throw notFound('Hospital');
  return hospital;
}

/**
 * Refresh the hospital's freshness and broadcast `bed:updated` with the new summary.
 * Used by the bed and reservation services. `bed` may be null for "Confirm all".
 */
export async function publishBedChange(hospitalId, bed, extra = {}) {
  const at = bed?.updatedAt ?? new Date();
  await hospitalRepo.touchAvailability(hospitalId, at);
  const hospital = await hospitalRepo.findById(hospitalId);
  const summary = hospital ? await summaryFor(hospital) : null;
  emit(SERVER_EVENTS.BED_UPDATED, [roleRoom(ROLES.DISPATCHER), roleRoom(ROLES.ADMIN), hospitalRoom(hospitalId)], {
    bedId: bed ? idOf(bed) : null,
    hospitalId: idOf(hospitalId),
    label: bed?.label ?? null,
    type: bed?.type ?? null,
    equipment: bed?.equipment ?? null,
    status: bed?.status ?? null,
    updatedAt: at,
    summary,
    ...extra,
  });
  return summary;
}

export async function listBeds(hospitalId, user) {
  assertHospitalScope(user, hospitalId);
  await loadHospital(hospitalId);
  return bedRepo.listByHospital(hospitalId);
}

export async function createBed(hospitalId, data, user) {
  await loadHospital(hospitalId);
  let bed;
  try {
    bed = await bedRepo.create({ ...data, hospitalId, lastUpdatedBy: user.id });
  } catch (err) {
    if (err?.code === 11000) throw new AppError('DUPLICATE_RESOURCE', `A bed labelled "${data.label}" already exists`);
    throw err;
  }
  await publishBedChange(hospitalId, bed);
  return bed;
}

/**
 * Staff status change (ARCHITECTURE.md §7.1). A RESERVED bed can't be changed here and
 * RESERVED can't be set here (the validator only allows staff statuses).
 */
export async function updateBedStatus(bedId, status, user) {
  const existing = await bedRepo.findById(bedId);
  if (!existing) throw notFound('Bed');
  assertHospitalScope(user, existing.hospitalId);

  const bed = await bedRepo.setStaffStatus(bedId, status, user.id);
  if (!bed) {
    throw new AppError('INVALID_STATE_TRANSITION', 'A reserved bed can only be changed by its reservation');
  }
  await publishBedChange(bed.hospitalId, bed);
  return bed;
}

/** "Confirm all": refresh freshness of every non-reserved bed without changing statuses. */
export async function confirmAllBeds(hospitalId, user) {
  assertHospitalScope(user, hospitalId);
  await loadHospital(hospitalId);
  const result = await bedRepo.confirmAll(hospitalId, user.id);
  const summary = await publishBedChange(hospitalId, null, { confirmed: result.modifiedCount });
  return { confirmed: result.modifiedCount, summary };
}
