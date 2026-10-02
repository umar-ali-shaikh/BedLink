import { VERIFICATION_STATUS } from '../constants/hospital.js';
import { ROLES } from '../constants/roles.js';
import { User } from '../models/index.js';

export const userRepo = {
  findById: (id) => User.findById(id),
  findByEmailWithPassword: (email) => User.findOne({ email: email.toLowerCase() }).select('+passwordHash'),
  existsByEmail: (email) => User.exists({ email: email.toLowerCase() }),
  existsByVehicle: (vehicleNumber) => User.exists({ 'ambulance.vehicleNumber': vehicleNumber }),
  existsByLicence: (licenceNumber) => User.exists({ 'ambulance.licenceNumber': licenceNumber }),
  findByIds: (ids) => User.find({ _id: { $in: ids } }),
  list: (filter = {}) => User.find(filter).sort({ role: 1, name: 1 }),
  create: (data) => User.create(data),
  updateById: (id, update) => User.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: false }),
  setOnDuty: (id, onDuty) =>
    User.findOneAndUpdate(
      { _id: id, role: ROLES.DISPATCHER },
      { $set: { 'ambulance.onDuty': onDuty } },
      { returnDocument: 'after' }
    ),
  /**
   * Store an on-duty ambulance's position unless one was stored after `notAfter` (server-side
   * throttle). Returns the updated user, or null when off duty or throttled.
   */
  setAmbulanceLocation: (id, location, at, notAfter) =>
    User.findOneAndUpdate(
      {
        _id: id,
        role: ROLES.DISPATCHER,
        'ambulance.onDuty': true,
        $or: [{ 'ambulance.locationAt': null }, { 'ambulance.locationAt': { $lte: notAfter } }],
      },
      { $set: { 'ambulance.location': location, 'ambulance.locationAt': at } },
      { returnDocument: 'after' }
    ),
  /** Verified, active, on-duty ambulances whose last position is newer than `since`. */
  findDispatchableAmbulances: (since) =>
    User.find({
      role: ROLES.DISPATCHER,
      isActive: true,
      // Accounts from before verification existed have no field and count as VERIFIED.
      verificationStatus: { $in: [VERIFICATION_STATUS.VERIFIED, null] },
      'ambulance.onDuty': true,
      'ambulance.locationAt': { $gte: since },
    }),
  findHospitalStaff: (hospitalId) => User.find({ hospitalId, isActive: true }),
};
