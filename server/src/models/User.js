import mongoose from 'mongoose';
import { AMBULANCE_TYPE_VALUES } from '../constants/ambulance.js';
import { VERIFICATION_STATUS, VERIFICATION_STATUS_VALUES } from '../constants/hospital.js';
import { ROLES, ROLE_VALUES } from '../constants/roles.js';
import { jsonOptions } from './plugins/toJSON.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, required: true },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
      validate: {
        // required iff role = HOSPITAL (ARCHITECTURE.md §6.1)
        validator(value) {
          return this.role === ROLES.HOSPITAL ? value != null : value == null;
        },
        message: 'hospitalId is required for HOSPITAL users and must be empty otherwise',
      },
    },
    isActive: { type: Boolean, default: true },
    googleId: { type: String, default: undefined },
    phone: { type: String, trim: true, default: '' },
    /** Self-registered ambulances start PENDING; seeded/admin-created accounts are VERIFIED. */
    verificationStatus: { type: String, enum: VERIFICATION_STATUS_VALUES, default: VERIFICATION_STATUS.VERIFIED },
    verificationNote: { type: String, trim: true, default: '' },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Ambulance crew (role DISPATCHER) registration details. */
    ambulance: {
      type: new mongoose.Schema(
        {
          vehicleNumber: { type: String, trim: true, uppercase: true, required: true },
          ambulanceType: { type: String, enum: AMBULANCE_TYPE_VALUES, required: true },
          organization: { type: String, trim: true, default: '' },
          /** The person driving (may differ from the account holder). Older accounts have none. */
          driverName: { type: String, trim: true, default: undefined },
          licenceNumber: { type: String, trim: true, uppercase: true, default: undefined },
          /** Public bookings go only to verified, on-duty ambulances with a recent position. */
          onDuty: { type: Boolean, default: false },
          location: { type: new mongoose.Schema({ lat: Number, lng: Number }, { _id: false }), default: undefined },
          locationAt: { type: Date, default: null },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { timestamps: true, toJSON: jsonOptions() }
);

userSchema.index(
  { 'ambulance.vehicleNumber': 1 },
  {
    unique: true,
    partialFilterExpression: { 'ambulance.vehicleNumber': { $type: 'string' } },
    name: 'unique_ambulance_vehicle',
  }
);

userSchema.index(
  { 'ambulance.licenceNumber': 1 },
  {
    unique: true,
    partialFilterExpression: { 'ambulance.licenceNumber': { $type: 'string' } },
    name: 'unique_ambulance_licence',
  }
);
userSchema.index({ role: 1, verificationStatus: 1 });
userSchema.index({ role: 1, 'ambulance.onDuty': 1, 'ambulance.locationAt': -1 });
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } }, name: 'unique_google_id' }
);

export const User = mongoose.model('User', userSchema);
