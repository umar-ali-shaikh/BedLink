import mongoose from 'mongoose';
import {
  DEFAULT_HOSPITAL_LOAD,
  HOSPITAL_STATUS,
  HOSPITAL_STATUS_VALUES,
  SPECIALTY_VALUES,
  VERIFICATION_STATUS,
  VERIFICATION_STATUS_VALUES,
} from '../constants/hospital.js';
import { jsonOptions } from './plugins/toJSON.js';

export const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      validate: {
        validator: (c) => c.length === 2 && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90,
        message: 'coordinates must be [lng, lat]',
      },
    },
  },
  { _id: false }
);

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: '' },
    location: { type: pointSchema, required: true },
    specialties: { type: [{ type: String, enum: SPECIALTY_VALUES }], default: [] },
    currentLoad: { type: Number, min: 0, max: 100, default: DEFAULT_HOSPITAL_LOAD },
    status: { type: String, enum: HOSPITAL_STATUS_VALUES, default: HOSPITAL_STATUS.ACTIVE },
    lastAvailabilityUpdate: { type: Date, default: null },

    // Registration & verification (self-registered hospitals start PENDING).
    registrationNumber: { type: String, trim: true, uppercase: true, default: undefined },
    hfrId: { type: String, trim: true, uppercase: true, default: undefined },
    contactName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUS_VALUES,
      default: VERIFICATION_STATUS.VERIFIED,
    },
    verificationNote: { type: String, trim: true, default: '' },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: jsonOptions({ location: 'coordinates' }) }
);

hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ status: 1 });
hospitalSchema.index({ verificationStatus: 1 });
hospitalSchema.index(
  { registrationNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { registrationNumber: { $type: 'string' } },
    name: 'unique_registration_number',
  }
);
hospitalSchema.index(
  { hfrId: 1 },
  { unique: true, partialFilterExpression: { hfrId: { $type: 'string' } }, name: 'unique_hfr_id' }
);

export const Hospital = mongoose.model('Hospital', hospitalSchema);
