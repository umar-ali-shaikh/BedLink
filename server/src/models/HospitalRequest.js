import mongoose from 'mongoose';
import { OFFER_STATUS, OFFER_STATUS_VALUES, REJECT_REASON_VALUES } from '../constants/emergency.js';
import { CONFIDENCE } from '../constants/matching.js';
import { jsonOptions } from './plugins/toJSON.js';

const { ObjectId } = mongoose.Schema.Types;

/** One offer of an emergency to one hospital, with the 2-minute window (ARCHITECTURE.md §6.5). */
const hospitalRequestSchema = new mongoose.Schema(
  {
    emergencyId: { type: ObjectId, ref: 'EmergencyRequest', required: true, index: true },
    hospitalId: { type: ObjectId, ref: 'Hospital', required: true, index: true },
    attempt: { type: Number, required: true, min: 1 },
    status: { type: String, enum: OFFER_STATUS_VALUES, default: OFFER_STATUS.PENDING },
    offeredAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
    respondedBy: { type: ObjectId, ref: 'User', default: null },
    rejectReason: { type: String, enum: [...REJECT_REASON_VALUES, null], default: null },
    matchSnapshot: {
      score: Number,
      etaMinutes: Number,
      distanceKm: Number,
      confidence: { type: String, enum: Object.values(CONFIDENCE) },
    },
  },
  { timestamps: true, toJSON: jsonOptions() }
);

hospitalRequestSchema.index({ status: 1, expiresAt: 1 });
hospitalRequestSchema.index({ hospitalId: 1, status: 1, respondedAt: -1 });
// At most one live offer per emergency.
hospitalRequestSchema.index(
  { emergencyId: 1 },
  { unique: true, partialFilterExpression: { status: OFFER_STATUS.PENDING }, name: 'one_pending_offer_per_emergency' }
);

export const HospitalRequest = mongoose.model('HospitalRequest', hospitalRequestSchema);
