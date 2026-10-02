/* eslint-disable no-console -- CLI tool: console output is the interface. */
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { connectDB, disconnectDB } from '../config/db.js';
import { VERIFICATION_STATUS } from '../constants/hospital.js';
import { ROLES } from '../constants/roles.js';
import { Hospital, User } from '../models/index.js';
import { DECISIONS, decideAmbulance, decideHospital } from '../services/verification/index.js';
import { fromPoint } from './geo.js';

/**
 * Verification desk on the command line (same rules as the admin panel):
 *   npm run hospitals                                  → pending hospitals
 *   npm run hospitals -- list [pending|verified|rejected|all]
 *   npm run hospitals -- show   <id|registrationNumber>
 *   npm run hospitals -- verify <id|registrationNumber> ["note"]
 *   npm run hospitals -- reject <id|registrationNumber> "reason"
 *   npm run hospitals -- ambulances [pending|verified|rejected|all]
 *   npm run hospitals -- verify-ambulance <id|vehicleNumber|email> ["note"]
 *   npm run hospitals -- reject-ambulance <id|vehicleNumber|email> "reason"
 */
const USAGE = `Usage:
  npm run hospitals [-- list [pending|verified|rejected|all]]
  npm run hospitals -- show   <id|registrationNumber>
  npm run hospitals -- verify <id|registrationNumber> ["note"]
  npm run hospitals -- reject <id|registrationNumber> "reason"
  npm run hospitals -- ambulances [pending|verified|rejected|all]
  npm run hospitals -- verify-ambulance <id|vehicleNumber|email> ["note"]
  npm run hospitals -- reject-ambulance <id|vehicleNumber|email> "reason"`;

async function findHospital(ref) {
  if (!ref) throw new Error(`Missing hospital id or registration number.\n${USAGE}`);
  const hospital =
    (mongoose.isValidObjectId(ref) ? await Hospital.findById(ref) : null) ??
    (await Hospital.findOne({ registrationNumber: ref.toUpperCase() }));
  if (!hospital) throw new Error(`No hospital found for "${ref}"`);
  return hospital;
}

async function findAmbulance(ref) {
  if (!ref) throw new Error(`Missing ambulance id, vehicle number or email.\n${USAGE}`);
  const base = { role: ROLES.DISPATCHER };
  const user =
    (mongoose.isValidObjectId(ref) ? await User.findOne({ ...base, _id: ref }) : null) ??
    (await User.findOne({ ...base, 'ambulance.vehicleNumber': ref.replace(/[\s-]/g, '').toUpperCase() })) ??
    (await User.findOne({ ...base, email: ref.toLowerCase() }));
  if (!user) throw new Error(`No ambulance found for "${ref}"`);
  return user;
}

async function describeHospital(h) {
  const staff = await User.find({ hospitalId: h._id });
  const at = fromPoint(h.location);
  return [
    `${h.name}  [${h.verificationStatus}]  id=${h._id}`,
    `  Registration no.: ${h.registrationNumber ?? '—'}    HFR ID: ${h.hfrId ?? '—'}`,
    `  Address: ${h.address}   (${at.lat}, ${at.lng})  https://www.openstreetmap.org/?mlat=${at.lat}&mlon=${at.lng}#map=17/${at.lat}/${at.lng}`,
    `  Official phone: ${h.phone || '—'}   email: ${h.email || '—'}`,
    `  Contact: ${h.contactName || '—'}  login: ${staff.map((u) => u.email).join(', ') || '—'}`,
    `  Registered: ${h.createdAt?.toISOString()}${h.verificationNote ? `   Note: ${h.verificationNote}` : ''}`,
  ].join('\n');
}

const describeAmbulance = (u) =>
  [
    `${u.name}  [${u.verificationStatus}]  id=${u._id}`,
    `  Vehicle: ${u.ambulance?.vehicleNumber ?? '—'} (${u.ambulance?.ambulanceType ?? '—'})   Organisation: ${u.ambulance?.organization || '—'}`,
    `  Phone: ${u.phone || '—'}   email: ${u.email}   Registered: ${u.createdAt?.toISOString()}`,
    u.verificationNote ? `  Note: ${u.verificationNote}` : null,
  ]
    .filter(Boolean)
    .join('\n');

function statusFilter(which = 'pending') {
  if (which === 'all') return {};
  const status = which.toUpperCase();
  if (!Object.values(VERIFICATION_STATUS).includes(status)) throw new Error(USAGE);
  return { verificationStatus: status };
}

async function listHospitals(which) {
  const hospitals = await Hospital.find(statusFilter(which)).sort({ createdAt: -1 });
  for (const h of hospitals) console.log(`\n${await describeHospital(h)}`);
  console.log(`\n${hospitals.length} hospital(s).`);
}

async function listAmbulances(which) {
  const users = await User.find({ role: ROLES.DISPATCHER, ...statusFilter(which) }).sort({ createdAt: -1 });
  for (const u of users) console.log(`\n${describeAmbulance(u)}`);
  console.log(`\n${users.length} ambulance(s).`);
}

const noteOf = (rest, fallback) => rest.join(' ') || fallback;

export async function run([command = 'list', ref, ...rest]) {
  switch (command) {
    case 'list':
      return listHospitals(ref);
    case 'show':
      return console.log(await describeHospital(await findHospital(ref)));
    case 'verify': {
      const h = await decideHospital((await findHospital(ref))._id, {
        decision: DECISIONS.VERIFY,
        note: noteOf(rest, 'Verified'),
      });
      return console.log(`\n${await describeHospital(h)}\n\nVerified — now visible to ambulances.`);
    }
    case 'reject': {
      if (!rest.length) throw new Error(`Give a reason — the hospital sees it.\n${USAGE}`);
      const h = await decideHospital((await findHospital(ref))._id, { decision: DECISIONS.REJECT, note: noteOf(rest) });
      return console.log(`\n${await describeHospital(h)}\n\nRejected.`);
    }
    case 'ambulances':
      return listAmbulances(ref);
    case 'verify-ambulance': {
      const u = await decideAmbulance((await findAmbulance(ref))._id, {
        decision: DECISIONS.VERIFY,
        note: noteOf(rest, 'Verified'),
      });
      return console.log(`\n${describeAmbulance(u)}\n\nVerified — can now request beds.`);
    }
    case 'reject-ambulance': {
      if (!rest.length) throw new Error(`Give a reason — the ambulance crew sees it.\n${USAGE}`);
      const u = await decideAmbulance((await findAmbulance(ref))._id, {
        decision: DECISIONS.REJECT,
        note: noteOf(rest),
      });
      return console.log(`\n${describeAmbulance(u)}\n\nRejected.`);
    }
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
