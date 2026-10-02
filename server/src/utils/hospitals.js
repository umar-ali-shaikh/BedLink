/* eslint-disable no-console -- CLI tool: console output is the interface. */
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { HOSPITAL_STATUS, VERIFICATION_STATUS } from '../constants/hospital.js';
import '../models/index.js';
import { hospitalRepo } from '../repositories/hospitalRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { fromPoint } from './geo.js';

/**
 * Hospital verification desk (no admin UI needed):
 *   npm run hospitals                         → list PENDING registrations
 *   npm run hospitals -- list all|verified|rejected
 *   npm run hospitals -- show   <id|registrationNumber>
 *   npm run hospitals -- verify <id|registrationNumber> ["note"]
 *   npm run hospitals -- reject <id|registrationNumber> "reason shown to the hospital"
 *
 * Before verifying, check the registration number against the state Clinical Establishment
 * register / municipal licence, the HFR ID at https://facility.abdm.gov.in, and call the
 * official phone number. Verifying makes the hospital ACTIVE and visible to ambulances.
 */

const USAGE = `Usage:
  npm run hospitals [-- list [pending|verified|rejected|all]]
  npm run hospitals -- show   <id|registrationNumber>
  npm run hospitals -- verify <id|registrationNumber> ["note"]
  npm run hospitals -- reject <id|registrationNumber> "reason"`;

async function find(ref) {
  if (!ref) throw new Error(`Missing hospital id or registration number.\n${USAGE}`);
  const byId = mongoose.isValidObjectId(ref) ? await hospitalRepo.findById(ref) : null;
  const hospital = byId ?? (await hospitalRepo.findOne({ registrationNumber: ref.toUpperCase() }));
  if (!hospital) throw new Error(`No hospital found for "${ref}"`);
  return hospital;
}

async function describe(h) {
  const staff = await userRepo.findHospitalStaff(h._id);
  const at = fromPoint(h.location);
  return [
    `${h.name}  [${h.verificationStatus}]  id=${h._id}`,
    `  Registration no.: ${h.registrationNumber ?? '—'}    HFR ID: ${h.hfrId ?? '—'}`,
    `  Address: ${h.address}   (${at.lat}, ${at.lng})  https://www.openstreetmap.org/?mlat=${at.lat}&mlon=${at.lng}#map=17/${at.lat}/${at.lng}`,
    `  Official phone: ${h.phone || '—'}   email: ${h.email || '—'}`,
    `  Contact: ${h.contactName || '—'}  login: ${staff.map((u) => u.email).join(', ') || '—'}`,
    `  Specialties: ${h.specialties.join(', ') || '—'}   Registered: ${h.createdAt?.toISOString()}`,
    h.verificationNote ? `  Note: ${h.verificationNote}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

async function list(which = 'pending') {
  const filter = which === 'all' ? {} : { verificationStatus: which.toUpperCase() };
  if (which !== 'all' && !Object.values(VERIFICATION_STATUS).includes(filter.verificationStatus)) {
    throw new Error(USAGE);
  }
  const hospitals = await hospitalRepo.list(filter);
  if (!hospitals.length) return console.log(`No ${which} hospitals.`);
  for (const h of hospitals) console.log(`\n${await describe(h)}`);
  console.log(`\n${hospitals.length} hospital(s).`);
}

async function setStatus(ref, verificationStatus, note) {
  const hospital = await find(ref);
  const verified = verificationStatus === VERIFICATION_STATUS.VERIFIED;
  const updated = await hospitalRepo.updateById(hospital._id, {
    $set: {
      verificationStatus,
      status: verified ? HOSPITAL_STATUS.ACTIVE : HOSPITAL_STATUS.INACTIVE,
      verifiedAt: verified ? new Date() : null,
      verificationNote: note ?? '',
    },
  });
  console.log(`\n${await describe(updated)}\n\n${verified ? 'Verified — now visible to ambulances.' : 'Rejected.'}`);
}

export async function run([command = 'list', ref, ...rest]) {
  switch (command) {
    case 'list':
      return list(ref);
    case 'show':
      return console.log(await describe(await find(ref)));
    case 'verify':
      return setStatus(ref, VERIFICATION_STATUS.VERIFIED, rest.join(' ') || 'Verified');
    case 'reject':
      if (!rest.length) throw new Error('Give a reason — the hospital sees it.\n' + USAGE);
      return setStatus(ref, VERIFICATION_STATUS.REJECTED, rest.join(' '));
    default:
      throw new Error(USAGE);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  connectDB()
    .then(() => run(process.argv.slice(2)))
    .catch((err) => {
      console.error(`\n${err.message}\n`);
      process.exitCode = 1;
    })
    .finally(() => disconnectDB().catch(() => {}));
}
