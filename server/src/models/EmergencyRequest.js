import mongoose from 'mongoose';
import { BED_TYPE_VALUES, EQUIPMENT_VALUES } from '../constants/bed.js';
import { SPECIALTY_VALUES } from '../constants/hospital.js';
import { DEFAULT_URGENCY, EMERGENCY_STATUS, EMERGENCY_STATUS_VALUES, URGENCY_VALUES } from '../constants/emergency.js';
import { CONFIDENCE, FRESHNESS } from '../constants/matching.js';
import { pointSchema } from './Hospital.js';
import { jsonOptions } from './plugins/toJSON.js';

const { ObjectId } = mongoose.Schema.Types;

const requirementsSchema = new mongoose.Schema(
  {
    bedType: { type: String, enum: BED_TYPE_VALUES, required: true },
    equipment: { type: [{ type: String, enum: EQUIPMENT_VALUES }], default: [] },
    specialties: { type: [{ type: String, enum: SPECIALTY_VALUES }], default: [] },
  },
  { _id: false }
);

/** Snapshot of one ranked hospital (ARCHITECTURE.md §10.6). */
const candidateSchema = new mongoose.Schema(
  {
    hospitalId: { type: ObjectId, ref: 'Hospital', required: true },
    hospitalName: String,
    ownership: String,
    coordinates: { lat: Number, lng: Number },
    rank: Number,
    score: Number,
    confidence: { type: String, enum: Object.values(CONFIDENCE) },
    confidenceReasons: [String],
    etaMinutes: Number,
    distanceKm: Number,
    matchingBeds: Number,
    freshness: { type: String, enum: Object.values(FRESHNESS) },
    freshnessAgeSeconds: Number,
    currentLoad: Number,
    breakdown: { resource: Number, travel: Number, freshness: Number, load: Number },
    reasons: [String],
  },
  { _id: false }
);

const exclusionSchema = new mongoose.Schema(
  {
    hospitalId: { type: ObjectId, ref: 'Hospital', required: true },
    hospitalName: String,
    coordinates: { lat: Number, lng: Number },
    reasons: [String],
    messages: [String],
  },
  { _id: false }
);

const emergencySchema = new mongoose.Schema(
  {
    dispatcherId: { type: ObjectId, ref: 'User', required: true, index: true },
    demoPatientId: { type: String, required: true },
    patientLocation: { type: pointSchema, required: true },
    requirements: { type: requirementsSchema, required: true },
    urgency: { type: String, enum: URGENCY_VALUES, default: DEFAULT_URGENCY },
    status: { type: String, enum: EMERGENCY_STATUS_VALUES, default: EMERGENCY_STATUS.SEARCHING },
    currentHospital: { type: ObjectId, ref: 'Hospital', default: null },
    currentHospitalRequestId: { type: ObjectId, ref: 'HospitalRequest', default: null },
    contactedHospitalIds: { type: [{ type: ObjectId, ref: 'Hospital' }], default: [] },
    candidates: { type: [candidateSchema], default: [] },
    exclusions: { type: [exclusionSchema], default: [] },
    matchingDurationMs: { type: Number, default: null },
    reservationId: { type: ObjectId, ref: 'Reservation', default: null },
    /** Set when the emergency was raised from a public booking. */
    bookingId: { type: ObjectId, ref: 'Booking', default: null },
  },
  { timestamps: true, toJSON: jsonOptions({ patientLocation: 'patientLocation' }) }
);

emergencySchema.index({ status: 1, createdAt: -1 });
emergencySchema.index({ contactedHospitalIds: 1 });

export const EmergencyRequest = mongoose.model('EmergencyRequest', emergencySchema);
