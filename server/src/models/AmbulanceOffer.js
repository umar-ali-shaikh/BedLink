import mongoose from 'mongoose';
import { OFFER_STATUS, OFFER_STATUS_VALUES } from '../constants/emergency.js';
import { jsonOptions } from './plugins/toJSON.js';

const { ObjectId } = mongoose.Schema.Types;

/** One offer of a booking to one ambulance, with the accept window (ARCHITECTURE.md §6.10). */
const ambulanceOfferSchema = new mongoose.Schema(
  {
    bookingId: { type: ObjectId, ref: 'Booking', required: true, index: true },
    ambulanceId: { type: ObjectId, ref: 'User', required: true, index: true },
    attempt: { type: Number, required: true, min: 1 },
    status: { type: String, enum: OFFER_STATUS_VALUES, default: OFFER_STATUS.PENDING },
    offeredAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
    /** Straight-line position snapshot the ranking used. */
    distanceKm: { type: Number, default: null },
    etaMinutes: { type: Number, default: null },
  },
  { timestamps: true, toJSON: jsonOptions() }
);

ambulanceOfferSchema.index({ status: 1, expiresAt: 1 });
// At most one live offer per booking, and one live offer per ambulance.
ambulanceOfferSchema.index(
  { bookingId: 1 },
  { unique: true, partialFilterExpression: { status: OFFER_STATUS.PENDING }, name: 'one_pending_offer_per_booking' }
);
ambulanceOfferSchema.index(
  { ambulanceId: 1 },
  { unique: true, partialFilterExpression: { status: OFFER_STATUS.PENDING }, name: 'one_pending_offer_per_ambulance' }
);

export const AmbulanceOffer = mongoose.model('AmbulanceOffer', ambulanceOfferSchema);
